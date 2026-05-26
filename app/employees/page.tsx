"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/components/app-state";
import { Button, Card, PageHeader } from "@/components/ui";
import {
  DAY_LABELS,
  DAYS,
  EMPLOYMENT_LABELS,
  POSITION_LABELS
} from "@/lib/constants";
import { formatHours } from "@/lib/time";
import type { DayKey, Employee, EmploymentType, Position } from "@/types";

const positions: Position[] = ["sala", "cocina"];

function createEmptyEmployee(): Employee {
  return {
    id: `emp-${Date.now()}`,
    name: "",
    phone: "",
    employmentType: "partTime",
    primaryPosition: "sala",
    secondaryPositions: [],
    contractedWeeklyHours: 20,
    maxHoursPerDay: 6,
    unavailableDays: [],
    availability: {},
    preferredRestDays: [],
    canOpen: true,
    canClose: true,
    canWorkLongShift: false
  };
}

export default function EmployeesPage() {
  const { employees, setEmployees, schedule } = useAppState();
  const [draft, setDraft] = useState<Employee>(() => createEmptyEmployee());
  const [editingId, setEditingId] = useState<string | null>(null);

  const totalContractedHours = useMemo(
    () => employees.reduce((total, employee) => total + employee.contractedWeeklyHours, 0),
    [employees]
  );

  function resetForm() {
    setDraft(createEmptyEmployee());
    setEditingId(null);
  }

  function saveEmployee() {
    if (!draft.name.trim()) return;

    const normalized: Employee = {
      ...draft,
      name: draft.name.trim(),
      phone: draft.phone.replace(/\s/g, ""),
      secondaryPositions: draft.secondaryPositions.filter(
        (position) => position !== draft.primaryPosition
      )
    };

    if (editingId) {
      setEmployees(
        employees.map((employee) =>
          employee.id === editingId ? { ...normalized, id: editingId } : employee
        )
      );
    } else {
      setEmployees([...employees, normalized]);
    }

    resetForm();
  }

  return (
    <>
      <PageHeader
        title="Trabajadores"
        description="El dueno mete aqui su plantilla una vez: rol, horas, contrato parcial o completo y dias que no pueden trabajar."
        action={<Button onClick={saveEmployee}>{editingId ? "Guardar cambios" : "Anadir trabajador"}</Button>}
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm font-semibold text-deep/60">Plantilla</div>
          <div className="mt-2 text-3xl font-black text-ink">{employees.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-semibold text-deep/60">Horas contratadas</div>
          <div className="mt-2 text-3xl font-black text-ink">{totalContractedHours}h</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-semibold text-deep/60">Roles</div>
          <div className="mt-2 text-lg font-black text-ink">Sala y Cocina</div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <h2 className="text-xl font-black text-ink">
            {editingId ? "Editar trabajador" : "Nuevo trabajador"}
          </h2>

          <div className="mt-4 grid gap-3">
            <label className="text-sm font-bold text-deep/70">
              Nombre
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Ej. Ana Lopez"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-bold text-deep/70">
              Telefono WhatsApp
              <input
                value={draft.phone}
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                placeholder="34600111222"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold text-deep/70">
                Contrato
                <select
                  value={draft.employmentType}
                  onChange={(event) => {
                    const employmentType = event.target.value as EmploymentType;
                    setDraft({
                      ...draft,
                      employmentType,
                      contractedWeeklyHours:
                        employmentType === "fullTime" ? 40 : Math.min(draft.contractedWeeklyHours, 25),
                      maxHoursPerDay: employmentType === "fullTime" ? 8 : Math.min(draft.maxHoursPerDay, 6)
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="fullTime">Completo</option>
                  <option value="partTime">Parcial</option>
                </select>
              </label>
              <label className="text-sm font-bold text-deep/70">
                Rol principal
                <select
                  value={draft.primaryPosition}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      primaryPosition: event.target.value as Position
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {positions.map((position) => (
                    <option key={position} value={position}>
                      {POSITION_LABELS[position]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold text-deep/70">
                Horas semanales
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={draft.contractedWeeklyHours}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      contractedWeeklyHours: Number(event.target.value)
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm font-bold text-deep/70">
                Maximo horas/dia
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={draft.maxHoursPerDay}
                  onChange={(event) =>
                    setDraft({ ...draft, maxHoursPerDay: Number(event.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="rounded-lg bg-snow p-3">
              <div className="mb-2 text-sm font-bold text-deep/70">Puede cubrir tambien</div>
              {positions
                .filter((position) => position !== draft.primaryPosition)
                .map((position) => (
                  <label key={position} className="mr-4 inline-flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={draft.secondaryPositions.includes(position)}
                      onChange={(event) => {
                        const secondaryPositions = event.target.checked
                          ? [...draft.secondaryPositions, position]
                          : draft.secondaryPositions.filter((item) => item !== position);
                        setDraft({ ...draft, secondaryPositions });
                      }}
                    />
                    {POSITION_LABELS[position]}
                  </label>
                ))}
            </div>

            <DayCheckboxGroup
              title="Dias que no puede trabajar"
              selected={draft.unavailableDays}
              onChange={(unavailableDays) => setDraft({ ...draft, unavailableDays })}
            />
            <DayCheckboxGroup
              title="Descansos preferidos"
              selected={draft.preferredRestDays}
              onChange={(preferredRestDays) => setDraft({ ...draft, preferredRestDays })}
            />

            <div className="grid gap-2 sm:grid-cols-3">
              <Toggle label="Puede abrir" checked={draft.canOpen} onChange={(canOpen) => setDraft({ ...draft, canOpen })} />
              <Toggle label="Puede cerrar" checked={draft.canClose} onChange={(canClose) => setDraft({ ...draft, canClose })} />
              <Toggle label="Turno corrido" checked={draft.canWorkLongShift} onChange={(canWorkLongShift) => setDraft({ ...draft, canWorkLongShift })} />
            </div>

            {editingId && (
              <Button variant="secondary" onClick={resetForm}>
                Cancelar edicion
              </Button>
            )}
          </div>
        </Card>

        <div className="grid gap-4">
          {employees.map((employee) => {
            const hours = schedule.employeeHours.find(
              (item) => item.employeeId === employee.id
            );

            return (
              <Card key={employee.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-ink">{employee.name}</h2>
                    <p className="mt-1 text-sm text-deep/65">
                      {employee.phone || "Sin telefono"} · {EMPLOYMENT_LABELS[employee.employmentType]}
                    </p>
                  </div>
                  <div className="rounded-lg bg-electric px-3 py-2 text-sm font-black text-white">
                    {formatHours(hours?.assignedHours ?? 0)}h / {employee.contractedWeeklyHours}h
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Info label="Rol" value={POSITION_LABELS[employee.primaryPosition]} />
                  <Info
                    label="Apoyo"
                    value={
                      employee.secondaryPositions.length
                        ? employee.secondaryPositions.map((position) => POSITION_LABELS[position]).join(", ")
                        : "Solo su rol"
                    }
                  />
                  <Info label="Maximo diario" value={`${employee.maxHoursPerDay} horas`} />
                  <Info
                    label="No disponible"
                    value={
                      employee.unavailableDays.length
                        ? employee.unavailableDays.map((day) => DAY_LABELS[day]).join(", ")
                        : "Sin bloqueos"
                    }
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDraft(employee);
                      setEditingId(employee.id);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() =>
                      setEmployees(employees.filter((item) => item.id !== employee.id))
                    }
                  >
                    Borrar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}

function DayCheckboxGroup({
  title,
  selected,
  onChange
}: {
  title: string;
  selected: DayKey[];
  onChange: (days: DayKey[]) => void;
}) {
  return (
    <div className="rounded-lg bg-snow p-3">
      <div className="mb-2 text-sm font-bold text-deep/70">{title}</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DAYS.map((day) => (
          <label key={day.key} className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={selected.includes(day.key)}
              onChange={(event) => {
                const days = event.target.checked
                  ? [...selected, day.key]
                  : selected.filter((item) => item !== day.key);
                onChange(days);
              }}
            />
            {day.short}
          </label>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg bg-snow px-3 py-2 text-sm font-semibold text-deep">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-snow px-3 py-3">
      <div className="text-xs font-bold uppercase text-deep/50">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}
