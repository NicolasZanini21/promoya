/** "2026-11-30" -> "30/11" (sin año: el cliente ya sabe en qué año está). */
export function formatDiaMes(fechaIso: string): string {
  const [, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}`;
}
