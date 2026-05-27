"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/components/app-state";
import { Button, Card, PageHeader } from "@/components/ui";
import { DAYS, POSITION_LABELS, POSITIONS, SHIFT_LABELS } from "@/lib/constants";
import { downloadSchedulePdf } from "@/lib/pdf-export";
import { generateWeeklySchedule } from "@/lib/schedule-generator";
import { validateBeforeGenerate } from "@/lib/schedule-validation";
import { formatHours, shiftDurationHours } from "@/lib/time";
import type { DayKey, Position, ScheduleAssignment, ShiftType } from "@/types";

const UNCOVERED_ID = "__uncovered__";

export default function SchedulePage() {
  const { employees, venue, schedule, history, weekStart, setWeekStart, replaceSchedule, saveScheduleToHistory, loadScheduleFromHistory } = useAppState();
  const [editing, setEditing] = useState<ScheduleAssignment | null>(null);
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  function handleGenerateSchedule() {
    const issues = validateBeforeGenerate(venue, employees);
    setValidationIssues(issues);
    if (issues.length) return;
    const generated = generateWeeklySchedule(employees, venue);
    replaceSchedule(generated);
    saveScheduleToHistory(generated);
    downloadSchedulePdf(generated, employees, weekStart, venue.name);
    setReviewOpen(true);
  }

  const rows = useMemo(() => {
    const base = employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      position: employee.primaryPosition,
      employeeId: employee.id
    }));
    if (schedule.assignments.some((assignment) => assignment.uncovered)) {
      base.push({ id: UNCOVERED_ID, name: "Sin cubrir", position: "sala" as Position, employeeId: UNCOVERED_ID });
    }
    return base;
  }, [employees, schedule.assignments]);

  const assignmentsByRowDay = useMemo(() => {
    const map = new Map<string, ScheduleAssignment[]>();
    for (const assignment of schedule.assignments) {
      const rowId = assignment.uncovered ? UNCOVERED_ID : assignment.employeeId;
      const key = `${rowId}-${assignment.day}`;
      map.set(key, [...(map.get(key) ?? []), assignment]);
    }
    return map;
  }, [schedule.assignments]);

  function saveAssignment(next: ScheduleAssignment) {
    const assignments = schedule.assignments.map((assignment) =>
      assignment.id === next.id ? next : assignment
    );
    replaceSchedule(rebuild(assignments));
    setEditing(null);
  }

  function deleteAssignment(id: string) {
    replaceSchedule(rebuild(schedule.assignments.filter((assignment) => assignment.id !== id)));
    setEditing(null);
  }

  function duplicateAssignment(assignment: ScheduleAssignment) {
    replaceSchedule(
      rebuild([
        ...schedule.assignments,
        { ...assignment, id: `manual-${Date.now()}` }
      ])
    );
    setEditing(null);
  }

  function addManual(day: DayKey) {
    const shift = venue.shifts.find(
      (item) => item.day === day && item.enabled !== false && !venue.days[item.day].closed
    );
    const start = shift?.start ?? "12:00";
    const end = shift?.end ?? "16:00";
    const position = shift?.positions[0] ?? "sala";
    const employee = employees.find((item) => item.status !== "inactive");
    const assignment: ScheduleAssignment = {
      id: `manual-${Date.now()}`,
      employeeId: employee?.id ?? UNCOVERED_ID,
      employeeName: employee?.name ?? "Sin cubrir",
      day,
      shiftId: shift?.id ?? `manual-${day}`,
      shiftType: shift?.type ?? "comida",
      label: shift?.label ?? "Manual",
      start,
      end,
      position,
      hours: shiftDurationHours(start, end),
      uncovered: !employee,
      explanation: "Turno anadido manualmente."
    };
    replaceSchedule(rebuild([...schedule.assignments, assignment]));
    setEditing(assignment);
  }

  function markUncovered(assignment: ScheduleAssignment) {
    saveAssignment({
      ...assignment,
      employeeId: `uncovered-${assignment.id}`,
      employeeName: "Sin cubrir",
      uncovered: true
    });
  }

  function rebuild(assignments: ScheduleAssignment[]) {
    return {
      ...schedule,
      assignments,
      employeeHours: employees.map((employee) => ({
        employeeId: employee.id,
        employeeName: employee.name,
        contractedHours: employee.contractedWeeklyHours,
        assignedHours: assignments
          .filter((assignment) => assignment.employeeId === employee.id && !assignment.uncovered)
          .reduce((total, assignment) => total + assignment.hours, 0)
      })),
      conflicts: assignments
        .filter((assignment) => assignment.uncovered)
        .map((assignment) => ({
          id: `conflict-${assignment.id}`,
          day: assignment.day,
          shiftId: assignment.shiftId,
          shiftLabel: assignment.label,
          position: assignment.position,
          missingWorkers: 1,
          reason: "Turno sin cubrir",
          severity: "media" as const
        }))
    };
  }

  return (
    <>
      <PageHeader
        title="Cuadrante visual"
        description={`Semana del ${new Date(weekStart).toLocaleDateString("es-ES")}. Genera, revisa y ajusta antes de enviarlo.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerateSchedule}>Generar horario y PDF</Button>
            <Button variant="secondary" onClick={() => setShowWhatsapp((value) => !value)}>Preparar WhatsApp</Button>
          </div>
        }
      />

      <Card className="mb-5 p-4">
        <label className="text-sm font-black text-deep">
          Semana del horario
          <input
            type="date"
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-ink"
          />
        </label>
      </Card>

      {reviewOpen && (
        <Card className="mb-5 border-cyanx/30 bg-cyanx/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-ink">Horario generado</h2>
              <p className="text-sm text-deep/70">
                Se ha descargado el PDF. Puedes aceptar, regenerar o hacer cambios tocando cualquier turno. Tambien puedes pedir cambios al asistente desde la pantalla principal.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setReviewOpen(false)}>Seguir con este</Button>
              <Button variant="secondary" onClick={handleGenerateSchedule}>Regenerar</Button>
              <Button onClick={() => setShowWhatsapp(true)}>Preparar WhatsApp</Button>
              <Button variant="secondary" onClick={() => downloadSchedulePdf(schedule, employees, weekStart, venue.name)}>Descargar PDF otra vez</Button>
            </div>
          </div>
        </Card>
      )}

      {validationIssues.length > 0 && (
        <Card className="mb-5 border-red-200 bg-red-50 p-4">
          <h2 className="text-lg font-black text-red-800">Antes de generar falta esto</h2>
          <div className="mt-2 grid gap-2">
            {validationIssues.map((issue) => (
              <div key={issue} className="text-sm font-bold text-red-800">{issue}</div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-deep text-white">
              <tr>
                <th className="sticky left-0 z-10 bg-deep px-4 py-3">Trabajador</th>
                {DAYS.map((day) => (
                  <th key={day.key} className="px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      {day.short}
                      <button className="rounded bg-white/15 px-2 py-1 text-xs" onClick={() => addManual(day.key)}>+</button>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const hours = schedule.employeeHours.find((item) => item.employeeId === row.employeeId);
                return (
                  <tr key={row.id} className="border-b border-slate-200 bg-white align-top">
                    <td className="sticky left-0 z-10 bg-white px-4 py-4">
                      <div className="font-black text-ink">{row.name}</div>
                      <div className="text-xs text-deep/60">{POSITION_LABELS[row.position]}</div>
                    </td>
                    {DAYS.map((day) => {
                      const assignments = assignmentsByRowDay.get(`${row.id}-${day.key}`) ?? [];
                      return (
                        <td key={day.key} className="min-w-36 px-2 py-3">
                          {assignments.length === 0 ? (
                            <span className="text-deep/30">Libre</span>
                          ) : (
                            <div className="space-y-2">
                              {assignments.map((assignment) => (
                                <button
                                  key={assignment.id}
                                  onClick={() => setEditing(assignment)}
                                  className={`w-full rounded-lg border p-2 text-left ${
                                    assignment.uncovered
                                      ? "border-red-300 bg-red-50"
                                      : "border-cyanx/30 bg-cyanx/10"
                                  }`}
                                >
                                  <div className="font-bold text-ink">{assignment.label}</div>
                                  <div className="text-xs font-black text-deep">{assignment.employeeName}</div>
                                  <div className="text-xs text-deep/70">{assignment.start} - {assignment.end}</div>
                                  <div className="text-xs font-bold text-electric">{POSITION_LABELS[assignment.position]}</div>
                                  {assignment.explanation && (
                                    <div className="mt-1 text-[11px] text-deep/55">{assignment.explanation}</div>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 font-black text-ink">
                      {row.id === UNCOVERED_ID ? "-" : `${formatHours(hours?.assignedHours ?? 0)}h`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Warnings />
        {showWhatsapp && <WhatsappPanel />}
      </div>

      {history.length > 0 && (
        <Card className="mt-5 p-5">
          <h2 className="text-xl font-black text-ink">Historial</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  loadScheduleFromHistory(item.id);
                  setWeekStart(item.weekStart);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-deep hover:border-cyanx"
              >
                {item.label}
                <span className="block text-xs font-normal text-deep/55">
                  Semana: {new Date(item.weekStart).toLocaleDateString("es-ES")} · Guardado: {new Date(item.createdAt).toLocaleString("es-ES")}
                </span>
                <span className="mt-1 block text-xs font-black text-electric">Reutilizar como base</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {editing && (
        <EditTurn
          assignment={editing}
          employees={employees}
          onClose={() => setEditing(null)}
          onSave={saveAssignment}
          onDelete={deleteAssignment}
          onDuplicate={duplicateAssignment}
          onUncovered={markUncovered}
        />
      )}
    </>
  );
}

function Warnings() {
  const { employees, schedule } = useAppState();
  const warnings = [
    ...schedule.conflicts.map((conflict) => `${conflict.shiftLabel}: falta cubrir ${POSITION_LABELS[conflict.position]}`),
    ...schedule.employeeHours
      .filter((item) => item.assignedHours > item.contractedHours)
      .map((item) => `${item.employeeName} supera horas objetivo`)
  ];

  return (
    <Card className="p-5">
      <h2 className="text-xl font-black text-ink">Avisos simples</h2>
      <div className="mt-4 space-y-2">
        {warnings.length === 0 ? (
          <div className="rounded-lg bg-cyanx/12 p-3 text-sm font-bold text-deep">Sin avisos.</div>
        ) : (
          warnings.map((warning) => (
            <div key={warning} className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-800">{warning}</div>
          ))
        )}
      </div>
      <div className="mt-3 text-xs text-deep/50">Plantilla activa: {employees.filter((employee) => employee.status !== "inactive").length}</div>
    </Card>
  );
}

function EditTurn({
  assignment,
  employees,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  onUncovered
}: {
  assignment: ScheduleAssignment;
  employees: ReturnType<typeof useAppState>["employees"];
  onClose: () => void;
  onSave: (assignment: ScheduleAssignment) => void;
  onDelete: (id: string) => void;
  onDuplicate: (assignment: ScheduleAssignment) => void;
  onUncovered: (assignment: ScheduleAssignment) => void;
}) {
  const [draft, setDraft] = useState(assignment);

  function assignEmployee(employeeId: string) {
    const employee = employees.find((item) => item.id === employeeId);
    setDraft({
      ...draft,
      employeeId: employee?.id ?? draft.employeeId,
      employeeName: employee?.name ?? draft.employeeName,
      uncovered: false
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black text-ink">Editar turno</h2>
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-bold text-deep/70">
            Trabajador
            <select value={draft.uncovered ? UNCOVERED_ID : draft.employeeId} onChange={(event) => event.target.value === UNCOVERED_ID ? onUncovered(draft) : assignEmployee(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-ink">
              <option value={UNCOVERED_ID}>Sin cubrir</option>
              {employees.filter((employee) => employee.status !== "inactive").map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-deep/70">
            Nombre del turno
            <input
              value={draft.label}
              onChange={(event) => setDraft({ ...draft, label: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-ink"
              placeholder="Comida, cena, preparacion..."
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <TimeField label="Inicio" value={draft.start} onChange={(start) => setDraft({ ...draft, start, hours: shiftDurationHours(start, draft.end) })} />
            <TimeField label="Fin" value={draft.end} onChange={(end) => setDraft({ ...draft, end, hours: shiftDurationHours(draft.start, end) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold text-deep/70">
              Puesto
              <select value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value as Position })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-ink">
                {POSITIONS.map((position) => (
                  <option key={position} value={position}>{POSITION_LABELS[position]}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold text-deep/70">
              Tipo
              <select value={draft.shiftType} onChange={(event) => setDraft({ ...draft, shiftType: event.target.value as ShiftType, label: SHIFT_LABELS[event.target.value as ShiftType] })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-ink">
                {(["comida", "cena", "tarde", "largo8h"] as ShiftType[]).map((type) => (
                  <option key={type} value={type}>{SHIFT_LABELS[type]}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="danger" onClick={() => onDelete(draft.id)}>Borrar</Button>
          <Button variant="secondary" onClick={() => onDuplicate(draft)}>Duplicar</Button>
          <Button variant="secondary" onClick={() => onUncovered(draft)}>Sin cubrir</Button>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(draft)}>Guardar</Button>
        </div>
      </div>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-bold text-deep/70">
      {label}
      <input type="time" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-ink" />
    </label>
  );
}

function WhatsappPanel() {
  const { employees, schedule } = useAppState();
  return (
    <Card className="p-5">
      <h2 className="text-xl font-black text-ink">WhatsApp</h2>
      <div className="mt-4 space-y-3">
        {employees.filter((employee) => employee.status !== "inactive").map((employee) => {
          const text = buildWhatsappMessage(employee.name, employee.id, schedule.assignments);
          const href = employee.phone ? `https://wa.me/${employee.phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
          return (
            <div key={employee.id} className="rounded-lg border border-slate-200 p-3">
              <div className="font-black text-ink">{employee.name}</div>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-snow p-2 text-xs text-deep">{text}</pre>
              <a className="mt-2 inline-block rounded-lg bg-electric px-3 py-2 text-sm font-bold text-white" href={href} target="_blank" rel="noreferrer">Enviar WhatsApp</a>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function buildWhatsappMessage(employeeName: string, employeeId: string, assignments: ScheduleAssignment[]) {
  const employeeAssignments = assignments.filter((assignment) => assignment.employeeId === employeeId);
  const lines = DAYS.map((day) => {
    const dayAssignments = employeeAssignments.filter((assignment) => assignment.day === day.key);
    if (!dayAssignments.length) return `${day.label}: Libre`;
    return `${day.label}: ${dayAssignments.map((assignment) => `${assignment.start} - ${assignment.end} · ${POSITION_LABELS[assignment.position]} · ${assignment.label}`).join(" / ")}`;
  });
  const total = employeeAssignments.reduce((sum, assignment) => sum + assignment.hours, 0);
  return `Hola ${employeeName.split(" ")[0]}, este es tu horario de la semana:\n\n${lines.join("\n")}\n\nTotal semanal: ${formatHours(total)} horas.\n\nSi ves algun problema, responde a este WhatsApp y lo revisamos.`;
}
