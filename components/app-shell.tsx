"use client";

import type { ReactNode } from "react";
import { AppStateProvider } from "@/components/app-state";
import { AuthGate } from "@/components/auth-gate";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <AuthGate>{children}</AuthGate>
    </AppStateProvider>
  );
}
