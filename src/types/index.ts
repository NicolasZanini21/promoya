// Tipos del modelo de datos (ver spec: Modelo de datos)

export interface Rubro {
  id: string;
  nombre: string;
}

export interface Comercio {
  id: string;
  nombre: string;
  rubroId: string;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
}

export interface MetodoPago {
  id: string;
  nombre: string;
}

export interface Promocion {
  id: string;
  comercioId: string;
  comercio: Comercio;
  rubro: Rubro;
  descuentoPorcentaje: number | null;
  descuentoMonto: number | null;
  condiciones: string | null;
  topeReintegro: number | null;
  diasValidos: string[] | null;
  metodoPagoRequerido: MetodoPago | null;
  fechaDetectada: string;
  fechaFin: string | null;
  activa: boolean;
  /** distancia en km al usuario, calculada en el cliente; null si no hay ubicación */
  distanciaKm: number | null;
  /** página donde el bot encontró la promo; se usa también para el logo del comercio */
  fuenteUrl: string | null;
}

export interface UsuarioPreferencias {
  rubrosSuscriptos: string[]; // ids de Rubro
  metodosPago: string[]; // ids de MetodoPago
  barrio: string | null;
  ubicacion: { lat: number; lng: number } | null;
}

export type OrdenPromos = "descuento" | "distancia" | "frecuencia";
