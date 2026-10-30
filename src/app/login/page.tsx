"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppState } from "@/lib/app-state";
import { createClient } from "@/lib/supabase/client";

type Modo = "login" | "signup";

/**
 * Login / registro con Supabase Auth (email + contraseña, sin costo).
 * En signup, además crea la fila en `usuario` con el nombre elegido.
 * El nombre real queda guardado tanto en Supabase (server) como en el
 * perfil local (para el saludo instantáneo) vía iniciarSesion().
 */
export default function LoginPage() {
  const router = useRouter();
  const { iniciarSesion } = useAppState();
  const [modo, setModo] = useState<Modo>("login");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const supabase = createClient();

    try {
      if (modo === "signup") {
        const { data, error: signErr } = await supabase.auth.signUp({ email, password });
        if (signErr) throw signErr;

        const user = data.user;
        if (!user) {
          // El proyecto tiene "Confirm email" activado: no hay sesión todavía.
          setError(
            "Te enviamos un email para confirmar la cuenta. Confirmala y después iniciá sesión."
          );
          setCargando(false);
          return;
        }

        const nombreLimpio = nombre.trim() || email.split("@")[0];
        const { error: upsertErr } = await supabase
          .from("usuario")
          .upsert(
            { auth_user_id: user.id, nombre: nombreLimpio, telefono_o_email: email },
            { onConflict: "auth_user_id" }
          );
        if (upsertErr) throw upsertErr;

        iniciarSesion(nombreLimpio);
      } else {
        const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signErr) throw signErr;

        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: usuarioRow } = await supabase
            .from("usuario")
            .select("nombre")
            .eq("auth_user_id", userData.user.id)
            .maybeSingle();
          iniciarSesion(usuarioRow?.nombre || email.split("@")[0]);
        }
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? traducirError(err.message)
          : "Algo salió mal. Probá de nuevo."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 px-3 py-1.5 text-sm font-semibold text-white">
          PromoYa
        </div>
        <h1 className="mb-1 text-lg font-semibold text-neutral-900 dark:text-white">
          {modo === "login" ? "Iniciá sesión" : "Creá tu cuenta"}
        </h1>
        <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">
          {modo === "login"
            ? "Para ver tus promos y tus preferencias."
            : "Es gratis, solo necesitás un email."}
        </p>

        {modo === "signup" && (
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            className="mb-3 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 outline-none focus:border-brand-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
          />
        )}
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="mb-3 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 outline-none focus:border-brand-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={modo === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="mb-4 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 outline-none focus:border-brand-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
        />

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 py-2.5 font-medium text-white disabled:opacity-40"
        >
          {cargando ? "Un momento…" : modo === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </button>

        <button
          type="button"
          onClick={() => {
            setModo(modo === "login" ? "signup" : "login");
            setError(null);
          }}
          className="mt-4 w-full text-center text-sm text-neutral-500 hover:text-brand-600 dark:text-neutral-400"
        >
          {modo === "login" ? "¿No tenés cuenta? Creá una" : "¿Ya tenés cuenta? Iniciá sesión"}
        </button>
      </form>
    </div>
  );
}

function traducirError(mensaje: string): string {
  if (mensaje.includes("Invalid login credentials")) return "Email o contraseña incorrectos.";
  if (mensaje.includes("User already registered")) return "Ya existe una cuenta con ese email.";
  if (mensaje.includes("Password should be at least")) return "La contraseña debe tener al menos 6 caracteres.";
  return mensaje;
}
