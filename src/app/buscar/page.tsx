"use client";

import { useEffect, useState } from "react";
import { PromoCard } from "@/components/PromoCard";
import { fetchPromocionesActivas, fetchRubros } from "@/lib/promos";
import { createClient } from "@/lib/supabase/client";
import { ordenarPorDescuento } from "@/lib/mock-data";
import type { Promocion, Rubro } from "@/types";

/**
 * Historia de usuario: "quiero consultar promos de un rubro cuando se me
 * ocurra" (consulta on-demand, distinta del flujo de notificación diaria).
 */
export default function BuscarPage() {
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [rubroId, setRubroId] = useState<string | null>(null);
  const [buscado, setBuscado] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([fetchRubros(supabase), fetchPromocionesActivas(supabase)]).then(
      ([rubrosData, promos]) => {
        setRubros(rubrosData);
        setPromociones(promos);
        setCargando(false);
      }
    );
  }, []);

  const resultados = rubroId
    ? ordenarPorDescuento(promociones.filter((p) => p.activa && p.rubro.id === rubroId))
    : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <h1 className="mb-1 text-xl font-semibold md:text-2xl">Buscar promos</h1>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        Elegí un rubro para ver qué hay vigente ahora.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {cargando
          ? [...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-9 w-24 animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-900"
              />
            ))
          : rubros.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRubroId(r.id);
                  setBuscado(true);
                }}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  rubroId === r.id
                    ? "border-transparent bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-sm"
                    : "border-neutral-200 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                }`}
              >
                {r.nombre}
              </button>
            ))}
      </div>

      {!cargando && !buscado && (
        <p className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-neutral-400 dark:border-neutral-700">
          Elegí un rubro arriba para empezar.
        </p>
      )}

      {buscado && resultados.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-neutral-400 dark:border-neutral-700">
          No hay promos vigentes en ese rubro por ahora.
        </p>
      )}

      {resultados.length > 0 && (
        <div className="flex flex-col gap-3">
          {resultados.map((p) => (
            <PromoCard key={p.id} promo={p} />
          ))}
        </div>
      )}
    </div>
  );
}
