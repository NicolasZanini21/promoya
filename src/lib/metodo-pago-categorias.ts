/**
 * Agrupa los métodos de pago (texto libre que guarda el bot, a veces un
 * combo largo tipo "Banco Macro, Banco Ciudad, Banco Comafi...") en un
 * puñado de categorías generales, para no mostrar decenas de chips sueltos
 * en el filtro (ver spec: "Diseño para escritorio y celular").
 *
 * "Bancos" y "Tarjetas de crédito" se arman contra una lista CERRADA de
 * bancos/tarjetas reales de Argentina — así si el bot extrae algo raro tipo
 * "Banco Shell" (que no es un banco real) no termina mezclado en el
 * desplegable junto a los bancos de verdad.
 */
export type CategoriaMetodoPago = "Efectivo" | "Transferencia" | "Bancos" | "Tarjetas de crédito" | "Otros";

export const CATEGORIAS_METODO_PAGO: CategoriaMetodoPago[] = [
  "Efectivo",
  "Transferencia",
  "Bancos",
  "Tarjetas de crédito",
  "Otros",
];

/** Categorías que además muestran un desplegable con opciones puntuales. */
export const CATEGORIAS_CON_DESPLEGABLE: CategoriaMetodoPago[] = ["Bancos", "Tarjetas de crédito"];

interface Conocido {
  /** Texto a buscar (en minúscula) dentro del nombre guardado. */
  match: string;
  /** Cómo se muestra en el chip. */
  label: string;
}

// Bancos más usados en Argentina. Lista a mano y acotada a propósito: evita
// que cualquier texto con la palabra "banco" (incluyendo errores de
// extracción) aparezca como si fuera un banco real.
const BANCOS_CONOCIDOS: Conocido[] = [
  { match: "banco nación", label: "Banco Nación" },
  { match: "banco macro", label: "Banco Macro" },
  { match: "banco galicia", label: "Banco Galicia" },
  { match: "banco santander", label: "Banco Santander" },
  { match: "bbva", label: "BBVA" },
  { match: "banco ciudad", label: "Banco Ciudad" },
  { match: "banco provincia", label: "Banco Provincia" },
  { match: "banco de santa fe", label: "Banco de Santa Fe" },
  { match: "banco patagonia", label: "Banco Patagonia" },
  { match: "banco comafi", label: "Banco Comafi" },
  { match: "banco credicoop", label: "Banco Credicoop" },
  { match: "icbc", label: "ICBC" },
  { match: "banco supervielle", label: "Banco Supervielle" },
  { match: "banco hipotecario", label: "Banco Hipotecario" },
  { match: "banco itaú", label: "Banco Itaú" },
  { match: "banco de corrientes", label: "Banco de Corrientes" },
  { match: "brubank", label: "Brubank" },
];

// Marcas de tarjeta reales. Las variantes de nivel ("Visa Gold", "Visa
// Selecta", "Mastercard Platinum") quedan agrupadas bajo su marca — mostrar
// cada combinación banco+nivel como una tarjeta aparte sería, de nuevo, una
// lista interminable.
const TARJETAS_CONOCIDAS: Conocido[] = [
  { match: "american express", label: "American Express" },
  { match: "amex", label: "American Express" },
  { match: "mastercard", label: "Mastercard" },
  { match: "naranja x", label: "Naranja X" },
  { match: "naranja", label: "Naranja" },
  { match: "cabal", label: "Cabal" },
  { match: "visa", label: "Visa" },
];

function coincidencias(texto: string, conocidos: Conocido[]): string[] {
  const minuscula = texto.toLowerCase();
  const labels = new Set<string>();
  for (const c of conocidos) {
    if (minuscula.includes(c.match)) labels.add(c.label);
  }
  return [...labels];
}

/** Bancos reales (de la lista cerrada) mencionados en este texto. */
export function bancosEnTexto(nombre: string): string[] {
  return coincidencias(nombre, BANCOS_CONOCIDOS);
}

/** Tarjetas reales (de la lista cerrada) mencionadas en este texto. */
export function tarjetasEnTexto(nombre: string): string[] {
  return coincidencias(nombre, TARJETAS_CONOCIDAS);
}

export function categorizarMetodoPago(nombre: string): CategoriaMetodoPago[] {
  const texto = nombre.toLowerCase();
  const categorias = new Set<CategoriaMetodoPago>();

  if (texto.includes("efectivo")) categorias.add("Efectivo");
  if (texto.includes("transferencia")) categorias.add("Transferencia");
  if (bancosEnTexto(nombre).length > 0) categorias.add("Bancos");
  if (tarjetasEnTexto(nombre).length > 0) categorias.add("Tarjetas de crédito");

  if (categorias.size === 0) categorias.add("Otros");
  return [...categorias];
}
