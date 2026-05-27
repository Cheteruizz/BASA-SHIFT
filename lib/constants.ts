import type { DayKey, EmploymentType, Position, ShiftType } from "@/types";

export const DAYS: Array<{ key: DayKey; label: string; short: string }> = [
  { key: "monday", label: "Lunes", short: "Lun" },
  { key: "tuesday", label: "Martes", short: "Mar" },
  { key: "wednesday", label: "Miercoles", short: "Mie" },
  { key: "thursday", label: "Jueves", short: "Jue" },
  { key: "friday", label: "Viernes", short: "Vie" },
  { key: "saturday", label: "Sabado", short: "Sab" },
  { key: "sunday", label: "Domingo", short: "Dom" }
];

export const DAY_LABELS = DAYS.reduce(
  (acc, day) => ({ ...acc, [day.key]: day.label }),
  {} as Record<DayKey, string>
);

export const POSITION_LABELS: Record<Position, string> = {
  sala: "Sala",
  cocina: "Cocina",
  barra: "Barra",
  terraza: "Terraza",
  encargado: "Encargado",
  ayudante_cocina: "Ayudante cocina",
  ayudante_camarero: "Ayudante camarero",
  mantenimiento: "Mantenimiento"
};

export const POSITIONS: Position[] = [
  "sala",
  "cocina",
  "barra",
  "terraza",
  "encargado",
  "ayudante_cocina",
  "ayudante_camarero",
  "mantenimiento"
];

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  fullTime: "Completo",
  partTime: "Parcial"
};

export const SHIFT_LABELS: Record<ShiftType, string> = {
  comida: "Comida",
  tarde: "Tarde",
  cena: "Cena",
  largo8h: "Turno corrido"
};

export const AVAILABILITY_LABELS = {
  unavailable: "No disponible",
  comida: "Comida",
  cena: "Cena",
  allDay: "Todo el dia",
  split: "Partido",
  longShift: "Corrido",
  custom: "Personalizado"
} as const;
