"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { demoState } from "@/lib/demo-data";
import { generateWeeklySchedule } from "@/lib/schedule-generator";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type {
  Employee,
  GeneratedSchedule,
  ScheduleAssignment,
  VenueConfig
} from "@/types";
import type { User } from "@supabase/supabase-js";

interface AppStateContextValue {
  venue: VenueConfig;
  employees: Employee[];
  schedule: GeneratedSchedule;
  user: User | null;
  authLoading: boolean;
  workspaceLoading: boolean;
  persistenceMode: "supabase" | "local";
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  setVenue: (venue: VenueConfig) => void;
  setEmployees: (employees: Employee[]) => void;
  replaceSchedule: (schedule: GeneratedSchedule) => void;
  saveWorkspace: () => void;
  generateSchedule: () => void;
  clearSchedule: () => void;
  updateAssignment: (assignment: ScheduleAssignment) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);
const STORAGE_KEY = "basa-shift-chatbot-workspace-v1";
const OLD_STORAGE_KEYS = ["basa-shift-workspace"];

interface StoredWorkspace {
  venue: VenueConfig;
  employees: Employee[];
  schedule: GeneratedSchedule;
}

function normalizeEmployee(employee: Employee): Employee {
  return {
    ...employee,
    status: employee.status ?? "active",
    acceptsSplitShift: employee.acceptsSplitShift ?? true,
    availabilityMode: employee.availabilityMode ?? {},
    availability: employee.availability ?? {},
    secondaryPositions: employee.secondaryPositions ?? [],
    unavailableDays: employee.unavailableDays ?? [],
    preferredRestDays: employee.preferredRestDays ?? []
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [venue, setVenueState] = useState<VenueConfig>(demoState.venue);
  const [employees, setEmployeesState] = useState<Employee[]>(demoState.employees);
  const [schedule, setSchedule] = useState<GeneratedSchedule>(() =>
    generateWeeklySchedule(demoState.employees, demoState.venue)
  );
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const persistenceMode: "supabase" | "local" = isSupabaseConfigured
    ? "supabase"
    : "local";

  useEffect(() => {
    for (const key of OLD_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }

    if (isSupabaseConfigured) return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as StoredWorkspace;
      setVenueState(parsed.venue);
      setEmployeesState(parsed.employees.map(normalizeEmployee));
      setSchedule(parsed.schedule);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ venue, employees, schedule })
    );
  }, [venue, employees, schedule]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !user) return;

    setWorkspaceLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from("basa_workspaces")
        .select("venue, employees, schedule")
        .eq("owner_id", user.id)
        .maybeSingle();

        if (!error && data) {
          setVenueState(data.venue as VenueConfig);
          setEmployeesState((data.employees as Employee[]).map(normalizeEmployee));
          setSchedule(data.schedule as GeneratedSchedule);
        }
      setWorkspaceLoading(false);
    })();
  }, [user]);

  const saveWorkspace = useCallback(() => {
    if (supabase && user) {
      void supabase.from("basa_workspaces").upsert({
        owner_id: user.id,
        venue,
        employees,
        schedule,
        updated_at: new Date().toISOString()
      });
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ venue, employees, schedule })
    );
  }, [venue, employees, schedule, user]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Supabase no esta configurado.";

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Supabase no esta configurado.";

    const { error } = await supabase.auth.signUp({ email, password });
    return error?.message ?? null;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return "Supabase no esta configurado.";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const generateSchedule = useCallback(() => {
    setSchedule(generateWeeklySchedule(employees, venue));
  }, [employees, venue]);

  const setVenue = useCallback((nextVenue: VenueConfig) => {
    setVenueState(nextVenue);
    setSchedule(generateWeeklySchedule(employees, nextVenue));
  }, [employees]);

  const setEmployees = useCallback((nextEmployees: Employee[]) => {
    const normalized = nextEmployees.map(normalizeEmployee);
    setEmployeesState(normalized);
    setSchedule(generateWeeklySchedule(normalized, venue));
  }, [venue]);

  const replaceSchedule = useCallback((nextSchedule: GeneratedSchedule) => {
    setSchedule(nextSchedule);
  }, []);

  const clearSchedule = useCallback(() => {
    setSchedule({
      assignments: [],
      employeeHours: employees.map((employee) => ({
        employeeId: employee.id,
        employeeName: employee.name,
        contractedHours: employee.contractedWeeklyHours,
        assignedHours: 0
      })),
      conflicts: []
    });
  }, [employees]);

  const updateAssignment = useCallback((assignment: ScheduleAssignment) => {
    setSchedule((current) => {
      const assignments = current.assignments.map((item) =>
        item.id === assignment.id ? assignment : item
      );

      const employeeHours = employees.map((employee) => ({
        employeeId: employee.id,
        employeeName: employee.name,
        contractedHours: employee.contractedWeeklyHours,
        assignedHours: assignments
          .filter((item) => item.employeeId === employee.id)
          .reduce((total, item) => total + item.hours, 0)
      }));

      return { ...current, assignments, employeeHours };
    });
  }, [employees]);

  const value = useMemo(
    () => ({
      venue,
      employees,
      schedule,
      user,
      authLoading,
      workspaceLoading,
      persistenceMode,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      setVenue,
      setEmployees,
      replaceSchedule,
      saveWorkspace,
      generateSchedule,
      clearSchedule,
      updateAssignment
    }),
    [venue, employees, schedule, user, authLoading, workspaceLoading, persistenceMode, signIn, signUp, signInWithGoogle, signOut, setVenue, setEmployees, replaceSchedule, saveWorkspace, generateSchedule, clearSchedule, updateAssignment]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState debe usarse dentro de AppStateProvider");
  }
  return context;
}
