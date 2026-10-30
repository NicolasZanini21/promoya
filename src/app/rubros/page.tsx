"use client";

import { useEffect, useState } from "react";
import { IconTag } from "@/components/icons";
import { useAppState } from "@/lib/app-state";
import { fetchRubros } from "@/lib/promos";
import { createClient } from "@/lib/supabase/client";
import type { Rubro } from "@/types";

/**
 * Historia de usuario: "quiero elegir los rubros que me interesan" — define
 * en qué rubros recibe notificación push cuando aparece una promo nueva, y
 * también se usa en Perfil para ordenar por "rubros que frecuento".
 * TODO: persistir en suscripcion_rubro vía Supabase (hoy en localStorage).
 */
export default function RubrosPage() {
  const { perfil, actualizarPerfil } = useAppState();
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetchRubros(createClient()).then((data) => {
      setRubros(data);
      setCargando(false);
    });
  }, []);

  function toggle(id: string) {
    const siguiente = perfil.rubrosSuscriptos.includes(id)
      ? perfil.rubrosSuscriptos.filter((x) => x !== id)
      : [...perfil.rubrosSuscriptos, id];
    actualizarPerfil({ rubrosSuscriptos: siguiente });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <h1 className="mb-1 text-xl font-semibold md:text-2xl">Mis rubros</h1>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        Te avisamos por notificación cuando aparece una promo nueva en estos rubros.
      </p>

      <div className="flex flex-col gap-2">
        {cargando
          ? [...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900"
              />
            ))
          : rubros.map((r) => {
              const activo = perfil.rubrosSuscriptos.includes(r.id);
              return (
                <label
                  key={r.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${
                    activo
                      ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/30"
                      : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                  }`}
                >
                  <span className="flex items-center gap-2.5 font-medium text-neutral-800 dark:text-neutral-100">
                    <IconTag className={`h-4 w-4 ${activo ? "text-brand-600" : "text-neutral-400"}`} />
                    {r.nombre}
                  </span>
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={() => toggle(r.id)}
                    className="h-5 w-5 accent-brand-600"
                  />
                </label>
              );
            })}
      </div>
    </div>
  );
}
