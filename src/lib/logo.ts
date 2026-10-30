/**
 * Logo/ícono del comercio a partir del dominio de la página donde el bot
 * encontró la promo (fuente_url). Usa el servicio de favicons de Google:
 * gratis, sin cuenta ni API key (la alternativa típica, Clearbit Logo API,
 * cerró — ver https://www.logo.dev/clearbit). No es un logo vectorial de
 * alta calidad, pero alcanza para reconocer la marca de un vistazo y no
 * cuesta nada ni requiere mantenimiento.
 */
export function logoUrlDesdeFuente(fuenteUrl: string | null): string | null {
  if (!fuenteUrl) return null;
  try {
    const { hostname } = new URL(fuenteUrl);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return null;
  }
}
