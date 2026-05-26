import type { DayKey, DemoState, ShiftTemplate } from "@/types";

const dayKeys: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

function isCritical(day: DayKey, type: ShiftTemplate["type"]) {
  return ((day === "friday" || day === "saturday") && type === "cena") || day === "sunday";
}

function createShifts(): ShiftTemplate[] {
  return dayKeys.flatMap((day) => {
    const lateClose = day === "friday" || day === "saturday";
    const shortSunday = day === "sunday";
    const templates: ShiftTemplate[] = [
      {
        id: `${day}-comida`,
        day,
        type: "comida",
        label: day === "sunday" ? "Domingo comida" : "Comida",
        start: "12:00",
        end: shortSunday ? "18:00" : lateClose ? "17:00" : "16:00",
        minWorkers: lateClose || shortSunday ? 4 : 3,
        positions: lateClose || shortSunday
          ? ["sala", "sala", "cocina", "cocina"]
          : ["sala", "sala", "cocina"]
      },
      {
        id: `${day}-tarde`,
        day,
        type: "tarde",
        label: "Tarde",
        start: "16:00",
        end: "20:00",
        minWorkers: 2,
        positions: ["sala", "cocina"]
      },
      {
        id: `${day}-cena`,
        day,
        type: "cena",
        label: "Cena",
        start: "20:00",
        end: lateClose ? "02:00" : "00:00",
        minWorkers: lateClose ? 4 : 3,
        positions: lateClose
          ? ["sala", "sala", "sala", "cocina"]
          : ["sala", "sala", "cocina"]
      },
      {
        id: `${day}-largo8h`,
        day,
        type: "largo8h",
        label: "Turno corrido",
        start: "12:00",
        end: "20:00",
        minWorkers: 2,
        positions: ["sala", "cocina"]
      }
    ];

    return templates.map((shift) => ({
      ...shift,
      enabled: false,
      critical: isCritical(day, shift.type)
    }));
  });
}

export const demoState: DemoState = {
  venue: {
    id: "venue-local",
    name: "",
    days: {
      monday: { day: "monday", closed: true, opensAt: "12:00", closesAt: "00:00", longShiftEnabled: false },
      tuesday: { day: "tuesday", closed: true, opensAt: "12:00", closesAt: "00:00", longShiftEnabled: false },
      wednesday: { day: "wednesday", closed: true, opensAt: "12:00", closesAt: "00:00", longShiftEnabled: false },
      thursday: { day: "thursday", closed: true, opensAt: "12:00", closesAt: "00:00", longShiftEnabled: false },
      friday: { day: "friday", closed: true, opensAt: "12:00", closesAt: "00:00", longShiftEnabled: false },
      saturday: { day: "saturday", closed: true, opensAt: "12:00", closesAt: "00:00", longShiftEnabled: false },
      sunday: { day: "sunday", closed: true, opensAt: "12:00", closesAt: "00:00", longShiftEnabled: false }
    },
    shifts: createShifts()
  },
  employees: []
};
