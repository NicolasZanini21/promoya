import { DOMINIO_COMERCIO, dominioBloqueado } from "@/lib/comercio-logos";

/**
 * Logo/ícono del comercio. Usa el servicio de favicons de Google: gratis,
 * sin cuenta ni API key (la alternativa típica, Clearbit Logo API, cerró —
 * ver https://www.logo.dev/clearbit). No es un logo vectorial de alta
 * calidad, pero alcanza para reconocer la marca de un vistazo.
 *
 * Prioridad:
 *  1. Dominio oficial fijo del comercio (DOMINIO_COMERCIO) — así el mismo
 *     comercio se ve siempre con el mismo ícono, sin importar en qué
 *     página se haya encontrado la promo de hoy.
 *  2. Si no es un comercio conocido, el dominio de fuente_url — pero nunca
 *     si es una red social (ahí el favicon sería el de Instagram/Facebook,
 *     no el de la marca): en ese caso no mostramos logo.
 */
export function logoUrlComercio(nombreComercio: string, fuenteUrl: string | null): string | null {
  const dominioFijo = DOMINIO_COMERCIO[nombreComercio];
  if (dominioFijo) {
    return `https://www.google.com/s2/favicons?domain=${dominioFijo}&sz=64`;
  }

  if (!fuenteUrl) return null;
  try {
    const { hostname } = new URL(fuenteUrl);
    if (dominioBloqueado(hostname)) return null;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return null;
  }
}
