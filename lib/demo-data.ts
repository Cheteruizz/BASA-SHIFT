import type { DayKey, DemoState, Employee, ShiftTemplate, VenueConfig } from "@/types";

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

function fullAvailability(days: DayKey[] = dayKeys) {
  return Object.fromEntries(days.map((day) => [day, []]));
}

function windows(entries: Partial<Record<DayKey, Array<{ start: string; end: string }>>>) {
  return entries;
}

function employee(data: Partial<Employee> & Pick<Employee, "id" | "name" | "phone" | "primaryPosition" | "contractedWeeklyHours">): Employee {
  return {
    employmentType: data.contractedWeeklyHours >= 35 ? "fullTime" : "partTime",
    secondaryPositions: [],
    maxHoursPerDay: 8,
    status: "active",
    acceptsSplitShift: true,
    unavailableDays: [],
    availabilityMode: {},
    availability: {},
    preferredWorkDays: [],
    preferredRestDays: [],
    canOpen: true,
    canClose: true,
    canWorkLongShift: true,
    ...data
  };
}

const fullDemoVenue: VenueConfig = {
  id: "venue-demo-corrala",
  name: "La Corrala Gastrobar",
  days: {
    monday: { day: "monday", closed: true, opensAt: "12:00", closesAt: "00:00", longShiftEnabled: false },
    tuesday: { day: "tuesday", closed: false, opensAt: "12:00", closesAt: "00:00", longShiftEnabled: true },
    wednesday: { day: "wednesday", closed: false, opensAt: "12:00", closesAt: "00:00", longShiftEnabled: true },
    thursday: { day: "thursday", closed: false, opensAt: "12:00", closesAt: "00:00", longShiftEnabled: true },
    friday: { day: "friday", closed: false, opensAt: "12:00", closesAt: "02:00", longShiftEnabled: true },
    saturday: { day: "saturday", closed: false, opensAt: "12:00", closesAt: "02:00", longShiftEnabled: true },
    sunday: { day: "sunday", closed: false, opensAt: "12:00", closesAt: "18:00", longShiftEnabled: false }
  },
  shifts: createShifts().map((shift) => {
    if (shift.day === "monday") return { ...shift, enabled: false };
    if (shift.type === "tarde") return { ...shift, enabled: false };
    if (shift.type === "largo8h") {
      return {
        ...shift,
        enabled: shift.day !== "sunday",
        minWorkers: shift.day === "friday" || shift.day === "saturday" ? 3 : 2,
        positions: shift.day === "friday" || shift.day === "saturday"
          ? ["sala", "cocina", "barra"]
          : ["sala", "cocina"]
      };
    }
    if (shift.type === "comida") {
      return {
        ...shift,
        enabled: true,
        minWorkers: shift.day === "friday" || shift.day === "saturday" || shift.day === "sunday" ? 5 : 4,
        positions: shift.day === "friday" || shift.day === "saturday" || shift.day === "sunday"
          ? ["sala", "sala", "cocina", "barra", "terraza"]
          : ["sala", "cocina", "barra", "terraza"]
      };
    }
    if (shift.type === "cena") {
      return {
        ...shift,
        enabled: shift.day !== "sunday",
        minWorkers: shift.day === "friday" || shift.day === "saturday" ? 6 : 4,
        positions: shift.day === "friday" || shift.day === "saturday"
          ? ["sala", "sala", "cocina", "cocina", "barra", "terraza"]
          : ["sala", "cocina", "barra", "terraza"]
      };
    }
    return shift;
  })
};

export const fullDemoState: DemoState = {
  venue: fullDemoVenue,
  employees: [
    employee({
      id: "demo-ana",
      name: "Ana Ruiz",
      phone: "34600111001",
      primaryPosition: "sala",
      secondaryPositions: ["barra", "terraza"],
      contractedWeeklyHours: 40,
      maxHoursPerDay: 8,
      canOpen: true,
      canClose: true,
      preferredWorkDays: ["tuesday", "wednesday", "thursday", "friday", "saturday"],
      availability: fullAvailability(["tuesday", "wednesday", "thursday", "friday", "saturday"])
    }),
    employee({
      id: "demo-luis",
      name: "Luis Martin",
      phone: "34600111002",
      primaryPosition: "barra",
      secondaryPositions: ["sala"],
      contractedWeeklyHours: 40,
      canOpen: false,
      canClose: true,
      preferredWorkDays: ["wednesday", "thursday", "friday", "saturday"],
      unavailableDays: ["tuesday"],
      availability: windows({
        wednesday: [{ start: "16:00", end: "00:00" }],
        thursday: [{ start: "16:00", end: "00:00" }],
        friday: [{ start: "18:00", end: "02:00" }],
        saturday: [{ start: "18:00", end: "02:00" }]
      })
    }),
    employee({
      id: "demo-marta",
      name: "Marta Lopez",
      phone: "34600111003",
      primaryPosition: "cocina",
      secondaryPositions: ["ayudante_cocina"],
      contractedWeeklyHours: 40,
      maxHoursPerDay: 9,
      canOpen: true,
      canClose: true,
      preferredWorkDays: ["tuesday", "wednesday", "thursday", "friday", "saturday"]
    }),
    employee({
      id: "demo-diego",
      name: "Diego Santos",
      phone: "34600111004",
      primaryPosition: "cocina",
      secondaryPositions: ["ayudante_cocina"],
      contractedWeeklyHours: 30,
      maxHoursPerDay: 7,
      canOpen: true,
      canClose: false,
      preferredWorkDays: ["tuesday", "wednesday", "thursday", "sunday"],
      availability: windows({
        tuesday: [{ start: "11:00", end: "18:00" }],
        wednesday: [{ start: "11:00", end: "18:00" }],
        thursday: [{ start: "11:00", end: "18:00" }],
        sunday: [{ start: "11:00", end: "18:00" }]
      })
    }),
    employee({
      id: "demo-paula",
      name: "Paula Garcia",
      phone: "34600111005",
      primaryPosition: "terraza",
      secondaryPositions: ["sala"],
      contractedWeeklyHours: 24,
      maxHoursPerDay: 6,
      canOpen: false,
      canClose: true,
      canWorkLongShift: false,
      preferredWorkDays: ["friday", "saturday", "sunday"],
      availability: windows({
        friday: [{ start: "18:00", end: "02:00" }],
        saturday: [{ start: "12:00", end: "02:00" }],
        sunday: [{ start: "12:00", end: "18:00" }]
      })
    }),
    employee({
      id: "demo-carlos",
      name: "Carlos Vega",
      phone: "34600111006",
      primaryPosition: "encargado",
      secondaryPositions: ["sala", "barra"],
      contractedWeeklyHours: 40,
      maxHoursPerDay: 9,
      canOpen: true,
      canClose: true,
      preferredWorkDays: ["tuesday", "thursday", "friday", "saturday", "sunday"]
    }),
    employee({
      id: "demo-nerea",
      name: "Nerea Costa",
      phone: "34600111007",
      primaryPosition: "ayudante_camarero",
      secondaryPositions: ["sala", "terraza"],
      contractedWeeklyHours: 20,
      maxHoursPerDay: 5,
      canOpen: false,
      canClose: true,
      canWorkLongShift: false,
      preferredWorkDays: ["friday", "saturday"],
      availability: windows({
        friday: [{ start: "20:00", end: "02:00" }],
        saturday: [{ start: "20:00", end: "02:00" }]
      })
    }),
    employee({
      id: "demo-ivan",
      name: "Ivan Torres",
      phone: "34600111008",
      primaryPosition: "ayudante_cocina",
      secondaryPositions: ["cocina"],
      contractedWeeklyHours: 20,
      maxHoursPerDay: 6,
      canOpen: true,
      canClose: false,
      canWorkLongShift: false,
      preferredWorkDays: ["tuesday", "friday", "saturday", "sunday"],
      availability: windows({
        tuesday: [{ start: "12:00", end: "17:00" }],
        friday: [{ start: "12:00", end: "18:00" }],
        saturday: [{ start: "12:00", end: "18:00" }],
        sunday: [{ start: "12:00", end: "18:00" }]
      })
    }),
    employee({
      id: "demo-sara",
      name: "Sara Molina",
      phone: "34600111009",
      primaryPosition: "mantenimiento",
      secondaryPositions: ["ayudante_camarero"],
      contractedWeeklyHours: 12,
      maxHoursPerDay: 4,
      canOpen: true,
      canClose: false,
      canWorkLongShift: false,
      preferredWorkDays: ["tuesday", "thursday", "saturday"],
      availability: windows({
        tuesday: [{ start: "10:00", end: "14:00" }],
        thursday: [{ start: "10:00", end: "14:00" }],
        saturday: [{ start: "10:00", end: "14:00" }]
      })
    })
  ]
};
