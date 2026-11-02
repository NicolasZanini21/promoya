import Link from "next/link";
import { notFound } from "next/navigation";
import { ComercioLogo } from "@/components/ComercioLogo";
import { IconArrowLeft, IconPin } from "@/components/icons";
import { SucursalesWhatsapp } from "@/components/SucursalesWhatsapp";
import { formatDiaMes } from "@/lib/fechas";
import { logosComercio } from "@/lib/logo";
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
                srcs={logosComercio(promo.comercio.nombre, promo.fuenteUrl)}
                nombre={promo.comercio.nombre}
                className="h-5 w-5 rounded-sm bg-white/90 object-contain p-0.5 text-[11px]"
              />
              {promo.comercio.nombre}
            </h1>
            <p className="text-sm text-white/80">{promo.rubro.nombre}</p>
            <SucursalesWhatsapp
              telefono={promo.comercio.telefono}
              sucursales={promo.comercio.sucursales}
              nombreComercio={promo.comercio.nombre}
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium"
            />
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
          {promo.comercio.sucursales.length > 0 ? (
            <div>
              <dt className="text-neutral-400">Sucursales</dt>
              <dd className="mt-1 flex flex-col gap-1.5">
                {promo.comercio.sucursales.map((s) => (
                  <div key={s.id} className="flex items-start gap-1.5 text-neutral-800 dark:text-neutral-100">
                    <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                    <span>
                      {s.nombre && <span className="font-medium">{s.nombre}: </span>}
                      {s.direccion ?? "Dirección no informada"}
                    </span>
                  </div>
                ))}
              </dd>
            </div>
          ) : (
            promo.comercio.direccion && (
              <div>
                <dt className="text-neutral-400">Dónde queda</dt>
                <dd className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-100">
                  <IconPin className="h-4 w-4 shrink-0 text-neutral-400" />
                  {promo.comercio.direccion}
                  {promo.distanciaKm != null && ` · ${promo.distanciaKm.toFixed(1)} km de tu ubicación`}
                </dd>
              </div>
            )
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
