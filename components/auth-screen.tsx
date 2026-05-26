"use client";

import Image from "next/image";
import { useState } from "react";
import { useAppState } from "@/components/app-state";

export function AuthScreen() {
  const { signIn, signUp, signInWithGoogle } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    const result =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password);
    setLoading(false);
    if (result) setError(result);
  }

  async function googleSignIn() {
    setError(null);
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);
    if (result) setError(result);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-cyanx/20 bg-ink/90 p-6 brand-glow">
        <Image
          src="/basa-digital-logo.png"
          alt="BASA Digital"
          width={220}
          height={110}
          priority
          className="mx-auto h-auto w-56 rounded-md object-contain"
        />
        <div className="mt-6 text-center">
          <h1 className="brand-title text-2xl font-black text-snow">
            BASA Shift
          </h1>
          <p className="mt-2 text-sm text-cyanx">
            Acceso privado para duenos de bares
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-cyanx/20 bg-[#071B2F] px-4 py-3 text-snow outline-none placeholder:text-snow/45 focus:border-cyanx"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contrasena"
            className="w-full rounded-lg border border-cyanx/20 bg-[#071B2F] px-4 py-3 text-snow outline-none placeholder:text-snow/45 focus:border-cyanx"
          />
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
          <button
            type="button"
            disabled={loading || !email || !password}
            onClick={submit}
            className="w-full rounded-lg bg-electric px-4 py-3 text-sm font-black text-white shadow-lg shadow-electric/25 disabled:opacity-60"
          >
            {loading
              ? "Entrando..."
              : mode === "signin"
                ? "Entrar"
                : "Crear cuenta"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full rounded-lg border border-cyanx/25 px-4 py-3 text-sm font-bold text-cyanx"
          >
            {mode === "signin"
              ? "Crear cuenta nueva"
              : "Ya tengo cuenta"}
          </button>
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-cyanx/20" />
            <span className="text-xs font-bold text-snow/55">o</span>
            <div className="h-px flex-1 bg-cyanx/20" />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={googleSignIn}
            className="w-full rounded-lg border border-cyanx/25 px-4 py-3 text-sm font-bold text-snow"
          >
            Entrar con Google
          </button>
        </div>
      </section>
    </main>
  );
}
