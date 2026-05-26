"use client";

import { useAppState } from "@/components/app-state";
import { Card, PageHeader } from "@/components/ui";
import { DAYS, POSITION_LABELS, SHIFT_LABELS } from "@/lib/constants";
import type { Position } from "@/types";

const positions: Position[] = ["sala", "cocina"];

export default function SettingsPage() {
  const { venue, setVenue } = useAppState();

  return (
    <>
      <PageHeader
        title="Configuracion del local"
        description="Aqui el dueno define como abre el bar. Con estos datos BASA Shift genera el horario sin que tenga que cuadrarlo a mano."
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-5">
          <label className="text-sm font-bold text-deep/70" htmlFor="venueName">
            Nombre del local
          </label>
          <input
            id="venueName"
            value={venue.name}
            onChange={(event) => setVenue({ ...venue, name: event.target.value })}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-ink outline-none focus:border-electric"
          />

          <div className="mt-6 space-y-4">
            {DAYS.map((day) => {
              const config = venue.days[day.key];
              return (
                <div key={day.key} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-black text-ink">{day.label}</div>
                      <div className="text-sm text-deep/60">
                        {config.closed ? "Cerrado" : `${config.opensAt} - ${config.closesAt}`}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-deep/70">
                      <input
                        type="checkbox"
                        checked={!config.closed}
                        onChange={(event) =>
                          setVenue({
                            ...venue,
                            days: {
                              ...venue.days,
                              [day.key]: { ...config, closed: !event.target.checked }
                            }
                          })
                        }
                      />
                      Abre este dia
                    </label>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <label className="text-sm font-semibold text-deep/70">
                      Apertura
                      <input
                        type="time"
                        value={config.opensAt}
                        disabled={config.closed}
                        onChange={(event) =>
                          setVenue({
                            ...venue,
                            days: {
                              ...venue.days,
                              [day.key]: { ...config, opensAt: event.target.value }
                            }
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                      />
                    </label>
                    <label className="text-sm font-semibold text-deep/70">
                      Cierre
                      <input
                        type="time"
                        value={config.closesAt}
                        disabled={config.closed}
                        onChange={(event) =>
                          setVenue({
                            ...venue,
                            days: {
                              ...venue.days,
                              [day.key]: { ...config, closesAt: event.target.value }
                            }
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                      />
                    </label>
                    <label className="flex items-end gap-2 rounded-lg bg-snow px-3 py-2 text-sm font-semibold text-deep/70">
                      <input
                        type="checkbox"
                        checked={config.longShiftEnabled}
                        disabled={config.closed}
                        onChange={(event) =>
                          setVenue({
                            ...venue,
                            days: {
                              ...venue.days,
                              [day.key]: {
                                ...config,
                                longShiftEnabled: event.target.checked
                              }
                            }
                          })
                        }
                      />
                      Turno corrido
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-black text-ink">Turnos que debe cubrir</h2>
            <p className="mt-1 text-sm text-deep/65">
              Activa solo los turnos que existen en tu bar. El minimo se reparte por roles de sala y cocina.
            </p>
          </div>
          <div className="table-scroll overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-deep text-white">
                <tr>
                  <th className="px-4 py-3">Activo</th>
                  <th className="px-4 py-3">Dia</th>
                  <th className="px-4 py-3">Turno</th>
                  <th className="px-4 py-3">Horario</th>
                  <th className="px-4 py-3">Minimo</th>
                  <th className="px-4 py-3">Roles necesarios</th>
                </tr>
              </thead>
              <tbody>
                {venue.shifts.map((shift) => {
                  const dayConfig = venue.days[shift.day];
                  const disabledByDay =
                    dayConfig.closed ||
                    (shift.type === "largo8h" && !dayConfig.longShiftEnabled);

                  return (
                    <tr key={shift.id} className="border-b border-slate-200 bg-white">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={shift.enabled !== false && !disabledByDay}
                          disabled={disabledByDay}
                          onChange={(event) =>
                            setVenue({
                              ...venue,
                              shifts: venue.shifts.map((item) =>
                                item.id === shift.id
                                  ? { ...item, enabled: event.target.checked }
                                  : item
                              )
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-3 font-bold text-ink">
                        {DAYS.find((day) => day.key === shift.day)?.label}
                      </td>
                      <td className="px-4 py-3">{SHIFT_LABELS[shift.type]}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={shift.start}
                            disabled={disabledByDay}
                            onChange={(event) =>
                              setVenue({
                                ...venue,
                                shifts: venue.shifts.map((item) =>
                                  item.id === shift.id
                                    ? { ...item, start: event.target.value }
                                    : item
                                )
                              })
                            }
                            className="w-28 rounded-lg border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                          />
                          <input
                            type="time"
                            value={shift.end}
                            disabled={disabledByDay}
                            onChange={(event) =>
                              setVenue({
                                ...venue,
                                shifts: venue.shifts.map((item) =>
                                  item.id === shift.id
                                    ? { ...item, end: event.target.value }
                                    : item
                                )
                              })
                            }
                            className="w-28 rounded-lg border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={shift.minWorkers}
                          disabled={disabledByDay}
                          onChange={(event) =>
                            setVenue({
                              ...venue,
                              shifts: venue.shifts.map((item) =>
                                item.id === shift.id
                                  ? { ...item, minWorkers: Number(event.target.value) }
                                  : item
                              )
                            })
                          }
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {positions.map((position) => (
                            <RoleCounter
                              key={position}
                              label={POSITION_LABELS[position]}
                              value={shift.positions.filter((item) => item === position).length}
                              disabled={disabledByDay}
                              onChange={(count) => {
                                const other = shift.positions.filter((item) => item !== position);
                                const nextPositions = [
                                  ...other,
                                  ...Array.from({ length: count }, () => position)
                                ];
                                setVenue({
                                  ...venue,
                                  shifts: venue.shifts.map((item) =>
                                    item.id === shift.id
                                      ? {
                                          ...item,
                                          positions: nextPositions.length
                                            ? nextPositions
                                            : [position],
                                          minWorkers: Math.max(
                                            1,
                                            nextPositions.length || item.minWorkers
                                          )
                                        }
                                      : item
                                  )
                                });
                              }}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

function RoleCounter({
  label,
  value,
  disabled,
  onChange
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-lg bg-snow px-2 py-1 text-xs font-bold text-deep">
      {label}
      <input
        type="number"
        min={0}
        max={8}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="ml-2 w-14 rounded-md border border-slate-300 px-2 py-1 disabled:bg-slate-100"
      />
    </label>
  );
}
