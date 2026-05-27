"use client";

import type { ReactNode } from "react";
import { useAppState } from "@/components/app-state";
import { Button, Card, PageHeader } from "@/components/ui";
import { DAYS, POSITION_LABELS, POSITIONS, SHIFT_LABELS } from "@/lib/constants";
import type { DayKey, ShiftTemplate, ShiftType, VenueConfig } from "@/types";

const serviceShifts: ShiftType[] = ["comida", "cena", "largo8h"];

export default function SettingsPage() {
  const { venue, setVenue } = useAppState();

  function updateVenue(next: VenueConfig) {
    setVenue(next);
  }

  function setDayClosed(day: DayKey, closed: boolean) {
    updateVenue({
      ...venue,
      days: {
        ...venue.days,
        [day]: { ...venue.days[day], closed }
      },
      shifts: venue.shifts.map((shift) =>
        shift.day === day ? { ...shift, enabled: !closed && shift.enabled } : shift
      )
    });
  }

  function setDayMode(day: DayKey, mode: "single" | "split" | "fullDay") {
    updateVenue({
      ...venue,
      days: {
        ...venue.days,
        [day]: { ...venue.days[day], closed: false, longShiftEnabled: mode === "fullDay" }
      },
      shifts: venue.shifts.map((shift) => {
        if (shift.day !== day) return shift;
        if (mode === "single") {
          return { ...shift, enabled: shift.type === "comida" };
        }
        if (mode === "fullDay") {
          return { ...shift, enabled: shift.type === "comida" || shift.type === "cena" || shift.type === "largo8h" };
        }
        return { ...shift, enabled: shift.type === "comida" || shift.type === "cena" };
      })
    });
  }

  function updateShift(shiftId: string, patch: Partial<ShiftTemplate>) {
    updateVenue({
      ...venue,
      shifts: venue.shifts.map((shift) =>
        shift.id === shiftId ? { ...shift, ...patch } : shift
      )
    });
  }

  function copyDay(source: DayKey, targets: DayKey[]) {
    const sourceDay = venue.days[source];
    const sourceShifts = venue.shifts.filter((shift) => shift.day === source);

    updateVenue({
      ...venue,
      days: {
        ...venue.days,
        ...Object.fromEntries(
          targets.map((target) => [
            target,
            { ...sourceDay, day: target }
          ])
        )
      },
      shifts: venue.shifts.map((shift) => {
        if (!targets.includes(shift.day)) return shift;
        const sourceMatch = sourceShifts.find((item) => item.type === shift.type);
        return sourceMatch
          ? {
              ...shift,
              enabled: sourceMatch.enabled,
              start: sourceMatch.start,
              end: sourceMatch.end,
              minWorkers: sourceMatch.minWorkers,
              positions: sourceMatch.positions
            }
          : shift;
      })
    });
  }

  return (
    <>
      <PageHeader
        title="Horario del bar"
        description="Configura la semana en segundos: cerrado, turno unico, partido o abierto todo el dia con corridos."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => copyDay("monday", ["tuesday", "wednesday", "thursday", "friday"])}>
              Copiar lunes a viernes
            </Button>
            <Button onClick={() => copyDay("monday", DAYS.map((day) => day.key).filter((day) => day !== "monday"))}>
              Copiar a toda la semana
            </Button>
          </div>
        }
      />

      <Card className="p-5">
        <label className="text-sm font-bold text-deep/70">
          Nombre del local
          <input
            value={venue.name}
            onChange={(event) => updateVenue({ ...venue, name: event.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-ink"
            placeholder="La Corrala"
          />
        </label>
      </Card>

      <div className="mt-5 grid gap-4">
        {DAYS.map((day) => {
          const dayConfig = venue.days[day.key];
          const dayShifts = venue.shifts.filter(
            (shift) => shift.day === day.key && serviceShifts.includes(shift.type)
          );
          const enabledShifts = dayShifts.filter((shift) => shift.enabled !== false);
          const enabledCount = enabledShifts.length;
          const longShiftActive = enabledShifts.some((shift) => shift.type === "largo8h");
          const fullDayActive = longShiftActive && enabledShifts.some((shift) => shift.type === "comida") && enabledShifts.some((shift) => shift.type === "cena");

          return (
            <Card key={day.key} className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-36">
                  <div className="text-lg font-black text-ink">{day.label}</div>
                  <div className="mt-1 text-sm text-deep/60">
                    {dayConfig.closed ? "Cerrado" : fullDayActive ? "Abierto todo el dia" : longShiftActive ? "Turno corrido" : enabledCount > 1 ? "Turno partido" : "Turno unico"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Chip active={dayConfig.closed} onClick={() => setDayClosed(day.key, true)}>Cerrado</Chip>
                  <Chip active={!dayConfig.closed && !longShiftActive && enabledCount <= 1} onClick={() => setDayMode(day.key, "single")}>Turno unico</Chip>
                  <Chip active={!dayConfig.closed && !longShiftActive && enabledCount > 1} onClick={() => setDayMode(day.key, "split")}>Comida + cena</Chip>
                  <Chip active={!dayConfig.closed && fullDayActive} onClick={() => setDayMode(day.key, "fullDay")}>Abierto todo el dia</Chip>
                  <Chip active={false} onClick={() => copyDay(day.key, DAYS.map((item) => item.key).filter((item) => item !== day.key))}>Duplicar dia</Chip>
                </div>
              </div>

              {!dayConfig.closed && (
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {dayShifts.map((shift) => (
                    <div key={shift.id} className="rounded-lg border border-slate-200 bg-snow p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm font-black text-ink">
                          <input
                            type="checkbox"
                            checked={shift.enabled !== false}
                            onChange={(event) => updateShift(shift.id, { enabled: event.target.checked })}
                          />
                          {SHIFT_LABELS[shift.type]}
                        </label>
                        <button
                          className="text-xs font-bold text-electric"
                          onClick={() => updateShift(shift.id, { enabled: true })}
                        >
                          Añadir franja
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <TimeInput label="Inicio" value={shift.start} onChange={(start) => updateShift(shift.id, { start })} />
                        <TimeInput label="Fin" value={shift.end} onChange={(end) => updateShift(shift.id, { end })} />
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-[90px_1fr]">
                        <label className="text-xs font-bold text-deep/60">
                          Minimo
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={shift.minWorkers}
                            onChange={(event) => updateShift(shift.id, { minWorkers: Number(event.target.value) })}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-ink"
                          />
                        </label>
                        <div>
                          <div className="text-xs font-bold text-deep/60">Puestos</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {POSITIONS.map((position) => (
                              <label key={position} className="rounded-full bg-white px-2 py-1 text-xs font-bold text-deep">
                                {POSITION_LABELS[position]}
                                <input
                                  type="number"
                                  min={0}
                                  max={8}
                                  value={shift.positions.filter((item) => item === position).length}
                                  onChange={(event) => {
                                    const count = Number(event.target.value);
                                    const others = shift.positions.filter((item) => item !== position);
                                    const positions = [
                                      ...others,
                                      ...Array.from({ length: count }, () => position)
                                    ];
                                    updateShift(shift.id, {
                                      positions: positions.length ? positions : [position],
                                      minWorkers: Math.max(1, positions.length || shift.minWorkers)
                                    });
                                  }}
                                  className="ml-1 w-10 rounded border border-slate-300 px-1 text-ink"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-bold ${
        active ? "bg-electric text-white" : "bg-snow text-deep hover:bg-cyanx/20"
      }`}
    >
      {children}
    </button>
  );
}

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-bold text-deep/60">
      {label}
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-ink"
      />
    </label>
  );
}
