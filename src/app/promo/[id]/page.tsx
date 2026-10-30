import Link from "next/link";
import { notFound } from "next/navigation";
import { ComercioLogo } from "@/components/ComercioLogo";
import { IconArrowLeft, IconPin } from "@/components/icons";
import { formatDiaMes } from "@/lib/fechas";
import { logoUrlComercio } from "@/lib/logo";
import { fetchPromocionPorId } from "@/lib/promos";
import { colorRubro } from "@/lib/rubro-colors";
import { createClient } from "@/lib/supabase/server";

/**
 * Detalle de una promo. En celular ocupa toda la pantalla (con botón volver);
 * en escritorio puede abrirse igual como esta página o, más adelante, como
 * panel lateral sin tapar la grilla — el contenido es el mismo en los dos casos.
 */
export default async function PromoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const promo = await fetchPromocionPorId(supabase, id);
  if (!promo) notFound();

  const descuento =
    promo.descuentoPorcentaje != null
      ? `${promo.descuentoPorcentaje}%`
      : promo.descuentoMonto != null
      ? `$${promo.descuentoMonto.toLocaleString("es-AR")}`
      : "—";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-300"
      >
        <IconArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className={`flex items-center gap-4 bg-gradient-to-r ${colorRubro(promo.rubro)} px-6 py-6 text-white`}>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xl font-bold">
            {descuento}
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <ComercioLogo
                src={logoUrlComercio(promo.comercio.nombre, promo.fuenteUrl)}
                alt=""
                className="h-5 w-5 rounded-sm bg-white/90 object-contain p-0.5"
              />
              {promo.comercio.nombre}
            </h1>
            <p className="text-sm text-white/80">{promo.rubro.nombre}</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-4 p-6 text-sm">
          <div>
            <dt className="text-neutral-400">Condiciones</dt>
            <dd className="text-neutral-800 dark:text-neutral-100">
              {promo.condiciones ?? "Sin condiciones informadas"}
            </dd>
          </div>
          {promo.metodoPagoRequerido && (
            <div>
              <dt className="text-neutral-400">Método de pago requerido</dt>
              <dd className="text-neutral-800 dark:text-neutral-100">{promo.metodoPagoRequerido.nombre}</dd>
            </div>
          )}
          {promo.topeReintegro != null && (
            <div>
              <dt className="text-neutral-400">Tope de reintegro</dt>
              <dd className="text-neutral-800 dark:text-neutral-100">
                ${promo.topeReintegro.toLocaleString("es-AR")}
              </dd>
            </div>
          )}
          {promo.diasValidos && (
            <div>
              <dt className="text-neutral-400">Días válidos</dt>
              <dd className="text-neutral-800 capitalize dark:text-neutral-100">
                {promo.diasValidos.join(", ")}
              </dd>
            </div>
          )}
          {promo.comercio.direccion && (
            <div>
              <dt className="text-neutral-400">Dónde queda</dt>
              <dd className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-100">
                <IconPin className="h-4 w-4 shrink-0 text-neutral-400" />
                {promo.comercio.direccion}
                {promo.distanciaKm != null && ` · ${promo.distanciaKm.toFixed(1)} km de tu ubicación`}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-neutral-400">Vigencia</dt>
            <dd className="text-neutral-800 dark:text-neutral-100">
              {promo.fechaFin ? `Vigente hasta el ${formatDiaMes(promo.fechaFin)}` : "Sin fecha de fin informada"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
