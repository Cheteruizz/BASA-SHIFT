import { DAYS } from "@/lib/constants";
import type { Employee, VenueConfig } from "@/types";

export function validateBeforeGenerate(venue: VenueConfig, employees: Employee[]) {
  const issues: string[] = [];
  const openDays = DAYS.filter((day) => !venue.days[day.key].closed);
  const activeEmployees = employees.filter((employee) => employee.status !== "inactive");
  const activeShifts = venue.shifts.filter(
    (shift) => !venue.days[shift.day].closed && shift.enabled !== false
  );

  if (!venue.name.trim()) issues.push("Falta el nombre del local.");
  if (!openDays.length) issues.push("Marca al menos un dia abierto.");
  if (!activeShifts.length) issues.push("Activa al menos una franja de trabajo.");
  if (!activeEmployees.length) issues.push("Anade al menos un trabajador activo.");
  if (!activeEmployees.some((employee) => employee.canOpen)) {
    issues.push("Ningun trabajador puede abrir.");
  }
  if (!activeEmployees.some((employee) => employee.canClose)) {
    issues.push("Ningun trabajador puede cerrar.");
  }

  return issues;
}
