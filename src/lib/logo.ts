import { DOMINIO_COMERCIO, dominioBloqueado } from "@/lib/comercio-logos";

function faviconDe(dominio: string): string {
  return `https://www.google.com/s2/favicons?domain=${dominio}&sz=64`;
}

/**
 * Logos candidatos para un comercio, en orden de preferencia. Usa el
 * servicio de favicons de Google: gratis, sin cuenta ni API key (la
 * alternativa típica, Clearbit Logo API, cerró — ver
 * https://www.logo.dev/clearbit). No es un logo vectorial de alta calidad,
 * pero alcanza para reconocer la marca de un vistazo.
 *
 * Orden:
 *  1. Dominio oficial fijo del comercio (DOMINIO_COMERCIO) — así el mismo
 *     comercio se ve siempre con el mismo ícono, sin importar en qué
 *     página se haya encontrado la promo de hoy. Si ese dominio no tiene
 *     favicon reconocible, ComercioLogo pasa solo al siguiente candidato.
 *  2. El dominio de fuente_url — pero nunca si es una red social (ahí el
 *     favicon sería el de Instagram/Facebook, no el de la marca).
 */
export function logosComercio(nombreComercio: string, fuenteUrl: string | null): string[] {
  const candidatos: string[] = [];

  const dominioFijo = DOMINIO_COMERCIO[nombreComercio];
  if (dominioFijo) candidatos.push(faviconDe(dominioFijo));

  if (fuenteUrl) {
    try {
      const { hostname } = new URL(fuenteUrl);
      if (!dominioBloqueado(hostname) && hostname !== dominioFijo) {
        candidatos.push(faviconDe(hostname));
      }
    } catch {
      // URL inválida: se ignora, sigue con lo que haya en candidatos.
    }
  }

  return candidatos;
}
