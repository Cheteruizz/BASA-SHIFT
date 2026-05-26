"use client";

import Image from "next/image";
import { ChatAssistant } from "@/components/chat-assistant";
import { useAppState } from "@/components/app-state";

export default function AssistantPage() {
  const { user, signOut, persistenceMode } = useAppState();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col">
      <header className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-cyanx/20 bg-ink/90 px-4 py-3 brand-glow">
        <div className="flex items-center gap-3">
          <Image src="/basa-digital-logo.png" alt="BASA Digital" width={150} height={75} priority className="h-14 w-auto rounded-md object-contain" />
          <div>
            <h1 className="brand-title text-xl font-black text-snow">BASA Shift</h1>
            <p className="text-sm text-cyanx">Tecnologia que impulsa tu negocio</p>
          </div>
        </div>
        <div className="hidden rounded-full border border-cyanx/35 bg-cyanx/10 px-3 py-1 text-xs font-bold text-cyanx sm:block">
          {persistenceMode === "supabase" ? user?.email ?? "Cuenta" : "Modo local"}
        </div>
        {user && (
          <button
            type="button"
            onClick={signOut}
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-snow/80"
          >
            Salir
          </button>
        )}
      </header>
      <ChatAssistant />
    </div>
  );
}
