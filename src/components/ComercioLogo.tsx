"use client";

import { useState } from "react";

// Paleta fija para el avatar de respaldo (cuando no hay favicon real) — se
// elige una de forma determinística según el nombre, para que el mismo
// comercio siempre tenga el mismo color.
const COLORES_AVATAR = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-orange-500",
  "bg-teal-500",
];

function colorPara(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) % COLORES_AVATAR.length;
  return COLORES_AVATAR[Math.abs(hash)];
}

/**
 * Logo del comercio con fallback en cadena: prueba cada URL de `srcs` en
 * orden (típicamente: dominio oficial fijo primero, después el de
 * fuente_url) y si una falla pasa a la siguiente. Si ninguna carga (muchos
 * comercios chicos directamente no tienen favicon real en ningún lado — no
 * es un bug, es que el servicio gratis de favicons no tiene nada para
 * ofrecer ahí), muestra un avatar con la inicial del nombre en vez de
 * dejar el espacio en blanco.
 */
export function ComercioLogo({
  srcs,
  nombre,
  className,
}: {
  srcs: (string | null)[];
  nombre: string;
  className?: string;
}) {
  const candidatos = srcs.filter((s): s is string => Boolean(s));
  const [indice, setIndice] = useState(0);

  if (indice >= candidatos.length) {
    return (
      <span
        // El color/fondo del avatar van DESPUÉS de className a propósito:
        // así ganan aunque quien use el componente pase, por ejemplo,
        // "bg-white/90" pensado para la versión con logo de verdad.
        className={`flex items-center justify-center font-semibold ${className ?? ""} ${colorPara(nombre)} text-white`}
        aria-hidden
      >
        {nombre.trim().charAt(0).toUpperCase() || "?"}
      </span>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element -- dominio externo arbitrario, no se puede usar next/image sin configurar cada host a mano
  return (
    <img
      key={candidatos[indice]}
      src={candidatos[indice]}
      alt=""
      className={className}
      loading="lazy"
      onError={() => setIndice((i) => i + 1)}
    />
  );
}
