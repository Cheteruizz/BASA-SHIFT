"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAppState } from "@/components/app-state";
import { Button, Card, PageHeader } from "@/components/ui";
import {
  AVAILABILITY_LABELS,
  DAY_LABELS,
  DAYS,
  POSITION_LABELS,
  POSITIONS
} from "@/lib/constants";
import { formatHours } from "@/lib/time";
import type { AvailabilityMode, DayKey, Employee, EmployeeStatus, Position } from "@/types";

const defaultAvailability = Object.fromEntries(
  DAYS.map((day) => [day.key, "allDay"])
) as Record<DayKey, AvailabilityMode>;

function createEmployee(copyFrom?: Employee): Employee {
  return {
    id: `emp-${Date.now()}`,
    name: "",
    phone: "",
    employmentType: "partTime",
    primaryPosition: "sala",
    secondaryPositions: [],
    contractedWeeklyHours: 20,
    maxHoursPerDay: 8,
    status: "active",
    acceptsSplitShift: true,
    unavailableDays: [],
    availabilityMode: copyFrom?.availabilityMode ?? defaultAvailability,
    availability: copyFrom?.availability ?? {},
    preferredWorkDays: copyFrom?.preferredWorkDays ?? [],
    preferredRestDays: [],
    canOpen: true,
    canClose: true,
    canWorkLongShift: true
  };
}

export default function EmployeesPage() {
  const { employees, setEmployees, schedule } = useAppState();
  const [draft, setDraft] = useState<Employee>(() => createEmployee());
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeEmployees = employees.filter((employee) => employee.status !== "inactive");
  const totalTargetHours = useMemo(
    () => activeEmployees.reduce((total, employee) => total + employee.contractedWeeklyHours, 0),
    [activeEmployees]
  );

  function saveEmployee() {
    if (!draft.name.trim()) return;
    const normalized = normalizeEmployee(draft);

    setEmployees(
      editingId
        ? employees.map((employee) =>
            employee.id === editingId ? { ...normalized, id: editingId } : employee
          )
        : [...employees, normalized]
    );
    setDraft(createEmployee());
    setEditingId(null);
  }

  function patchEmployee(employeeId: string, patch: Partial<Employee>) {
    setEmployees(
      employees.map((employee) =>
        employee.id === employeeId ? normalizeEmployee({ ...employee, ...patch }) : employee
      )
    );
  }

  function duplicateAvailability(fromId: string, toId: string) {
    const source = employees.find((employee) => employee.id === fromId);
    if (!source) return;
    patchEmployee(toId, {
      availability: source.availability,
      availabilityMode: source.availabilityMode,
      unavailableDays: source.unavailableDays
    });
  }

  return (
    <>
      <PageHeader
        title="Plantilla"
        description="Alta rápida de trabajadores, disponibilidad por chips y edición directa desde tabla."
        action={<Button onClick={saveEmployee}>{editingId ? "Guardar cambios" : "Añadir trabajador"}</Button>}
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm font-semibold text-deep/60">Activos</div>
          <div className="mt-2 text-3xl font-black text-ink">{activeEmployees.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-semibold text-deep/60">Horas objetivo</div>
          <div className="mt-2 text-3xl font-black text-ink">{totalTargetHours}h</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-semibold text-deep/60">Puestos</div>
          <div className="mt-2 text-lg font-black text-ink">Sala, cocina, ayudantes, mantenimiento</div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-xl font-black text-ink">{editingId ? "Editar trabajador" : "Añadir trabajador rápido"}</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="Nombre"
            className="rounded-lg border border-slate-300 px-3 py-2 text-ink"
          />
          <select
            value={draft.primaryPosition}
            onChange={(event) => setDraft({ ...draft, primaryPosition: event.target.value as Position })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-ink"
          >
            {POSITIONS.map((position) => (
              <option key={position} value={position}>{POSITION_LABELS[position]}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={60}
            value={draft.contractedWeeklyHours}
            onChange={(event) => setDraft({ ...draft, contractedWeeklyHours: Number(event.target.value) })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-ink"
            placeholder="Horas"
          />
          <select
            value={draft.status}
            onChange={(event) => setDraft({ ...draft, status: event.target.value as EmployeeStatus })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-ink"
          >
            <option value="active">Activo</option>
            <option value="temporary">Temporal</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <ToggleChip
            active={draft.canOpen}
            onClick={() => setDraft({ ...draft, canOpen: !draft.canOpen })}
          >
            Puede abrir
          </ToggleChip>
          <ToggleChip
            active={draft.canClose}
            onClick={() => setDraft({ ...draft, canClose: !draft.canClose })}
          >
            Puede cerrar
          </ToggleChip>
          <ToggleChip
            active={draft.canWorkLongShift}
            onClick={() => setDraft({ ...draft, canWorkLongShift: !draft.canWorkLongShift })}
          >
            Puede corrido
          </ToggleChip>
        </div>

        <AvailabilityEditor employee={draft} onChange={setDraft} />
        <PreferredDaysEditor employee={draft} onChange={setDraft} />

        {editingId && (
          <button
            className="mt-3 text-sm font-bold text-electric"
            onClick={() => {
              setDraft(createEmployee());
              setEditingId(null);
            }}
          >
            Cancelar edición
          </button>
        )}
      </Card>

      <Card className="mt-5 overflow-hidden">
        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-deep text-white">
              <tr>
                <th className="px-4 py-3">Trabajador</th>
                <th className="px-4 py-3">Puesto</th>
                <th className="px-4 py-3">Horas</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Apertura/cierre</th>
                <th className="px-4 py-3">Disponibilidad</th>
                <th className="px-4 py-3">Copiar disponibilidad</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const hours = schedule.employeeHours.find((item) => item.employeeId === employee.id);
                return (
                  <tr key={employee.id} className="border-b border-slate-200 bg-white align-top">
                    <td className="px-4 py-3">
                      <input
                        value={employee.name}
                        onChange={(event) => patchEmployee(employee.id, { name: event.target.value })}
                        className="w-44 rounded border border-slate-300 px-2 py-1 font-bold text-ink"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={employee.primaryPosition}
                        onChange={(event) => patchEmployee(employee.id, { primaryPosition: event.target.value as Position })}
                        className="rounded border border-slate-300 px-2 py-1 text-ink"
                      >
                        {POSITIONS.map((position) => (
                          <option key={position} value={position}>{POSITION_LABELS[position]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={employee.contractedWeeklyHours}
                        onChange={(event) => patchEmployee(employee.id, { contractedWeeklyHours: Number(event.target.value) })}
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-ink"
                      />
                      <div className="mt-1 text-xs text-deep/60">Asignadas: {formatHours(hours?.assignedHours ?? 0)}h</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={employee.status}
                        onChange={(event) => patchEmployee(employee.id, { status: event.target.value as EmployeeStatus })}
                        className="rounded border border-slate-300 px-2 py-1 text-ink"
                      >
                        <option value="active">Activo</option>
                        <option value="temporary">Temporal</option>
                        <option value="inactive">Inactivo</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <ToggleChip active={employee.canOpen} onClick={() => patchEmployee(employee.id, { canOpen: !employee.canOpen })}>
                          Abre
                        </ToggleChip>
                        <ToggleChip active={employee.canClose} onClick={() => patchEmployee(employee.id, { canClose: !employee.canClose })}>
                          Cierra
                        </ToggleChip>
                        <ToggleChip active={employee.canWorkLongShift} onClick={() => patchEmployee(employee.id, { canWorkLongShift: !employee.canWorkLongShift })}>
                          Corrido
                        </ToggleChip>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid grid-cols-7 gap-1">
                        {DAYS.map((day) => (
                          <span key={day.key} className="rounded bg-snow px-2 py-1 text-xs font-bold text-deep">
                            {day.short}: {AVAILABILITY_LABELS[employee.availabilityMode?.[day.key] ?? "allDay"]}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {employee.preferredWorkDays.map((dayKey) => (
                          <span key={dayKey} className="rounded-full bg-electric/10 px-2 py-1 text-xs font-black text-electric">
                            Pref. {DAY_LABELS[dayKey]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        defaultValue=""
                        onChange={(event) => {
                          if (event.target.value) duplicateAvailability(event.target.value, employee.id);
                          event.currentTarget.value = "";
                        }}
                        className="rounded border border-slate-300 px-2 py-1 text-ink"
                      >
                        <option value="">Elegir...</option>
                        {employees.filter((item) => item.id !== employee.id).map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => { setDraft(employee); setEditingId(employee.id); }}>Editar</Button>
                        <Button
                          variant="danger"
                          onClick={() => patchEmployee(employee.id, { status: employee.status === "inactive" ? "active" : "inactive" })}
                        >
                          {employee.status === "inactive" ? "Activar" : "Desactivar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function AvailabilityEditor({ employee, onChange }: { employee: Employee; onChange: (employee: Employee) => void }) {
  function setMode(day: DayKey, mode: AvailabilityMode) {
    const availabilityMode = { ...employee.availabilityMode, [day]: mode };
    const availability = { ...employee.availability };
    const unavailableDays = employee.unavailableDays.filter((item) => item !== day);

    if (mode === "unavailable") {
      availability[day] = [];
      unavailableDays.push(day);
    } else if (mode === "comida") {
      availability[day] = [{ start: "12:00", end: "16:00" }];
    } else if (mode === "cena") {
      availability[day] = [{ start: "20:00", end: "02:00" }];
    } else if (mode === "allDay") {
      availability[day] = [];
    } else if (mode === "split") {
      availability[day] = [
        { start: "12:00", end: "16:00" },
        { start: "20:00", end: "00:00" }
      ];
    } else if (mode === "longShift") {
      availability[day] = [{ start: "12:00", end: "20:00" }];
    } else {
      availability[day] = availability[day]?.length ? availability[day] : [{ start: "12:00", end: "16:00" }];
    }

    onChange(normalizeEmployee({
      ...employee,
      availabilityMode,
      availability,
      unavailableDays,
      acceptsSplitShift: mode === "split" ? true : employee.acceptsSplitShift,
      canWorkLongShift: mode === "longShift" ? true : employee.canWorkLongShift
    }));
  }

  return (
    <div className="mt-4 rounded-lg bg-snow p-3">
      <div className="mb-3 text-sm font-black text-ink">Disponibilidad semanal</div>
      <div className="space-y-3">
        {DAYS.map((day) => {
          const mode = employee.availabilityMode?.[day.key] ?? "allDay";
          const custom = employee.availability?.[day.key]?.[0] ?? { start: "12:00", end: "16:00" };

          return (
            <div key={day.key} className="rounded-lg bg-white p-3">
              <div className="mb-2 font-bold text-ink">{DAY_LABELS[day.key]}</div>
              <div className="flex flex-wrap gap-2">
                {(["unavailable", "comida", "cena", "allDay", "split", "longShift", "custom"] as AvailabilityMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(day.key, item)}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      mode === item ? "bg-electric text-white" : "bg-snow text-deep"
                    }`}
                  >
                    {AVAILABILITY_LABELS[item]}
                  </button>
                ))}
              </div>
              {mode === "custom" && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="time"
                    value={custom.start}
                    onChange={(event) =>
                      onChange({
                        ...employee,
                        availability: {
                          ...employee.availability,
                          [day.key]: [{ start: event.target.value, end: custom.end }]
                        }
                      })
                    }
                    className="rounded border border-slate-300 px-2 py-1 text-ink"
                  />
                  <input
                    type="time"
                    value={custom.end}
                    onChange={(event) =>
                      onChange({
                        ...employee,
                        availability: {
                          ...employee.availability,
                          [day.key]: [{ start: custom.start, end: event.target.value }]
                        }
                      })
                    }
                    className="rounded border border-slate-300 px-2 py-1 text-ink"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PreferredDaysEditor({ employee, onChange }: { employee: Employee; onChange: (employee: Employee) => void }) {
  function toggleDay(day: DayKey) {
    const preferredWorkDays = employee.preferredWorkDays.includes(day)
      ? employee.preferredWorkDays.filter((item) => item !== day)
      : [...employee.preferredWorkDays, day];
    onChange(normalizeEmployee({ ...employee, preferredWorkDays }));
  }

  return (
    <div className="mt-4 rounded-lg bg-snow p-3">
      <div className="text-sm font-black text-ink">Dias preferidos de trabajo</div>
      <p className="mt-1 text-xs text-deep/60">
        Preferencia flexible: se intentan asignar primero, pero no bloquea otros dias si hace falta cubrir el bar.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {DAYS.map((day) => (
          <button
            key={day.key}
            type="button"
            onClick={() => toggleDay(day.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${
              employee.preferredWorkDays.includes(day.key)
                ? "bg-electric text-white"
                : "bg-white text-deep"
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-black ${
        active ? "bg-electric text-white" : "bg-snow text-deep"
      }`}
    >
      {children}
    </button>
  );
}

function normalizeEmployee(employee: Employee): Employee {
  return {
    ...employee,
    name: employee.name.trim(),
    status: employee.status ?? "active",
    acceptsSplitShift: employee.acceptsSplitShift ?? true,
    canOpen: employee.canOpen ?? true,
    canClose: employee.canClose ?? true,
    canWorkLongShift: employee.canWorkLongShift ?? true,
    preferredWorkDays: employee.preferredWorkDays ?? [],
    availabilityMode: employee.availabilityMode ?? defaultAvailability,
    availability: employee.availability ?? {}
  };
}
