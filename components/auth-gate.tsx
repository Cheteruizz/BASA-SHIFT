"use client";

import type { ReactNode } from "react";
import { AuthScreen } from "@/components/auth-screen";
import { useAppState } from "@/components/app-state";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, authLoading, workspaceLoading, persistenceMode } = useAppState();

  if (persistenceMode === "supabase") {
    if (authLoading || workspaceLoading) {
      return (
        <main className="flex min-h-screen items-center justify-center text-snow">
          Cargando BASA Shift...
        </main>
      );
    }

    if (!user) return <AuthScreen />;
  }

  return (
    <main className="min-h-screen px-3 py-3 sm:px-5 sm:py-5">
      {children}
    </main>
  );
}
