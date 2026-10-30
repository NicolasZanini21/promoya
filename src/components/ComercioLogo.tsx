"use client";

import { useState } from "react";

/**
 * Logo del comercio con fallback silencioso: si la imagen no carga (no hay
 * fuente, el dominio no tiene favicon, etc.) simplemente no muestra nada en
 * vez de un ícono roto.
 */
export function ComercioLogo({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [error, setError] = useState(false);
  if (!src || error) return null;

  // eslint-disable-next-line @next/next/no-img-element -- dominio externo arbitrario, no se puede usar next/image sin configurar cada host a mano
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}
