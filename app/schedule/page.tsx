"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/components/app-state";
import { Button, Card, PageHeader } from "@/components/ui";
import { DAY_LABELS, DAYS, POSITION_LABELS } from "@/lib/constants";
import { formatHours, shiftDurationHours } from "@/lib/time";
import type { DayKey, Position, ScheduleAssignment } from "@/types";

const positions: Position[] = ["sala", "cocina"];

export default function SchedulePage() {
  const {
    employees,
    schedule,
    generateSchedule,
    clearSchedule,
    updateAssignment
  } = useAppState();
  const [editing, setEditing] = useState<ScheduleAssignment | null>(null);
  const [showWhatsapp, setShowWhatsapp] = useState(false);

  const assignmentsByEmployeeDay = useMemo(() => {
    const map = new Map<string, ScheduleAssignment[]>();
    for (const assignment of schedule.assignments) {
      const key = `${assignment.employeeId}-${assignment.day}`;
      map.set(key, [...(map.get(key) ?? []), assignment]);
    }
    return map;
  }, [schedule.assignments]);

  return (
    <>
      <PageHeader
        title="Cuadrante semanal"
        description="Tabla operativa por trabajador y día, con horas totales, conflictos y mensajes individuales para WhatsApp."
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={generateSchedule}>Regenerar horario</Button>
            <Button variant="secondary" onClick={() => setShowWhatsapp((value) => !value)}>
              Preparar WhatsApp
            </Button>
            <Button variant="danger" onClick={clearSchedule}>Limpiar horario</Button>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-deep text-white">
              <tr>
                <th className="sticky left-0 z-10 bg-deep px-4 py-3">Trabajador</th>
                {DAYS.map((day) => (
                  <th key={day.key} className="px-4 py-3">{day.short}</th>
                ))}
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const hours = schedule.employeeHours.find(
                  (item) => item.employeeId === employee.id
                );
                return (
                  <tr key={employee.id} className="border-b border-slate-200 bg-white align-top">
                    <td className="sticky left-0 z-10 bg-white px-4 py-4">
                      <div className="font-black text-ink">{employee.name}</div>
                      <div className="text-xs text-deep/60">{POSITION_LABELS[employee.primaryPosition]}</div>
                    </td>
                    {DAYS.map((day) => {
                      const assignments = assignmentsByEmployeeDay.get(`${employee.id}-${day.key}`) ?? [];
                      return (
                        <td key={day.key} className="min-w-32 px-3 py-3">
                          {assignments.length === 0 ? (
                            <span className="text-deep/35">Libre</span>
                          ) : (
                            <div className="space-y-2">
                              {assignments.map((assignment) => (
                                <button
                                  key={assignment.id}
                                  onClick={() => setEditing(assignment)}
                                  className="w-full rounded-lg border border-cyanx/30 bg-cyanx/10 p-2 text-left transition hover:border-electric"
                                >
                                  <div className="font-bold text-ink">{assignment.label}</div>
                                  <div className="text-xs text-deep/70">
                                    {assignment.start} - {assignment.end}
                                  </div>
                                  <div className="text-xs font-bold text-electric">
                                    {POSITION_LABELS[assignment.position]}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 font-black text-ink">
                      {formatHours(hours?.assignedHours ?? 0)}h
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="p-5">
          <h2 className="text-xl font-black text-ink">Conflictos</h2>
          <div className="mt-4 space-y-3">
            {schedule.conflicts.length === 0 ? (
              <div className="rounded-lg bg-cyanx/12 p-4 text-sm font-semibold text-deep">
                No hay conflictos pendientes.
              </div>
            ) : (
              schedule.conflicts.map((conflict) => (
                <div key={conflict.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="font-bold text-red-800">
                    {DAY_LABELS[conflict.day]} · {conflict.shiftLabel}
                  </div>
                  <div className="text-sm text-red-700">
                    {POSITION_LABELS[conflict.position]} sin cubrir.
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {showWhatsapp && <WhatsappPanel />}
      </div>

      {editing && (
        <EditAssignmentModal
          assignment={editing}
          onClose={() => setEditing(null)}
          onSave={(assignment) => {
            updateAssignment(assignment);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function EditAssignmentModal({
  assignment,
  onClose,
  onSave
}: {
  assignment: ScheduleAssignment;
  onClose: () => void;
  onSave: (assignment: ScheduleAssignment) => void;
}) {
  const [draft, setDraft] = useState(assignment);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black text-ink">Editar turno</h2>
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-bold text-deep/70">
            Día
            <select
              value={draft.day}
              onChange={(event) => setDraft({ ...draft, day: event.target.value as DayKey })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {DAYS.map((day) => (
                <option key={day.key} value={day.key}>{day.label}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold text-deep/70">
              Inicio
              <input
                type="time"
                value={draft.start}
                onChange={(event) => {
                  const start = event.target.value;
                  setDraft({ ...draft, start, hours: shiftDurationHours(start, draft.end) });
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-bold text-deep/70">
              Fin
              <input
                type="time"
                value={draft.end}
                onChange={(event) => {
                  const end = event.target.value;
                  setDraft({ ...draft, end, hours: shiftDurationHours(draft.start, end) });
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
          <label className="text-sm font-bold text-deep/70">
            Puesto
            <select
              value={draft.position}
              onChange={(event) => setDraft({ ...draft, position: event.target.value as Position })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {positions.map((position) => (
                <option key={position} value={position}>{POSITION_LABELS[position]}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(draft)}>Guardar</Button>
        </div>
      </div>
    </div>
  );
}

function WhatsappPanel() {
  const { employees, schedule } = useAppState();

  return (
    <Card className="p-5">
      <h2 className="text-xl font-black text-ink">WhatsApp individual</h2>
      <p className="mt-1 text-sm text-deep/65">
        Se prepara un mensaje por trabajador con enlace wa.me. No usa todavía la API oficial.
      </p>
      <div className="mt-4 space-y-4">
        {employees.map((employee) => {
          const message = buildWhatsappMessage(employee.name, employee.id, schedule.assignments);
          const encodedMessage = encodeURIComponent(message.text);
          const link = `https://wa.me/${employee.phone}?text=${encodedMessage}`;
          return (
            <div key={employee.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-black text-ink">{employee.name}</div>
                  <div className="text-sm text-deep/60">{employee.phone}</div>
                </div>
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-electric px-4 py-2 text-center text-sm font-bold text-white transition hover:bg-[#0057d1]"
                >
                  Enviar WhatsApp
                </a>
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-snow p-3 text-sm text-deep">
                {message.text}
              </pre>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function buildWhatsappMessage(employeeName: string, employeeId: string, assignments: ScheduleAssignment[]) {
  const employeeAssignments = assignments.filter(
    (assignment) => assignment.employeeId === employeeId
  );
  const lines = DAYS.map((day) => {
    const dayAssignments = employeeAssignments.filter(
      (assignment) => assignment.day === day.key
    );

    if (dayAssignments.length === 0) {
      return `${day.label}: Libre`;
    }

    return `${day.label}: ${dayAssignments
      .map(
        (assignment) =>
          `${assignment.start} - ${assignment.end} · ${POSITION_LABELS[assignment.position]}`
      )
      .join(" / ")}`;
  });
  const total = employeeAssignments.reduce((sum, assignment) => sum + assignment.hours, 0);

  return {
    text: `Hola ${employeeName.split(" ")[0]}, este es tu horario de la semana:\n\n${lines.join("\n")}\n\nTotal semanal: ${formatHours(total)} horas.`
  };
}
