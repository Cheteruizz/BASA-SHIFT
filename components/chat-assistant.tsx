"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/components/app-state";
import { DAYS, POSITION_LABELS } from "@/lib/constants";
import { generateWeeklySchedule } from "@/lib/schedule-generator";
import { formatHours, shiftDurationHours } from "@/lib/time";
import type { DayKey, Employee, Position, ScheduleAssignment, ShiftType, VenueConfig } from "@/types";

type Phase = "collecting" | "review" | "approved";

type Message = {
  role: "bot" | "owner";
  text: string;
  kind?: "normal" | "error" | "schedule";
};

type AiEmployee = {
  name: string;
  phone: string;
  role: Position;
  employmentType: "fullTime" | "partTime";
  weeklyHours: number;
  maxHoursPerDay: number;
  status: Employee["status"];
  acceptsSplitShift: boolean;
  unavailableDays: DayKey[];
  availability: Partial<Record<DayKey, Array<{ start: string; end: string }>>>;
  canOpen: boolean;
  canClose: boolean;
  canWorkLongShift: boolean;
};

type AiResponse = {
  reply: string;
  phase: Phase;
  venue: {
    name: string;
    openDays: DayKey[];
    normalOpen: string;
    normalClose: string;
    lateCloseDays: DayKey[];
    lateCloseTime: string;
    longShiftDays: DayKey[];
  };
  employeesToAdd: AiEmployee[];
  scheduleAction: "none" | "generate" | "regenerate" | "approve";
};

export function ChatAssistant({ compact = false }: { compact?: boolean }) {
  const {
    venue,
    setVenue,
    employees,
    setEmployees,
    schedule,
    replaceSchedule,
    saveWorkspace
  } = useAppState();
  const [phase, setPhase] = useState<Phase>("collecting");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Soy BASA Shift. Puedes pedirme cambios: configura el bar, añade trabajadores, genera o corrige el horario."
    }
  ]);

  const whatsappLinks = useMemo(() => {
    return employees.map((employee) => {
      const assignments = schedule.assignments.filter((item) => item.employeeId === employee.id);
      const lines = DAYS.map((day) => {
        const dayAssignments = assignments.filter((item) => item.day === day.key);
        if (!dayAssignments.length) return `${day.label}: Libre`;
        return `${day.label}: ${dayAssignments.map((item) => `${item.start} - ${item.end} - ${POSITION_LABELS[item.position]}`).join(" / ")}`;
      });
      const total = assignments.reduce((sum, item) => sum + item.hours, 0);
      const text = `Hola ${employee.name.split(" ")[0]}, este es tu horario de la semana:\n\n${lines.join("\n")}\n\nTotal semanal: ${formatHours(total)} horas.`;
      return {
        name: employee.name,
        href: employee.phone ? `https://wa.me/${employee.phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`
      };
    });
  }, [employees, schedule.assignments]);

  async function submit() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((current) => [...current, { role: "owner", text }]);
    setInput("");

    const localChange = applyLocalScheduleChange(text);
    if (localChange) {
      setMessages((current) => [...current, { role: "bot", text: localChange, kind: "schedule" }]);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          phase,
          venue: serializeVenue(venue),
          employees: employees.map(serializeEmployee),
          schedule: {
            hours: schedule.employeeHours,
            assignments: schedule.assignments
          }
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setMessages((current) => [...current, { role: "bot", text: data.error, kind: "error" }]);
        return;
      }

      applyAi(data as AiResponse);
    } catch {
      setMessages((current) => [...current, { role: "bot", text: "No puedo conectar con el chatbot.", kind: "error" }]);
    } finally {
      setLoading(false);
    }
  }

  function applyLocalScheduleChange(text: string) {
    const lower = normalize(text);
    const employee = employees.find((item) => lower.includes(normalize(item.name)));
    const day = findDay(lower);
    const shiftType = findShiftType(lower);
    const position = findPosition(lower, employee?.primaryPosition);
    const timeRange = findTimeRange(text);

    if (!employee || !day || (!shiftType && !timeRange)) return null;

    const existing = schedule.assignments.find((assignment) => {
      if (assignment.employeeId !== employee.id) return false;
      if (assignment.day !== day) return false;
      if (shiftType && assignment.shiftType !== shiftType) return false;
      return true;
    });

    const template = venue.shifts.find((shift) => shift.day === day && (shiftType ? shift.type === shiftType : shift.enabled !== false));
    const start = timeRange?.start ?? template?.start ?? (shiftType === "cena" ? "20:00" : "12:00");
    const end = timeRange?.end ?? template?.end ?? (shiftType === "cena" ? "00:00" : "16:00");
    const label = template?.label ?? (shiftType ? shiftLabel(shiftType) : "Manual");
    const nextAssignment: ScheduleAssignment = existing
      ? {
          ...existing,
          start,
          end,
          hours: shiftDurationHours(start, end),
          position,
          explanation: "Cambio aplicado por el asistente."
        }
      : {
          id: `assistant-${Date.now()}`,
          employeeId: employee.id,
          employeeName: employee.name,
          day,
          shiftId: template?.id ?? `assistant-${day}`,
          shiftType: shiftType ?? template?.type ?? "comida",
          label,
          start,
          end,
          position,
          hours: shiftDurationHours(start, end),
          explanation: "Turno creado por el asistente."
        };

    const assignments = existing
      ? schedule.assignments.map((assignment) => assignment.id === existing.id ? nextAssignment : assignment)
      : [...schedule.assignments, nextAssignment];

    replaceSchedule(rebuildSchedule(assignments));
    saveWorkspace();
    return `${existing ? "Cambio aplicado" : "Turno anadido"}: ${employee.name}, ${dayName(day)}, ${start}-${end}, ${POSITION_LABELS[position]}.`;
  }

  function rebuildSchedule(assignments: ScheduleAssignment[]) {
    return {
      ...schedule,
      assignments,
      employeeHours: employees.map((employee) => ({
        employeeId: employee.id,
        employeeName: employee.name,
        contractedHours: employee.contractedWeeklyHours,
        assignedHours: assignments
          .filter((assignment) => assignment.employeeId === employee.id && !assignment.uncovered)
          .reduce((sum, assignment) => sum + assignment.hours, 0)
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

  function applyAi(ai: AiResponse) {
    const nextVenue = applyVenue(venue, ai.venue);
    const nextEmployees = mergeEmployees(employees, ai.employeesToAdd);
    setVenue(nextVenue);
    setEmployees(nextEmployees);
    window.setTimeout(saveWorkspace, 0);

    if (ai.scheduleAction === "generate" || ai.scheduleAction === "regenerate") {
      const generated = generateWeeklySchedule(nextEmployees, nextVenue);
      replaceSchedule(generated);
      saveWorkspace();
      setMessages((current) => [
        ...current,
        { role: "bot", text: `${ai.reply}\n\n${scheduleSummary(generated)}\n\nSi te encaja, dime aprobado. Si no, dime el cambio.`, kind: "schedule" }
      ]);
      setPhase("review");
      return;
    }

    if (ai.scheduleAction === "approve") {
      saveWorkspace();
      setMessages((current) => [...current, { role: "bot", text: ai.reply || "Horario aprobado. Te preparo los WhatsApp.", kind: "schedule" }]);
      setPhase("approved");
      return;
    }

    setMessages((current) => [
      ...current,
      {
        role: "bot",
        text: `${ai.reply}\n\nGuardado: ${nextVenue.name || "bar sin nombre"} · ${nextEmployees.length} trabajadores · ${nextVenue.shifts.filter((shift) => shift.enabled !== false && !nextVenue.days[shift.day].closed).length} franjas activas.`
      }
    ]);
    setPhase(ai.phase);
  }

  return (
    <section className={`flex flex-col overflow-hidden rounded-lg border border-cyanx/15 bg-[#061426]/95 ${compact ? "h-[640px]" : "min-h-[calc(100vh-12rem)]"}`}>
      <div className="border-b border-cyanx/15 px-4 py-3">
        <h2 className="brand-title text-lg font-black text-snow">Asistente IA</h2>
        <p className="text-sm text-cyanx">Apoyo para configurar y corregir sin salir del flujo.</p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "owner" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${
              message.kind === "error"
                ? "border border-red-300 bg-red-50 text-red-800"
                : message.role === "owner"
                  ? "bg-electric text-white"
                  : "border border-white/10 bg-white/8 text-snow"
            }`}>
              {message.text}
            </div>
          </div>
        ))}
        {loading && <div className="rounded-lg border border-white/10 bg-white/8 px-4 py-3 text-sm text-snow">BASA esta leyendo...</div>}
        {phase === "approved" && (
          <div className="rounded-lg border border-cyanx/30 bg-ink/70 p-3">
            <h3 className="font-black text-snow">WhatsApp preparados</h3>
            <div className="mt-2 grid gap-2">
              {whatsappLinks.map((item) => (
                <a key={item.name} href={item.href} target="_blank" rel="noreferrer" className="rounded-lg bg-electric px-3 py-2 text-sm font-bold text-white">
                  Enviar a {item.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      <form className="flex gap-2 border-t border-cyanx/15 bg-ink/90 p-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <input
          value={input}
          disabled={loading}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ej. añade a Ana en sala 20h, solo comidas"
          className="min-w-0 flex-1 rounded-lg border border-cyanx/20 bg-[#071B2F] px-3 py-2 text-snow outline-none placeholder:text-snow/45 focus:border-cyanx"
        />
        <button type="submit" disabled={loading} className="rounded-lg bg-electric px-4 py-2 text-sm font-black text-white">
          Enviar
        </button>
      </form>
    </section>
  );
}

function serializeVenue(venue: VenueConfig) {
  return {
    name: venue.name,
    openDays: DAYS.filter((day) => !venue.days[day.key].closed).map((day) => day.key),
    days: venue.days
  };
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function findDay(value: string): DayKey | null {
  const aliases: Record<DayKey, string[]> = {
    monday: ["lunes", "lun"],
    tuesday: ["martes", "mar"],
    wednesday: ["miercoles", "miércoles", "mie"],
    thursday: ["jueves", "jue"],
    friday: ["viernes", "vie"],
    saturday: ["sabado", "sábado", "sab"],
    sunday: ["domingo", "dom"]
  };
  return DAYS.find((day) => aliases[day.key].some((alias) => value.includes(normalize(alias))))?.key ?? null;
}

function dayName(day: DayKey) {
  return DAYS.find((item) => item.key === day)?.label ?? day;
}

function findShiftType(value: string): ShiftType | null {
  if (value.includes("cena") || value.includes("noche")) return "cena";
  if (value.includes("comida") || value.includes("mediodia") || value.includes("medio dia")) return "comida";
  if (value.includes("tarde")) return "tarde";
  if (value.includes("corrido") || value.includes("8h") || value.includes("8 horas")) return "largo8h";
  return null;
}

function shiftLabel(type: ShiftType) {
  const labels: Record<ShiftType, string> = {
    comida: "Comida",
    tarde: "Tarde",
    cena: "Cena",
    largo8h: "Turno corrido"
  };
  return labels[type];
}

function findPosition(value: string, fallback: Position = "sala"): Position {
  if (value.includes("cocina")) return "cocina";
  if (value.includes("barra")) return "barra";
  if (value.includes("terraza")) return "terraza";
  if (value.includes("encargado")) return "encargado";
  if (value.includes("ayudante cocina")) return "ayudante_cocina";
  if (value.includes("ayudante camarero")) return "ayudante_camarero";
  if (value.includes("mantenimiento")) return "mantenimiento";
  if (value.includes("sala")) return "sala";
  return fallback;
}

function findTimeRange(value: string) {
  const match = value.match(/(\d{1,2})(?::(\d{2}))?\s*(?:-|a|hasta)\s*(\d{1,2})(?::(\d{2}))?/i);
  if (!match) return null;
  const start = `${match[1].padStart(2, "0")}:${match[2] ?? "00"}`;
  const end = `${match[3].padStart(2, "0")}:${match[4] ?? "00"}`;
  return { start, end };
}

function serializeEmployee(employee: Employee) {
  return {
    name: employee.name,
    phone: employee.phone,
    role: employee.primaryPosition,
    employmentType: employee.employmentType,
    weeklyHours: employee.contractedWeeklyHours,
    unavailableDays: employee.unavailableDays,
    availability: employee.availability
  };
}

function applyVenue(currentVenue: VenueConfig, aiVenue: AiResponse["venue"]) {
  let nextVenue = currentVenue;
  if (aiVenue.name) nextVenue = { ...nextVenue, name: aiVenue.name };
  if (aiVenue.openDays.length) nextVenue = applyOpenDays(nextVenue, aiVenue.openDays);
  if (aiVenue.normalOpen && aiVenue.normalClose) nextVenue = applyHours(nextVenue, aiVenue.normalOpen, aiVenue.normalClose);
  if (aiVenue.lateCloseDays.length && aiVenue.lateCloseTime) nextVenue = applyLateClose(nextVenue, aiVenue.lateCloseDays, aiVenue.lateCloseTime);
  if (aiVenue.longShiftDays.length) nextVenue = applyLongShifts(nextVenue, aiVenue.longShiftDays);
  return nextVenue;
}

function mergeEmployees(current: Employee[], incoming: AiEmployee[]) {
  if (!incoming.length) return current;
  const next = [...current];
  for (const employee of incoming) {
    if (!employee.name) continue;
    const index = next.findIndex((item) => item.name.toLowerCase() === employee.name.toLowerCase());
    const normalized: Employee = {
      id: index >= 0 ? next[index].id : `emp-${Date.now()}-${next.length}`,
      name: employee.name,
      phone: employee.phone,
      employmentType: employee.employmentType,
      primaryPosition: employee.role,
      secondaryPositions: [],
      contractedWeeklyHours: employee.weeklyHours,
      maxHoursPerDay: employee.maxHoursPerDay,
      status: employee.status,
      acceptsSplitShift: employee.acceptsSplitShift,
      unavailableDays: employee.unavailableDays,
      availabilityMode: {},
      availability: employee.availability,
      preferredWorkDays: [],
      preferredRestDays: [],
      canOpen: employee.canOpen,
      canClose: employee.canClose,
      canWorkLongShift: employee.canWorkLongShift
    };
    if (index >= 0) next[index] = normalized;
    else next.push(normalized);
  }
  return next;
}

function applyOpenDays(venue: VenueConfig, openDays: DayKey[]) {
  const days = { ...venue.days };
  for (const day of DAYS) days[day.key] = { ...days[day.key], closed: !openDays.includes(day.key) };
  return { ...venue, days, shifts: venue.shifts.map((shift) => ({ ...shift, enabled: openDays.includes(shift.day) && shift.type !== "largo8h" })) };
}

function applyHours(venue: VenueConfig, start: string, end: string) {
  const days = { ...venue.days };
  for (const day of DAYS) if (!days[day.key].closed) days[day.key] = { ...days[day.key], opensAt: start, closesAt: end };
  return { ...venue, days };
}

function applyLateClose(venue: VenueConfig, lateDays: DayKey[], close: string) {
  const days = { ...venue.days };
  for (const day of lateDays) days[day] = { ...days[day], closesAt: close };
  return { ...venue, days, shifts: venue.shifts.map((shift) => lateDays.includes(shift.day) && shift.type === "cena" ? { ...shift, end: close } : shift) };
}

function applyLongShifts(venue: VenueConfig, longDays: DayKey[]) {
  const days = { ...venue.days };
  for (const day of DAYS) days[day.key] = { ...days[day.key], longShiftEnabled: longDays.includes(day.key) };
  return { ...venue, days, shifts: venue.shifts.map((shift) => shift.type === "largo8h" ? { ...shift, enabled: longDays.includes(shift.day) } : shift) };
}

function scheduleSummary(schedule: ReturnType<typeof generateWeeklySchedule>) {
  const hours = schedule.employeeHours.length
    ? schedule.employeeHours.map((item) => `${item.employeeName}: ${formatHours(item.assignedHours)}h`).join("\n")
    : "No hay trabajadores todavia.";
  return `${hours}\n\n${schedule.conflicts.length ? `Avisos: ${schedule.conflicts.length}` : "Sin avisos."}`;
}
