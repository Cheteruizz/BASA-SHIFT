"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AppStateProvider } from "@/components/app-state";
import { AuthGate } from "@/components/auth-gate";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <AuthGate>
        <div className="mx-auto max-w-7xl">
          <nav className="mb-4 flex flex-wrap gap-2 rounded-lg border border-cyanx/15 bg-ink/80 p-2">
            <NavLink href="/assistant">Chat IA</NavLink>
            <NavLink href="/settings">Bar</NavLink>
            <NavLink href="/employees">Plantilla</NavLink>
            <NavLink href="/schedule">Cuadrante</NavLink>
          </nav>
          {children}
        </div>
      </AuthGate>
    </AppStateProvider>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-bold text-snow hover:bg-electric"
    >
      {children}
    </Link>
  );
}
