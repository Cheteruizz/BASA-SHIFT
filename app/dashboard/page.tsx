"use client";

import Link from "next/link";
import { useAppState } from "@/components/app-state";
import { Button, Card, PageHeader, StatCard } from "@/components/ui";
import { DAY_LABELS, POSITION_LABELS } from "@/lib/constants";
import { formatHours } from "@/lib/time";

export default function DashboardPage() {
  const { venue, employees, schedule, generateSchedule } = useAppState();
  const activeDays = Object.values(venue.days).filter((day) => !day.closed).length;
  const coveredTurns = schedule.assignments.length;
  const requiredTurns = venue.shifts.reduce(
    (total, shift) =>
      total +
      (venue.days[shift.day].closed ||
      shift.enabled === false ||
      (shift.type === "largo8h" && !venue.days[shift.day].longShiftEnabled)
        ? 0
        : shift.minWorkers),
    0
  );
  const totalHours = schedule.employeeHours.reduce(
    (total, item) => total + item.assignedHours,
    0
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Resumen semanal del bar, cobertura de turnos y conflictos detectados antes de enviar el horario al equipo."
        action={
          <Link href="/schedule">
            <Button onClick={generateSchedule}>Generar horario semanal</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Trabajadores" value={employees.length} detail="Equipo disponible en demo" />
        <StatCard label="Turnos cubiertos" value={`${coveredTurns}/${requiredTurns}`} detail="Puestos asignados esta semana" />
        <StatCard label="Conflictos" value={schedule.conflicts.length} detail="Necesitan revisión manual" />
        <StatCard label="Horas planificadas" value={formatHours(totalHours)} detail={`${activeDays} días abiertos`} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-ink">Resumen de cobertura</h2>
              <p className="text-sm text-deep/65">{venue.name}, martes a domingo con picos de cena.</p>
            </div>
            <Link className="text-sm font-bold text-electric" href="/settings">
              Ajustar local
            </Link>
          </div>
          <div className="space-y-3">
            {venue.shifts
              .filter(
                (shift) =>
                  !venue.days[shift.day].closed &&
                  shift.enabled !== false &&
                  (shift.type !== "largo8h" || venue.days[shift.day].longShiftEnabled)
              )
              .map((shift) => {
              const assigned = schedule.assignments.filter(
                (item) => item.shiftId === shift.id
              ).length;
              const complete = assigned >= shift.minWorkers;
              return (
                <div key={shift.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-bold text-ink">
                      {DAY_LABELS[shift.day]} · {shift.label}
                    </div>
                    <div className="text-sm text-deep/65">
                      {shift.start} - {shift.end} · {shift.positions.map((position) => POSITION_LABELS[position]).join(", ")}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${complete ? "bg-cyanx/15 text-deep" : "bg-red-100 text-red-700"}`}>
                    {assigned}/{shift.minWorkers}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-black text-ink">Conflictos detectados</h2>
          <p className="mt-1 text-sm text-deep/65">
            BASA Shift marca huecos cuando no encuentra perfiles compatibles sin romper reglas.
          </p>
          <div className="mt-4 space-y-3">
            {schedule.conflicts.length === 0 ? (
              <div className="rounded-lg bg-cyanx/12 p-4 text-sm font-semibold text-deep">
                Horario cubierto sin conflictos.
              </div>
            ) : (
              schedule.conflicts.map((conflict) => (
                <div key={conflict.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="font-bold text-red-800">
                    {DAY_LABELS[conflict.day]} · {conflict.shiftLabel}
                  </div>
                  <div className="mt-1 text-sm text-red-700">
                    Falta {conflict.missingWorkers} perfil de {POSITION_LABELS[conflict.position].toLowerCase()}.
                  </div>
                  <div className="mt-2 text-sm text-red-700/80">{conflict.reason}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
