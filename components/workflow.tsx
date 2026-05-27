"use client";

import { useState } from "react";
import { Button, Card, PageHeader } from "@/components/ui";
import { useAppState } from "@/components/app-state";
import { ChatAssistant } from "@/components/chat-assistant";
import { DAYS, POSITION_LABELS } from "@/lib/constants";
import { downloadSchedulePdf } from "@/lib/pdf-export";
import { generateWeeklySchedule } from "@/lib/schedule-generator";
import { validateBeforeGenerate } from "@/lib/schedule-validation";
import { formatHours } from "@/lib/time";
import Link from "next/link";

type WorkflowStep = "bar" | "team" | "schedule" | "send";

const steps: Array<{ key: WorkflowStep; label: string; href: string }> = [
  { key: "bar", label: "1. Bar", href: "/settings" },
  { key: "team", label: "2. Plantilla", href: "/employees" },
  { key: "schedule", label: "3. Cuadrante", href: "/schedule" },
  { key: "send", label: "4. WhatsApp", href: "/schedule" }
];

export function Workflow() {
  const [step, setStep] = useState<WorkflowStep>("bar");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const {
    venue,
    employees,
    schedule,
    history,
    weekStart,
    setWeekStart,
    replaceSchedule,
    saveScheduleToHistory,
    loadScheduleFromHistory,
    resetWorkspace,
    loadFullDemo
  } = useAppState();

  const activeEmployees = employees.filter((employee) => employee.status !== "inactive");
  const openDays = DAYS.filter((day) => !venue.days[day.key].closed);
  const uncovered = schedule.assignments.filter((assignment) => assignment.uncovered).length;

  function handleGenerateSchedule() {
    const issues = validateBeforeGenerate(venue, employees);
    setValidationIssues(issues);
    if (issues.length) {
      setStep("bar");
      return;
    }
    const generated = generateWeeklySchedule(employees, venue);
    replaceSchedule(generated);
    saveScheduleToHistory(generated);
    downloadSchedulePdf(generated, employees, weekStart);
    setStep("schedule");
    setReviewOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Crear horario semanal"
        description={`Horario para la semana del ${new Date(weekStart).toLocaleDateString("es-ES")}. Configura, genera, revisa y envia.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerateSchedule}>Generar horario y PDF</Button>
            <Button variant="secondary" onClick={() => {
              if (window.confirm("Cargar demo completo sustituira los datos actuales. ¿Continuar?")) {
                loadFullDemo();
                setValidationIssues([]);
                setReviewOpen(false);
                setStep("bar");
              }
            }}>
              Cargar demo completo
            </Button>
            <Button variant="secondary" onClick={() => {
              if (window.confirm("Esto borra bar, plantilla, horarios e historial local. ¿Empezar de cero?")) {
                resetWorkspace();
                setValidationIssues([]);
                setReviewOpen(false);
                setStep("bar");
              }
            }}>
              Empezar de cero
            </Button>
          </div>
        }
      />

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <label className="text-sm font-black text-deep">
            Semana del horario
            <input
              type="date"
              value={weekStart}
              onChange={(event) => setWeekStart(event.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-ink"
            />
          </label>
          <div className="text-sm text-deep/65">
            El historial se guarda por semana para reutilizar horarios anteriores como base.
          </div>
        </div>
      </Card>

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

      {reviewOpen && (
        <ReviewPanel
          onAccept={() => setReviewOpen(false)}
          onRegenerate={handleGenerateSchedule}
          onSend={() => setStep("send")}
        />
      )}

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <MiniStat label="Bar" value={venue.name || "Sin nombre"} detail={`${openDays.length} dias abiertos`} />
        <MiniStat label="Plantilla" value={activeEmployees.length} detail="trabajadores activos" />
        <MiniStat label="Turnos" value={schedule.assignments.length} detail="asignaciones" />
        <MiniStat label="Avisos" value={uncovered} detail="sin cubrir" />
      </div>

      <Card className="mb-5 p-2">
        <div className="grid gap-2 sm:grid-cols-4">
          {steps.map((item) => (
            <button
              key={item.key}
              onClick={() => setStep(item.key)}
              className={`rounded-lg px-3 py-3 text-sm font-black ${
                step === item.key
                  ? "bg-electric text-white"
                  : "bg-snow text-deep hover:bg-cyanx/20"
              }`}
            >
          {item.label}
        </button>
      ))}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          {step === "bar" && <BarStep onNext={() => setStep("team")} />}
          {step === "team" && <TeamStep onNext={() => setStep("schedule")} />}
          {step === "schedule" && <ScheduleStep onNext={() => setStep("send")} />}
          {step === "send" && <SendStep />}
          {history.length > 0 && (
            <Card className="mt-5 p-5">
              <h2 className="text-xl font-black text-ink">Historial de horarios</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      loadScheduleFromHistory(item.id);
                      setWeekStart(item.weekStart);
                      setStep("schedule");
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
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <ChatAssistant compact />
        </div>
      </div>
    </>
  );
}

function MiniStat({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <Card className="p-4">
      <div className="text-sm font-semibold text-deep/60">{label}</div>
      <div className="mt-2 truncate text-2xl font-black text-ink">{value}</div>
      <div className="mt-1 text-sm text-deep/60">{detail}</div>
    </Card>
  );
}

function ReviewPanel({
  onAccept,
  onRegenerate,
  onSend
}: {
  onAccept: () => void;
  onRegenerate: () => void;
  onSend: () => void;
}) {
  const { schedule } = useAppState();
  const totalHours = schedule.employeeHours.reduce((sum, item) => sum + item.assignedHours, 0);
  const uncovered = schedule.assignments.filter((assignment) => assignment.uncovered).length;
  const overTarget = schedule.employeeHours.filter((item) => item.assignedHours > item.contractedHours).length;

  return (
    <Card className="mb-5 overflow-hidden border-cyanx/30">
      <div className="bg-ink px-5 py-4 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black">Revision del horario</h2>
            <p className="mt-1 text-sm text-snow/70">
              PDF descargado. Acepta, regenera o pide cambios al asistente sin rehacer todo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onAccept}>Aceptar horario</Button>
            <Button variant="secondary" onClick={onRegenerate}>Regenerar</Button>
            <Button variant="secondary" onClick={onSend}>WhatsApp</Button>
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-4">
        <MiniStat label="Turnos" value={schedule.assignments.length} detail="asignaciones generadas" />
        <MiniStat label="Horas" value={`${formatHours(totalHours)}h`} detail="total semana" />
        <MiniStat label="Sin cubrir" value={uncovered} detail="requieren ajuste" />
        <MiniStat label="Sobre objetivo" value={overTarget} detail="trabajadores" />
      </div>
      <div className="border-t border-slate-200 px-5 py-4">
        <div className="grid gap-2 md:grid-cols-3">
          {schedule.employeeHours.slice(0, 6).map((item) => (
            <div key={item.employeeId} className="rounded-lg bg-snow px-3 py-2 text-sm">
              <span className="font-black text-ink">{item.employeeName}</span>
              <span className="ml-2 text-deep/60">{formatHours(item.assignedHours)}h / {item.contractedHours}h</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function BarStep({ onNext }: { onNext: () => void }) {
  const { venue } = useAppState();
  return (
    <Card className="p-5">
      <h2 className="text-xl font-black text-ink">Bar</h2>
      <p className="mt-1 text-sm text-deep/65">
        Configura horarios por dia con botones rapidos.
      </p>
      <div className="mt-4 grid gap-2 md:grid-cols-7">
        {DAYS.map((day) => {
          const open = !venue.days[day.key].closed;
          const shifts = venue.shifts.filter((shift) => shift.day === day.key && shift.enabled !== false);
          return (
            <div key={day.key} className="rounded-lg bg-snow p-3">
              <div className="font-black text-ink">{day.short}</div>
              <div className="mt-1 text-xs text-deep/60">{open ? `${shifts.length} franjas` : "Cerrado"}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/settings"><Button variant="secondary">Editar bar</Button></Link>
        <Button onClick={onNext}>Siguiente: plantilla</Button>
      </div>
    </Card>
  );
}

function TeamStep({ onNext }: { onNext: () => void }) {
  const { employees } = useAppState();
  return (
    <Card className="p-5">
      <h2 className="text-xl font-black text-ink">Plantilla</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {employees.slice(0, 6).map((employee) => (
          <div key={employee.id} className="rounded-lg bg-snow p-3">
            <div className="font-black text-ink">{employee.name}</div>
            <div className="text-sm text-deep/60">{POSITION_LABELS[employee.primaryPosition]} · {employee.contractedWeeklyHours}h</div>
          </div>
        ))}
        {employees.length === 0 && <div className="rounded-lg bg-snow p-3 text-sm font-bold text-deep">Aun no hay trabajadores.</div>}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/employees"><Button variant="secondary">Editar plantilla</Button></Link>
        <Button onClick={onNext}>Siguiente: cuadrante</Button>
      </div>
    </Card>
  );
}

function ScheduleStep({ onNext }: { onNext: () => void }) {
  const { employees, venue, schedule, weekStart, replaceSchedule } = useAppState();

  function handleGenerateSchedule() {
    const generated = generateWeeklySchedule(employees, venue);
    replaceSchedule(generated);
    downloadSchedulePdf(generated, employees, weekStart);
  }

  return (
    <Card className="p-5">
      <h2 className="text-xl font-black text-ink">Cuadrante</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {schedule.employeeHours.map((item) => (
          <div key={item.employeeId} className="rounded-lg bg-snow p-3">
            <div className="font-black text-ink">{item.employeeName}</div>
            <div className="text-sm text-deep/60">{formatHours(item.assignedHours)}h / {item.contractedHours}h</div>
          </div>
        ))}
        {schedule.employeeHours.length === 0 && <div className="rounded-lg bg-snow p-3 text-sm font-bold text-deep">Genera el horario cuando tengas bar y plantilla.</div>}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={handleGenerateSchedule}>Generar ahora y PDF</Button>
        <Link href="/schedule"><Button variant="secondary">Editar cuadrante</Button></Link>
        <Button onClick={onNext}>Siguiente: WhatsApp</Button>
      </div>
    </Card>
  );
}

function SendStep() {
  const { employees, schedule } = useAppState();
  return (
    <Card className="p-5">
      <h2 className="text-xl font-black text-ink">Enviar por WhatsApp</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {employees.filter((employee) => employee.status !== "inactive").map((employee) => {
          const assignments = schedule.assignments.filter((assignment) => assignment.employeeId === employee.id);
          const total = assignments.reduce((sum, assignment) => sum + assignment.hours, 0);
          const lines = DAYS.map((day) => {
            const dayAssignments = assignments.filter((assignment) => assignment.day === day.key);
            if (!dayAssignments.length) return `${day.label}: Libre`;
            return `${day.label}: ${dayAssignments.map((assignment) => `${assignment.start} - ${assignment.end} · ${POSITION_LABELS[assignment.position]} · ${assignment.label}`).join(" / ")}`;
          });
          const text = `Hola ${employee.name.split(" ")[0]}, este es tu horario de la semana:\n\n${lines.join("\n")}\n\nTotal semanal: ${formatHours(total)} horas.\n\nSi ves algun problema, responde a este WhatsApp y lo revisamos.`;
          const href = employee.phone ? `https://wa.me/${employee.phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
          return (
            <a key={employee.id} href={href} target="_blank" rel="noreferrer" className="rounded-lg bg-electric px-4 py-3 text-sm font-bold text-white">
              Enviar a {employee.name}
            </a>
          );
        })}
      </div>
      <div className="mt-5">
        <Link href="/schedule"><Button variant="secondary">Volver al cuadrante</Button></Link>
      </div>
    </Card>
  );
}
