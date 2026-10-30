"use client";

import { useEffect, useState } from "react";
import { Filters } from "@/components/Filters";
import { IconFilter, IconX } from "@/components/icons";
import type { MetodoPago, OrdenPromos, Rubro } from "@/types";

interface Props {
  rubros: Rubro[];
  metodosPago: MetodoPago[];
  rubroSeleccionado: string | null;
  metodoSeleccionado: string | null;
  orden: OrdenPromos;
  onRubroChange: (id: string | null) => void;
  onMetodoChange: (id: string | null) => void;
  onOrdenChange: (orden: OrdenPromos) => void;
}

/**
 * Reemplaza, en celular, a la fila de chips con scroll horizontal: un botón
 * "Filtros" que abre un panel deslizable desde la izquierda con los mismos
 * filtros en lista vertical (sin tener que desplazarse de un lado a otro
 * para encontrar un rubro). En escritorio no se usa — ahí los filtros van
 * siempre visibles en el panel lateral (ver page.tsx).
 */
export function MobileFiltersDrawer({
  rubros,
  metodosPago,
  rubroSeleccionado,
  metodoSeleccionado,
  orden,
  onRubroChange,
  onMetodoChange,
  onOrdenChange,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const hayFiltrosActivos = rubroSeleccionado !== null || metodoSeleccionado !== null;

  // Evita que la página de atrás scrollee mientras el panel está abierto.
  useEffect(() => {
    if (!abierto) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [abierto]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setAbierto(true)}
        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
          hayFiltrosActivos
            ? "border-transparent bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-sm"
            : "border-neutral-200 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
        }`}
      >
        <IconFilter className="h-4 w-4" />
        Filtros
        {hayFiltrosActivos && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Cerrar filtros"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-neutral-900/50"
          />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-white shadow-xl dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Filtros</h2>
              <button
                onClick={() => setAbierto(false)}
                className="rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <Filters
                rubros={rubros}
                metodosPago={metodosPago}
                rubroSeleccionado={rubroSeleccionado}
                metodoSeleccionado={metodoSeleccionado}
                orden={orden}
                onRubroChange={onRubroChange}
                onMetodoChange={onMetodoChange}
                onOrdenChange={onOrdenChange}
                vertical
              />
            </div>
            <div className="border-t border-neutral-100 px-5 py-4 dark:border-neutral-800">
              <button
                onClick={() => setAbierto(false)}
                className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 py-2.5 font-medium text-white"
              >
                Ver promos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
