"use client";

import { useEffect } from "react";
import { useAppState } from "@/lib/app-state";
import { createClient } from "@/lib/supabase/client";

/**
 * Reemplaza a BienvenidaModal ahora que el login es real (Supabase Auth).
 * No pide nada: si ya hay sesión (cookie válida, gracias al middleware)
 * pero el perfil local todavía no tiene el nombre (dispositivo nuevo,
 * localStorage vacío), lo trae de la tabla `usuario` y lo guarda local
 * para que el saludo aparezca al instante en visitas futuras.
 */
export function AuthSync() {
  const { perfil, listo, iniciarSesion } = useAppState();

  useEffect(() => {
    if (!listo || perfil.nombre) return;

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("usuario")
        .select("nombre")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      iniciarSesion(data?.nombre || user.email?.split("@")[0] || "");
    });
  }, [listo, perfil.nombre, iniciarSesion]);

  return null;
}
