import type { Comercio, MetodoPago, Promocion, Rubro } from "@/types";

// Datos de muestra para desarrollar la UI antes de conectar el job real y
// Supabase. Las direcciones son orientativas (avenidas y zonas reales de
// Rosario), no la ubicación exacta verificada de cada local — eso lo va a
// resolver la búsqueda real del job diario.

export const RUBROS: Rubro[] = [
  { id: "r1", nombre: "Supermercados" },
  { id: "r2", nombre: "Indumentaria" },
  { id: "r3", nombre: "Gastronomía" },
];

export const METODOS_PAGO: MetodoPago[] = [
  { id: "m1", nombre: "Banco Santa Fe" },
  { id: "m2", nombre: "Mercado Pago" },
  { id: "m3", nombre: "Banco Nación" },
  { id: "m4", nombre: "Efectivo" },
];

const COMERCIOS: Comercio[] = [
  { id: "c1", nombre: "Carrefour Pellegrini", rubroId: "r1", direccion: "Av. Pellegrini al 1500, Rosario", lat: -32.9477, lng: -60.6573 },
  { id: "c2", nombre: "Día % Alberdi", rubroId: "r1", direccion: "Av. Alberdi al 2200, Rosario", lat: -32.9245, lng: -60.6612 },
  { id: "c3", nombre: "Vea Echesortu", rubroId: "r1", direccion: "Av. Francia al 1600, Rosario", lat: -32.9336, lng: -60.6702 },
  { id: "c4", nombre: "Portsaid Rosario", rubroId: "r2", direccion: "San Martín al 850, peatonal", lat: -32.9412, lng: -60.6505 },
  { id: "c5", nombre: "Taverniti Alto Rosario", rubroId: "r2", direccion: "Av. Junín al 501, Alto Rosario", lat: -32.9268, lng: -60.6495 },
  { id: "c6", nombre: "La Montada Resto Bar", rubroId: "r3", direccion: "Bv. Oroño al 1100, Rosario", lat: -32.9529, lng: -60.6498 },
  { id: "c7", nombre: "Davis Resto", rubroId: "r3", direccion: "Av. de la Costa al 900, Rosario", lat: -32.9381, lng: -60.6389 },
];

export const PROMOCIONES: Promocion[] = [
  {
    id: "p1",
    comercioId: "c1",
    comercio: COMERCIOS[0],
    rubro: RUBROS[0],
    descuentoPorcentaje: 25,
    descuentoMonto: null,
    condiciones: "25% de descuento pagando con Banco Santa Fe, válido los miércoles",
    topeReintegro: 5000,
    diasValidos: ["miércoles"],
    metodoPagoRequerido: METODOS_PAGO[0],
    fechaDetectada: "2026-10-30",
    fechaFin: "2026-12-31",
    activa: true,
    distanciaKm: 1.2,
  },
  {
    id: "p2",
    comercioId: "c2",
    comercio: COMERCIOS[1],
    rubro: RUBROS[0],
    descuentoPorcentaje: 15,
    descuentoMonto: null,
    condiciones: "15% de descuento pagando con Mercado Pago, todos los días",
    topeReintegro: null,
    diasValidos: null,
    metodoPagoRequerido: METODOS_PAGO[1],
    fechaDetectada: "2026-10-30",
    fechaFin: "2026-11-30",
    activa: true,
    distanciaKm: 3.8,
  },
  {
    id: "p3",
    comercioId: "c3",
    comercio: COMERCIOS[2],
    rubro: RUBROS[0],
    descuentoPorcentaje: 10,
    descuentoMonto: null,
    condiciones: "10% de descuento en efectivo, de lunes a viernes",
    topeReintegro: 3000,
    diasValidos: ["lunes", "martes", "miércoles", "jueves", "viernes"],
    metodoPagoRequerido: METODOS_PAGO[3],
    fechaDetectada: "2026-10-27",
    fechaFin: "2026-11-10",
    activa: true,
    distanciaKm: 2.6,
  },
  {
    id: "p4",
    comercioId: "c4",
    comercio: COMERCIOS[3],
    rubro: RUBROS[1],
    descuentoPorcentaje: 30,
    descuentoMonto: null,
    condiciones: "30% de descuento en la segunda prenda de la misma compra",
    topeReintegro: null,
    diasValidos: null,
    metodoPagoRequerido: null,
    fechaDetectada: "2026-10-29",
    fechaFin: "2026-11-15",
    activa: true,
    distanciaKm: 2.1,
  },
  {
    id: "p5",
    comercioId: "c5",
    comercio: COMERCIOS[4],
    rubro: RUBROS[1],
    descuentoPorcentaje: 20,
    descuentoMonto: null,
    condiciones: "20% de descuento pagando con Banco Nación, fin de semana",
    topeReintegro: 8000,
    diasValidos: ["sábado", "domingo"],
    metodoPagoRequerido: METODOS_PAGO[2],
    fechaDetectada: "2026-10-28",
    fechaFin: "2026-11-20",
    activa: true,
    distanciaKm: 4.4,
  },
  {
    id: "p6",
    comercioId: "c6",
    comercio: COMERCIOS[5],
    rubro: RUBROS[2],
    descuentoPorcentaje: null,
    descuentoMonto: 2000,
    condiciones: "$2.000 de reintegro en cenas de más de $15.000 pagando con Banco Nación",
    topeReintegro: 2000,
    diasValidos: ["viernes", "sábado"],
    metodoPagoRequerido: METODOS_PAGO[2],
    fechaDetectada: "2026-10-28",
    fechaFin: "2026-11-30",
    activa: true,
    distanciaKm: 0.6,
  },
  {
    id: "p7",
    comercioId: "c7",
    comercio: COMERCIOS[6],
    rubro: RUBROS[2],
    descuentoPorcentaje: 20,
    descuentoMonto: null,
    condiciones: "20% de descuento pagando con Mercado Pago, almuerzo de lunes a viernes",
    topeReintegro: 4000,
    diasValidos: ["lunes", "martes", "miércoles", "jueves", "viernes"],
    metodoPagoRequerido: METODOS_PAGO[1],
    fechaDetectada: "2026-10-30",
    fechaFin: "2026-12-15",
    activa: true,
    distanciaKm: 5.1,
  },
];

export function ordenarPorDescuento(promos: Promocion[]): Promocion[] {
  return [...promos].sort((a, b) => {
    const pa = a.descuentoPorcentaje ?? 0;
    const pb = b.descuentoPorcentaje ?? 0;
    return pb - pa;
  });
}
