"use client";

import { useState } from "react";
import { Button, Card, PageHeader } from "@/components/ui";
import { useAppState } from "@/components/app-state";
import { ChatAssistant } from "@/components/chat-assistant";
import { DAYS, POSITION_LABELS } from "@/lib/constants";
import { downloadSchedulePdf } from "@/lib/pdf-export";
import { generateWeeklySchedule } from "@/lib/schedule-generator";
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
  const { venue, employees, schedule, replaceSchedule } = useAppState();

  const activeEmployees = employees.filter((employee) => employee.status !== "inactive");
  const openDays = DAYS.filter((day) => !venue.days[day.key].closed);
  const uncovered = schedule.assignments.filter((assignment) => assignment.uncovered).length;

  function handleGenerateSchedule() {
    const generated = generateWeeklySchedule(employees, venue);
    replaceSchedule(generated);
    downloadSchedulePdf(generated, employees);
    setStep("schedule");
    setReviewOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Crear horario semanal"
        description="Un unico flujo: configura el bar, revisa plantilla, genera el cuadrante y envia WhatsApp."
        action={
          <Button onClick={handleGenerateSchedule}>Generar horario y PDF</Button>
        }
      />

      {reviewOpen && (
        <Card className="mb-5 border-cyanx/30 bg-cyanx/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-ink">Horario generado</h2>
              <p className="text-sm text-deep/70">
                Se ha descargado el PDF. Revisa si seguimos con este horario o haz pequenos cambios en el cuadrante.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setReviewOpen(false)}>Seguir con este</Button>
              <Button onClick={() => setStep("send")}>Preparar WhatsApp</Button>
            </div>
          </div>
        </Card>
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
  const { employees, venue, schedule, replaceSchedule } = useAppState();

  function handleGenerateSchedule() {
    const generated = generateWeeklySchedule(employees, venue);
    replaceSchedule(generated);
    downloadSchedulePdf(generated, employees);
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
          const text = `Hola ${employee.name.split(" ")[0]}, este es tu horario semanal. Total: ${formatHours(total)} horas.`;
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
