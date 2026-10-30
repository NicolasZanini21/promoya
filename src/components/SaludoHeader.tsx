"use client";

import { useAppState } from "@/lib/app-state";

/**
 * "Hola, {nombre}" la primera vez que se identifica; "Bienvenido de nuevo,
 * {nombre}" en visitas siguientes (ver spec: saludo personalizado).
 */
export function SaludoHeader() {
  const { perfil, saludoDeBienvenida } = useAppState();
  if (!perfil.nombre) return null;

  const saludo =
    saludoDeBienvenida === "nuevo"
      ? `Hola, ${perfil.nombre}`
      : `Bienvenido de nuevo, ${perfil.nombre}`;

  return (
    <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-accent-500 px-5 py-4 text-white shadow-sm">
      <p className="text-lg font-semibold">{saludo}</p>
      <p className="text-sm text-brand-50/90">Esto es lo que hay vigente hoy en Rosario.</p>
    </div>
  );
}
