import type {
  DayKey,
  Employee,
  EmployeeHours,
  GeneratedSchedule,
  Position,
  ScheduleAssignment,
  ScheduleConflict,
  ShiftTemplate,
  VenueConfig
} from "@/types";
import { shiftDurationHours, timeToMinutes } from "@/lib/time";

type HoursMap = Record<string, number>;
type DayHoursMap = Record<string, Partial<Record<DayKey, number>>>;

function employeeSupportsPosition(employee: Employee, position: Position): boolean {
  const employeePositions = [employee.primaryPosition, ...employee.secondaryPositions];
  if (employeePositions.includes(position)) return true;

  if (position === "cocina") {
    return employeePositions.includes("ayudante_cocina");
  }

  if (position === "sala" || position === "barra" || position === "terraza") {
    return employeePositions.includes("ayudante_camarero");
  }

  if (position === "ayudante_cocina") {
    return employeePositions.includes("cocina");
  }

  if (position === "ayudante_camarero") {
    return employeePositions.some((item) => item === "sala" || item === "barra" || item === "terraza");
  }

  return false;
}

function shiftStartsAtOpening(venue: VenueConfig, shift: ShiftTemplate): boolean {
  return venue.days[shift.day]?.opensAt === shift.start;
}

function shiftEndsAtClosing(venue: VenueConfig, shift: ShiftTemplate): boolean {
  return venue.days[shift.day]?.closesAt === shift.end;
}

function shiftFitsAvailability(employee: Employee, shift: ShiftTemplate): boolean {
  const availability = employee.availability?.[shift.day];
  if (!availability || availability.length === 0) return true;

  const shiftStart = timeToMinutes(shift.start);
  let shiftEnd = timeToMinutes(shift.end);
  if (shiftEnd <= shiftStart) shiftEnd += 24 * 60;

  return availability.some((window) => {
    const windowStart = timeToMinutes(window.start);
    let windowEnd = timeToMinutes(window.end);
    if (windowEnd <= windowStart) windowEnd += 24 * 60;
    return shiftStart >= windowStart && shiftEnd <= windowEnd;
  });
}

function getCriticalScore(shift: ShiftTemplate): number {
  if (shift.critical) return 100;
  if (shift.day === "friday" && shift.type === "cena") return 90;
  if (shift.day === "saturday" && shift.type === "cena") return 95;
  if (shift.day === "sunday") return 80;
  return 0;
}

function sortShiftsForGeneration(shifts: ShiftTemplate[]): ShiftTemplate[] {
  return [...shifts].sort((a, b) => {
    const criticalDelta = getCriticalScore(b) - getCriticalScore(a);
    if (criticalDelta !== 0) return criticalDelta;
    return timeToMinutes(a.start) - timeToMinutes(b.start);
  });
}

function hasOverlap(
  assignments: ScheduleAssignment[],
  employeeId: string,
  day: DayKey,
  shift: ShiftTemplate
): boolean {
  const start = timeToMinutes(shift.start);
  let end = timeToMinutes(shift.end);
  if (end <= start) end += 24 * 60;

  return assignments.some((assignment) => {
    if (assignment.employeeId !== employeeId || assignment.day !== day) return false;
    const assignmentStart = timeToMinutes(assignment.start);
    let assignmentEnd = timeToMinutes(assignment.end);
    if (assignmentEnd <= assignmentStart) assignmentEnd += 24 * 60;
    return start < assignmentEnd && assignmentStart < end;
  });
}

function canAssignEmployee(params: {
  employee: Employee;
  position: Position;
  shift: ShiftTemplate;
  venue: VenueConfig;
  assignments: ScheduleAssignment[];
  hoursByEmployee: HoursMap;
  dailyHoursByEmployee: DayHoursMap;
  allowWeeklyOverage?: boolean;
}): boolean {
  const {
    employee,
    position,
    shift,
    venue,
    assignments,
    hoursByEmployee,
    dailyHoursByEmployee,
    allowWeeklyOverage = false
  } = params;
  const duration = shiftDurationHours(shift.start, shift.end);
  const currentDailyHours = dailyHoursByEmployee[employee.id]?.[shift.day] ?? 0;

  if (employee.status === "inactive") return false;
  if (venue.days[shift.day].closed) return false;
  if (shift.type === "largo8h" && !venue.days[shift.day].longShiftEnabled) return false;
  if (employee.unavailableDays.includes(shift.day)) return false;
  if (!shiftFitsAvailability(employee, shift)) return false;
  if (!employeeSupportsPosition(employee, position)) return false;
  if (shift.type === "largo8h" && !employee.canWorkLongShift) return false;
  if (shiftStartsAtOpening(venue, shift) && !employee.canOpen) return false;
  if (shiftEndsAtClosing(venue, shift) && !employee.canClose) return false;
  if (currentDailyHours + duration > employee.maxHoursPerDay) return false;
  if (hasOverlap(assignments, employee.id, shift.day, shift)) return false;

  const projectedWeeklyHours = hoursByEmployee[employee.id] + duration;
  return allowWeeklyOverage || projectedWeeklyHours <= employee.contractedWeeklyHours;
}

function createConflict(
  shift: ShiftTemplate,
  position: Position,
  reason: string,
  suffix: number,
  missingWorkers = 1
): ScheduleConflict {
  return {
    id: `conflict-${shift.id}-${position}-${suffix}`,
    day: shift.day,
    shiftId: shift.id,
    shiftLabel: shift.label,
    position,
    missingWorkers,
    reason,
    severity: shift.critical ? "alta" : "media"
  };
}

function createAssignment(
  employee: Employee,
  shift: ShiftTemplate,
  position: Position
): ScheduleAssignment {
  return {
    id: `assignment-${shift.id}-${employee.id}-${position}`,
    employeeId: employee.id,
    employeeName: employee.name,
    day: shift.day,
    shiftId: shift.id,
    shiftType: shift.type,
    label: shift.label,
    start: shift.start,
    end: shift.end,
    position,
    hours: shiftDurationHours(shift.start, shift.end)
  };
}

function createUncoveredAssignment(
  shift: ShiftTemplate,
  position: Position,
  suffix: number
): ScheduleAssignment {
  return {
    id: `uncovered-${shift.id}-${position}-${suffix}`,
    employeeId: `uncovered-${shift.id}-${position}-${suffix}`,
    employeeName: "Sin cubrir",
    day: shift.day,
    shiftId: shift.id,
    shiftType: shift.type,
    label: shift.label,
    start: shift.start,
    end: shift.end,
    position,
    hours: shiftDurationHours(shift.start, shift.end),
    uncovered: true
  };
}

function getRequiredPositions(shift: ShiftTemplate): Position[] {
  const positions: Position[] = [];

  for (let index = 0; index < shift.minWorkers; index += 1) {
    positions.push(shift.positions[index % shift.positions.length]);
  }

  return positions;
}

function sortCandidates(
  candidates: Employee[],
  shift: ShiftTemplate,
  position: Position,
  hoursByEmployee: HoursMap
): Employee[] {
  return [...candidates].sort((a, b) => {
    const hoursDelta = hoursByEmployee[a.id] - hoursByEmployee[b.id];
    if (hoursDelta !== 0) return hoursDelta;

    const restPreferenceDelta =
      Number(a.preferredRestDays.includes(shift.day)) -
      Number(b.preferredRestDays.includes(shift.day));
    if (restPreferenceDelta !== 0) return restPreferenceDelta;

    const primaryPositionDelta =
      Number(b.primaryPosition === position) -
      Number(a.primaryPosition === position);
    if (primaryPositionDelta !== 0) return primaryPositionDelta;

    return a.name.localeCompare(b.name);
  });
}

export function generateWeeklySchedule(
  employees: Employee[],
  venue: VenueConfig
): GeneratedSchedule {
  const assignments: ScheduleAssignment[] = [];
  const conflicts: ScheduleConflict[] = [];
  const hoursByEmployee = Object.fromEntries(
    employees.map((employee) => [employee.id, 0])
  ) as HoursMap;
  const dailyHoursByEmployee = Object.fromEntries(
    employees.map((employee) => [employee.id, {}])
  ) as DayHoursMap;

  const activeShifts = sortShiftsForGeneration(
    venue.shifts.filter(
      (shift) =>
        !venue.days[shift.day].closed &&
        shift.enabled !== false &&
        (shift.type !== "largo8h" || venue.days[shift.day].longShiftEnabled)
    )
  );

  for (const shift of activeShifts) {
    const requiredPositions = getRequiredPositions(shift);

    for (let positionIndex = 0; positionIndex < requiredPositions.length; positionIndex += 1) {
      const position = requiredPositions[positionIndex];
      const strictCandidates = employees
        .filter((employee) =>
          canAssignEmployee({
            employee,
            position,
            shift,
            venue,
            assignments,
            hoursByEmployee,
            dailyHoursByEmployee
          })
        );
      const relaxedCandidates = strictCandidates.length
        ? strictCandidates
        : employees.filter((employee) =>
            canAssignEmployee({
              employee,
              position,
              shift,
              venue,
              assignments,
              hoursByEmployee,
              dailyHoursByEmployee,
              allowWeeklyOverage: true
            })
          );

      const selected = sortCandidates(
        relaxedCandidates,
        shift,
        position,
        hoursByEmployee
      )[0];

      if (!selected) {
        assignments.push(createUncoveredAssignment(shift, position, positionIndex));
        conflicts.push(
          createConflict(
            shift,
            position,
            `No hay trabajador compatible disponible para cubrir ${position}.`,
            positionIndex
          )
        );
        continue;
      }

      const assignment = createAssignment(selected, shift, position);
      assignments.push(assignment);
      hoursByEmployee[selected.id] += assignment.hours;
      dailyHoursByEmployee[selected.id][shift.day] =
        (dailyHoursByEmployee[selected.id][shift.day] ?? 0) + assignment.hours;
    }
  }

  const employeeHours: EmployeeHours[] = employees.map((employee) => ({
    employeeId: employee.id,
    employeeName: employee.name,
    contractedHours: employee.contractedWeeklyHours,
    assignedHours: hoursByEmployee[employee.id]
  }));

  return {
    assignments: assignments.sort((a, b) => {
      if (a.employeeName !== b.employeeName) {
        return a.employeeName.localeCompare(b.employeeName);
      }
      return timeToMinutes(a.start) - timeToMinutes(b.start);
    }),
    employeeHours,
    conflicts
  };
}
