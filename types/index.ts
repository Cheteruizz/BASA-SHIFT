export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type Position =
  | "sala"
  | "cocina"
  | "barra"
  | "terraza"
  | "encargado"
  | "ayudante_cocina"
  | "ayudante_camarero"
  | "mantenimiento";

export type EmploymentType = "fullTime" | "partTime";
export type EmployeeStatus = "active" | "inactive" | "temporary";
export type AvailabilityMode =
  | "unavailable"
  | "comida"
  | "cena"
  | "allDay"
  | "split"
  | "longShift"
  | "custom";

export type ShiftType = "comida" | "tarde" | "cena" | "largo8h";

export type ConflictSeverity = "alta" | "media" | "baja";

export interface DayOpeningConfig {
  day: DayKey;
  closed: boolean;
  opensAt: string;
  closesAt: string;
  longShiftEnabled: boolean;
}

export interface ShiftTemplate {
  id: string;
  day: DayKey;
  type: ShiftType;
  label: string;
  start: string;
  end: string;
  minWorkers: number;
  positions: Position[];
  enabled?: boolean;
  critical?: boolean;
}

export interface VenueConfig {
  id: string;
  name: string;
  days: Record<DayKey, DayOpeningConfig>;
  shifts: ShiftTemplate[];
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  employmentType: EmploymentType;
  primaryPosition: Position;
  secondaryPositions: Position[];
  contractedWeeklyHours: number;
  maxHoursPerDay: number;
  status: EmployeeStatus;
  acceptsSplitShift: boolean;
  unavailableDays: DayKey[];
  availabilityMode: Partial<Record<DayKey, AvailabilityMode>>;
  availability: Partial<Record<DayKey, Array<{ start: string; end: string }>>>;
  preferredRestDays: DayKey[];
  canOpen: boolean;
  canClose: boolean;
  canWorkLongShift: boolean;
}

export interface ScheduleAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  day: DayKey;
  shiftId: string;
  shiftType: ShiftType;
  label: string;
  start: string;
  end: string;
  position: Position;
  hours: number;
  uncovered?: boolean;
}

export interface ScheduleConflict {
  id: string;
  day: DayKey;
  shiftId: string;
  shiftLabel: string;
  position: Position;
  missingWorkers: number;
  reason: string;
  severity: ConflictSeverity;
}

export interface EmployeeHours {
  employeeId: string;
  employeeName: string;
  contractedHours: number;
  assignedHours: number;
}

export interface GeneratedSchedule {
  assignments: ScheduleAssignment[];
  employeeHours: EmployeeHours[];
  conflicts: ScheduleConflict[];
}

export interface DemoState {
  venue: VenueConfig;
  employees: Employee[];
}
