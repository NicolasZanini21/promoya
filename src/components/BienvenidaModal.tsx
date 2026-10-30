"use client";

import { useState } from "react";
import { useAppState } from "@/lib/app-state";

/**
 * Identificación liviana: pide el nombre una sola vez (se guarda en este
 * dispositivo) para poder saludar de forma personalizada. Es un paso previo
 * a un login real — cuando se conecte Supabase Auth, este mismo nombre puede
 * precargarse desde la tabla `usuario` en lugar de localStorage.
 */
export function BienvenidaModal() {
  const { perfil, listo, iniciarSesion } = useAppState();
  const [nombre, setNombre] = useState("");

  if (!listo || perfil.nombre) return null;

  function confirmar() {
    const limpio = nombre.trim();
    if (!limpio) return;
    iniciarSesion(limpio);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/50 p-4 md:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800">
        <div className="mb-3 inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 px-3 py-1.5 text-sm font-semibold text-white">
          PromoYa
        </div>
        <h2 className="mb-1 text-lg font-semibold text-neutral-900 dark:text-white">
          ¿Cómo te llamás?
        </h2>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          Así te saludamos cada vez que abrís la app.
        </p>
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirmar()}
          placeholder="Tu nombre"
          className="mb-4 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 outline-none focus:border-brand-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
        />
        <button
          onClick={confirmar}
          disabled={!nombre.trim()}
          className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 py-2.5 font-medium text-white disabled:opacity-40"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
