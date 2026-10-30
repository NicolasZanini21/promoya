import Link from "next/link";
import { ComercioLogo } from "@/components/ComercioLogo";
import { IconCalendar, IconCard, IconChevronRight, IconPin } from "@/components/icons";
import { promoValidaHoy } from "@/lib/dias";
import { formatDiaMes } from "@/lib/fechas";
import { logoUrlComercio } from "@/lib/logo";
import { colorRubro } from "@/lib/rubro-colors";
import type { Promocion } from "@/types";

function formatDescuento(p: Promocion): string {
  if (p.descuentoPorcentaje != null) return `${p.descuentoPorcentaje}%`;
  if (p.descuentoMonto != null) return `$${p.descuentoMonto.toLocaleString("es-AR")}`;
  return "Promo";
}

/**
 * Tarjeta de promo: el mismo componente se usa en la grilla de escritorio
 * y en la lista vertical de celular (ver spec: Diseño para escritorio y celular).
 *
 * `vista` (opcional) ajusta qué cartelito mostrar para orientar al usuario:
 * en "semana" se prioriza el día de la semana; en "mes", el rango de fechas
 * (no tenemos "semana 1, semana 2" — el rango de fecha_detectada a fecha_fin
 * cumple la misma función).
 */
export function PromoCard({
  promo,
  vista,
}: {
  promo: Promocion;
  vista?: "hoy" | "semana" | "mes";
}) {
  const tieneDiasRestringidos = !!promo.diasValidos && promo.diasValidos.length > 0;
  const validaHoy = promoValidaHoy(promo.diasValidos);
  const rangoFechas = promo.fechaFin
    ? `${formatDiaMes(promo.fechaDetectada.slice(0, 10))} – ${formatDiaMes(promo.fechaFin)}`
    : null;
  const mostrarRango = vista === "mes" && rangoFechas;
  const mostrarDia = vista !== "mes" && tieneDiasRestringidos;

  return (
    <Link
      href={`/promo/${promo.id}`}
      className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colorRubro(
          promo.rubro
        )} text-base font-bold text-white shadow-sm`}
      >
        {formatDescuento(promo)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <ComercioLogo
            src={logoUrlComercio(promo.comercio.nombre, promo.fuenteUrl)}
            alt=""
            className="h-4 w-4 shrink-0 rounded-sm object-contain"
          />
          <p className="truncate font-medium text-neutral-900 dark:text-white">{promo.comercio.nombre}</p>
        </div>
        <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{promo.rubro.nombre}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
          {promo.metodoPagoRequerido && (
            <span className="inline-flex items-center gap-1">
              <IconCard className="h-3.5 w-3.5" /> {promo.metodoPagoRequerido.nombre}
            </span>
          )}
          {promo.distanciaKm != null && (
            <span className="inline-flex items-center gap-1">
              <IconPin className="h-3.5 w-3.5" /> {promo.distanciaKm.toFixed(1)} km
            </span>
          )}
          {mostrarDia && (
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-medium capitalize ${
                validaHoy
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {validaHoy ? "Válida hoy" : promo.diasValidos!.join(", ")}
            </span>
          )}
          {mostrarRango && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-1.5 py-0.5 font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <IconCalendar className="h-3 w-3" /> {rangoFechas}
            </span>
          )}
        </p>
      </div>
      <IconChevronRight className="h-5 w-5 shrink-0 text-neutral-300 dark:text-neutral-600" />
    </Link>
  );
}
