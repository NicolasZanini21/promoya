import type { SupabaseClient } from "@supabase/supabase-js";
import type { Comercio, MetodoPago, Promocion, Rubro } from "@/types";

// Consultas a Supabase que arman los tipos de @/types a partir de las
// tablas reales (promocion + comercio + rubro + metodo_pago). Se usan tanto
// desde componentes de cliente (navegador) como desde Server Components —
// por eso reciben el cliente de Supabase como parámetro en vez de crearlo
// ellas mismas.

interface ComercioRow {
  id: string;
  nombre: string;
  rubro_id: string;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  rubro: { id: string; nombre: string } | null;
}

interface PromocionRow {
  id: string;
  descuento_porcentaje: number | null;
  descuento_monto: number | null;
  condiciones: string | null;
  tope_reintegro: number | null;
  dias_validos: string[] | null;
  fecha_detectada: string;
  fecha_fin: string | null;
  activa: boolean;
  fuente_url: string | null;
  comercio: ComercioRow | null;
  metodo_pago_requerido: { id: string; nombre: string } | null;
}

const SELECT_PROMOCION = `
  id, descuento_porcentaje, descuento_monto, condiciones, tope_reintegro,
  dias_validos, fecha_detectada, fecha_fin, activa, fuente_url,
  comercio:comercio_id ( id, nombre, rubro_id, direccion, lat, lng,
    rubro:rubro_id ( id, nombre ) ),
  metodo_pago_requerido:metodo_pago_requerido_id ( id, nombre )
`;

function mapPromocion(row: PromocionRow): Promocion | null {
  // Si el comercio o el rubro no se pudieron resolver (dato inconsistente),
  // se descarta en vez de mostrar una tarjeta rota.
  if (!row.comercio || !row.comercio.rubro) return null;

  const comercio: Comercio = {
    id: row.comercio.id,
    nombre: row.comercio.nombre,
    rubroId: row.comercio.rubro_id,
    direccion: row.comercio.direccion,
    lat: row.comercio.lat,
    lng: row.comercio.lng,
  };
  const rubro: Rubro = row.comercio.rubro;

  return {
    id: row.id,
    comercioId: comercio.id,
    comercio,
    rubro,
    descuentoPorcentaje: row.descuento_porcentaje,
    descuentoMonto: row.descuento_monto,
    condiciones: row.condiciones,
    topeReintegro: row.tope_reintegro,
    diasValidos: row.dias_validos,
    metodoPagoRequerido: row.metodo_pago_requerido,
    fechaDetectada: row.fecha_detectada,
    fechaFin: row.fecha_fin,
    activa: row.activa,
    distanciaKm: null,
    fuenteUrl: row.fuente_url,
  };
}

export async function fetchPromocionesActivas(
  supabase: SupabaseClient
): Promise<Promocion[]> {
  const { data, error } = await supabase
    .from("promocion")
    .select(SELECT_PROMOCION)
    .eq("activa", true)
    .order("fecha_detectada", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as PromocionRow[])
    .map(mapPromocion)
    .filter((p): p is Promocion => p !== null);
}

export async function fetchPromocionPorId(
  supabase: SupabaseClient,
  id: string
): Promise<Promocion | null> {
  const { data, error } = await supabase
    .from("promocion")
    .select(SELECT_PROMOCION)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapPromocion(data as unknown as PromocionRow);
}

export async function fetchRubros(supabase: SupabaseClient): Promise<Rubro[]> {
  const { data, error } = await supabase.from("rubro").select("id, nombre").order("nombre");
  if (error || !data) return [];
  return data;
}

export async function fetchMetodosPago(
  supabase: SupabaseClient
): Promise<MetodoPago[]> {
  const { data, error } = await supabase
    .from("metodo_pago")
    .select("id, nombre")
    .order("nombre");
  if (error || !data) return [];
  return data;
}
