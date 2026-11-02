/**
 * Acceso directo a WhatsApp para consultar sobre la promo. Solo aparece en
 * comercios chicos/de barrio (los únicos que tienen `telefono` guardado —
 * ver CadenaConocida.generica en el cron): las cadenas grandes ya tienen
 * web propia, no lo necesitan.
 *
 * Usa el emoji de globo de diálogo en vez del logo de WhatsApp para no
 * reproducir el ícono de marca.
 */
export function WhatsappLink({
  telefono,
  nombreComercio,
  className,
}: {
  telefono: string | null;
  nombreComercio: string;
  className?: string;
}) {
  if (!telefono) return null;

  const mensaje = encodeURIComponent(`Hola! Te escribo por la promo de ${nombreComercio} en PromoYa.`);

  return (
    <a
      href={`https://wa.me/${telefono}?text=${mensaje}`}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      }
    >
      <span aria-hidden>💬</span> Consultar por WhatsApp
    </a>
  );
}
