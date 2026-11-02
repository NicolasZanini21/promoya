"use client";

import { useState } from "react";
import { WhatsappLink } from "@/components/WhatsappLink";
import type { Sucursal } from "@/types";

/**
 * Acceso a WhatsApp para comercios de barrio: si el comercio tiene una sola
 * boca, es el mismo botón directo de siempre (WhatsappLink). Si tiene
 * varias sucursales con WhatsApp propio (ej. "Bistecca Centro", "Bistecca
 * Alberdi" — ver tabla sucursal), muestra un desplegable para elegir a
 * cuál escribirle.
 */
export function SucursalesWhatsapp({
  nombreComercio,
  telefono,
  sucursales,
  className,
}: {
  nombreComercio: string;
  telefono: string | null;
  sucursales: Sucursal[];
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const conWhatsapp = sucursales.filter((s) => s.telefono);

  if (conWhatsapp.length === 0) {
    return <WhatsappLink telefono={telefono} nombreComercio={nombreComercio} className={className} />;
  }

  if (conWhatsapp.length === 1 && !telefono) {
    const s = conWhatsapp[0];
    return (
      <WhatsappLink
        telefono={s.telefono}
        nombreComercio={s.nombre ? `${nombreComercio} ${s.nombre}` : nombreComercio}
        className={className}
      />
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setAbierto((v) => !v)}
        className={
          className ??
          "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
        }
      >
        <span aria-hidden>💬</span> Elegí tu sucursal
      </button>
      {abierto && (
        <>
          {/* Backdrop para cerrar al tocar afuera, sin lógica extra de detección de click. */}
          <button
            aria-label="Cerrar"
            onClick={() => setAbierto(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute left-0 z-20 mt-1 min-w-[220px] rounded-xl border border-neutral-200 bg-white p-1.5 text-left shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            {conWhatsapp.map((s) => (
              <a
                key={s.id}
                href={`https://wa.me/${s.telefono}?text=${encodeURIComponent(
                  `Hola! Te escribo por la promo de ${nombreComercio}${s.nombre ? ` (${s.nombre})` : ""} en PromoYa.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg px-2.5 py-1.5 text-sm text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <span className="font-medium">{s.nombre ?? "Sucursal"}</span>
                {s.direccion && <span className="block text-xs text-neutral-400">{s.direccion}</span>}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
