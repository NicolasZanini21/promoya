/**
 * Dominio oficial de cada cadena conocida (ver CADENAS_CONOCIDAS_V1 en el
 * cron). Usar siempre este dominio fijo para el logo —en vez del sitio
 * donde el bot encontró la promo ese día— es lo que garantiza que el mismo
 * comercio se vea siempre con el mismo ícono, sin importar si la promo de
 * hoy se encontró en una nota de un diario, un blog o Instagram.
 */
export const DOMINIO_COMERCIO: Record<string, string> = {
  Carrefour: "carrefour.com.ar",
  "Día %": "diaonline.com.ar",
  Vea: "vea.com.ar",
  Portsaid: "portsaid.com.ar",
  Taverniti: "taverniti.com.ar",
  Dexter: "dexter.com.ar",
  YPF: "ypf.com",
  Shell: "shell.com.ar",
  Axion: "axionenergy.com.ar",
  Megatlon: "megatlon.com",
  "Sport Club": "sportclub.com.ar",
  Farmacity: "farmacity.com",
  Megatone: "megatone.com.ar",
  Fravega: "fravega.com",
  PedidosYa: "pedidosya.com.ar",
  Rappi: "rappi.com.ar",
};

// Dominios de redes sociales / agregadores: nunca sirven como logo del
// comercio (terminás viendo el ícono de Instagram, no el de la marca).
const DOMINIOS_BLOQUEADOS = [
  "instagram.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "linkedin.com",
  "whatsapp.com",
  "wa.me",
];

export function dominioBloqueado(hostname: string): boolean {
  return DOMINIOS_BLOQUEADOS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
}
