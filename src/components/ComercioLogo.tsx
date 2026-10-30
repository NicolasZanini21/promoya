"use client";

import { useState } from "react";

/**
 * Logo del comercio con fallback en cadena: prueba cada URL de `srcs` en
 * orden (típicamente: dominio oficial fijo primero, después el de
 * fuente_url) y si una falla pasa a la siguiente. Si no hay ninguna que
 * cargue, no muestra nada en vez de un ícono roto.
 */
export function ComercioLogo({
  srcs,
  alt,
  className,
}: {
  srcs: (string | null)[];
  alt: string;
  className?: string;
}) {
  const candidatos = srcs.filter((s): s is string => Boolean(s));
  const [indice, setIndice] = useState(0);

  if (indice >= candidatos.length) return null;

  // eslint-disable-next-line @next/next/no-img-element -- dominio externo arbitrario, no se puede usar next/image sin configurar cada host a mano
  return (
    <img
      key={candidatos[indice]}
      src={candidatos[indice]}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setIndice((i) => i + 1)}
    />
  );
}
