// Ayudantes para "¿esta promo aplica hoy / esta semana?" a partir de
// dias_validos (texto libre que puso el LLM, ej. ["jueves"] o
// ["lunes","martes","miércoles","jueves","viernes"]). null/[] = sin
// restricción, válida todos los días.

const DIAS_DEL_ANIO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]; // índice = Date().getDay()
const ORDEN_SEMANA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

function normalizarDia(d: string): string {
  return d.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function diaDeHoy(): string {
  return DIAS_DEL_ANIO[new Date().getDay()];
}

const DIAS_SEMANA_NORMALIZADOS = ORDEN_SEMANA.map(normalizarDia);

export function promoValidaHoy(diasValidos: string[] | null): boolean {
  if (!diasValidos || diasValidos.length === 0) return true;
  const hoy = normalizarDia(diaDeHoy());
  return diasValidos.some((d) => normalizarDia(d) === hoy);
}

// "Esta semana" = la semana completa (lunes a domingo), incluyendo los días
// que ya pasaron — no solo lo que resta. Si una promo es "jueves" y hoy es
// viernes, igual cuenta como "de esta semana" (ya la tuviste disponible esta
// semana, aunque hoy no te sirva). Con los datos que tenemos hoy (día de la
// semana suelto, no una fecha puntual) esto termina mostrando prácticamente
// lo mismo que "Todas" — el filtro que realmente recorta es "Hoy".
export function promoValidaEstaSemana(diasValidos: string[] | null): boolean {
  if (!diasValidos || diasValidos.length === 0) return true;
  return diasValidos.some((d) => DIAS_SEMANA_NORMALIZADOS.includes(normalizarDia(d)));
}

/** true si ya pasó la fecha_fin (promo vieja que el bot todavía no marcó inactiva). */
export function promoVencida(fechaFin: string | null): boolean {
  if (!fechaFin) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(`${fechaFin}T00:00:00`);
  return fin < hoy;
}
