export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function shiftDurationHours(start: string, end: string): number {
  const startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return Number(((endMinutes - startMinutes) / 60).toFixed(2));
}

export function formatHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1).replace(".", ",");
}
