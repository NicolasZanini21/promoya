"use client";

import { useEffect, useMemo, useState } from "react";
import { Filters } from "@/components/Filters";
import { MobileFiltersDrawer } from "@/components/MobileFiltersDrawer";
import { PromoCard } from "@/components/PromoCard";
import { SaludoHeader } from "@/components/SaludoHeader";
import { useAppState } from "@/lib/app-state";
import { promoValidaEstaSemana, promoValidaHoy, promoVencida } from "@/lib/dias";
import { distanciaKm as calcularDistanciaKm } from "@/lib/geo";
import { fetchMetodosPago, fetchPromocionesActivas, fetchRubros } from "@/lib/promos";
import { createClient } from "@/lib/supabase/client";
import type { MetodoPago, OrdenPromos, Promocion, Rubro } from "@/types";

type Vista = "hoy" | "semana" | "mes";

const OPCIONES_VISTA: { value: Vista; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Todo el mes" },
];

/**
 * Inicio: en escritorio se ve como panel (filtros a la izquierda + grilla),
 * en celular como lista vertical con los filtros arriba en chips con scroll.
 * Mismo estado y mismos datos en los dos casos (spec: "Diseño para
 * escritorio y celular"). Los datos ahora salen de Supabase (ya no de
 * src/lib/mock-data.ts).
 */
export default function InicioPage() {
  const { perfil, listo } = useAppState();
  const [rubroId, setRubroId] = useState<string | null>(null);
  const [metodoId, setMetodoId] = useState<string | null>(null);
  const [orden, setOrden] = useState<OrdenPromos>("descuento");
  const [vista, setVista] = useState<Vista>("mes");

  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      fetchPromocionesActivas(supabase),
      fetchRubros(supabase),
      fetchMetodosPago(supabase),
    ]).then(([promos, rubrosData, metodos]) => {
      setPromociones(promos);
      setRubros(rubrosData);
      setMetodosPago(metodos);
      setCargando(false);
    });
  }, []);

  // Una vez que se carga el perfil guardado, arranca con el orden que el
  // usuario eligió como preferido en Perfil (si no tocó el selector de esta página).
  useEffect(() => {
    if (listo) setOrden(perfil.ordenPreferido);
  }, [listo, perfil.ordenPreferido]);

  const promos = useMemo(() => {
    let lista = promociones.filter((p) => !promoVencida(p.fechaFin));

    if (vista === "hoy") lista = lista.filter((p) => promoValidaHoy(p.diasValidos));
    else if (vista === "semana") lista = lista.filter((p) => promoValidaEstaSemana(p.diasValidos));

    lista = lista.map((p) => {
      if (perfil.ubicacionActiva && perfil.ubicacion && p.comercio.lat != null && p.comercio.lng != null) {
        return {
          ...p,
          distanciaKm: calcularDistanciaKm(perfil.ubicacion, { lat: p.comercio.lat, lng: p.comercio.lng }),
        };
      }
      return p;
    });

    if (rubroId) lista = lista.filter((p) => p.rubro.id === rubroId);
    if (metodoId) lista = lista.filter((p) => p.metodoPagoRequerido?.id === metodoId);

    return [...lista].sort((a, b) => {
      if (orden === "descuento") return (b.descuentoPorcentaje ?? 0) - (a.descuentoPorcentaje ?? 0);
      if (orden === "distancia") return (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity);
      // "frecuencia": primero las promos de rubros que el usuario sigue en
      // "Mis rubros" (la mejor aproximación que tenemos sin historial real
      // de uso), y dentro de cada grupo, por mayor descuento.
      const aSuscripto = perfil.rubrosSuscriptos.includes(a.rubro.id) ? 0 : 1;
      const bSuscripto = perfil.rubrosSuscriptos.includes(b.rubro.id) ? 0 : 1;
      if (aSuscripto !== bSuscripto) return aSuscripto - bSuscripto;
      return (b.descuentoPorcentaje ?? 0) - (a.descuentoPorcentaje ?? 0);
    });
  }, [promociones, rubroId, metodoId, orden, vista, perfil.ubicacionActiva, perfil.ubicacion, perfil.rubrosSuscriptos]);

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6 md:px-8 md:py-10">
      <aside className="hidden md:block md:w-56 md:shrink-0">
        <Filters
          rubros={rubros}
          metodosPago={metodosPago}
          rubroSeleccionado={rubroId}
          metodoSeleccionado={metodoId}
          orden={orden}
          onRubroChange={setRubroId}
          onMetodoChange={setMetodoId}
          onOrdenChange={setOrden}
        />
      </aside>

      <section className="flex-1">
        <div className="md:hidden">
          <SaludoHeader />
        </div>
        <div className="hidden md:block">
          <SaludoHeader />
        </div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="hidden text-2xl font-semibold md:block">Promos en Rosario</h1>
          <MobileFiltersDrawer
            rubros={rubros}
            metodosPago={metodosPago}
            rubroSeleccionado={rubroId}
            metodoSeleccionado={metodoId}
            orden={orden}
            onRubroChange={setRubroId}
            onMetodoChange={setMetodoId}
            onOrdenChange={setOrden}
          />
          <div className="flex gap-1 rounded-full border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
            {OPCIONES_VISTA.map((o) => (
              <button
                key={o.value}
                onClick={() => setVista(o.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  vista === o.value
                    ? "bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {cargando ? (
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900"
              />
            ))}
          </div>
        ) : promos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-neutral-400 dark:border-neutral-700">
            No hay promos activas con estos filtros todavía.
          </p>
        ) : (
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
            {promos.map((p) => (
              <PromoCard key={p.id} promo={p} vista={vista} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
