"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { OrdenPromos } from "@/types";

export type Tema = "claro" | "oscuro" | "sistema";

export interface PerfilLocal {
  nombre: string | null;
  /** true la primera vez que se guarda el nombre; false en visitas siguientes */
  esPrimeraVez: boolean;
  tema: Tema;
  ubicacionActiva: boolean;
  ubicacion: { lat: number; lng: number } | null;
  ordenPreferido: OrdenPromos;
  /** ids de Rubro a los que el usuario está suscripto (ver página "Mis rubros") */
  rubrosSuscriptos: string[];
}

const PERFIL_DEFAULT: PerfilLocal = {
  nombre: null,
  esPrimeraVez: true,
  tema: "sistema",
  ubicacionActiva: false,
  ubicacion: null,
  ordenPreferido: "descuento",
  rubrosSuscriptos: ["r1", "r3"],
};

const STORAGE_KEY = "descuentohoy.perfil";

function leerPerfilGuardado(): PerfilLocal {
  if (typeof window === "undefined") return PERFIL_DEFAULT;
  try {
    const crudo = window.localStorage.getItem(STORAGE_KEY);
    if (!crudo) return PERFIL_DEFAULT;
    return { ...PERFIL_DEFAULT, ...JSON.parse(crudo) };
  } catch {
    return PERFIL_DEFAULT;
  }
}

function aplicarTema(tema: Tema) {
  const root = document.documentElement;
  const prefiereOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const oscuro = tema === "oscuro" || (tema === "sistema" && prefiereOscuro);
  root.classList.toggle("dark", oscuro);
}

interface AppStateValue {
  perfil: PerfilLocal;
  listo: boolean;
  /** true solo en el primer render después de cargar el nombre guardado */
  saludoDeBienvenida: "nuevo" | "regreso" | null;
  iniciarSesion: (nombre: string) => void;
  actualizarPerfil: (cambios: Partial<PerfilLocal>) => void;
  pedirUbicacion: () => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [perfil, setPerfil] = useState<PerfilLocal>(PERFIL_DEFAULT);
  const [listo, setListo] = useState(false);
  const [saludo, setSaludo] = useState<"nuevo" | "regreso" | null>(null);

  useEffect(() => {
    const guardado = leerPerfilGuardado();
    setPerfil(guardado);
    aplicarTema(guardado.tema);
    if (guardado.nombre) setSaludo(guardado.esPrimeraVez ? "nuevo" : "regreso");
    setListo(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => aplicarTema(guardado.tema);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardar = useCallback((siguiente: PerfilLocal) => {
    setPerfil(siguiente);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(siguiente));
    aplicarTema(siguiente.tema);
  }, []);

  const iniciarSesion = useCallback(
    (nombre: string) => {
      const yaExistia = Boolean(perfil.nombre);
      guardar({ ...perfil, nombre, esPrimeraVez: false });
      setSaludo(yaExistia ? "regreso" : "nuevo");
    },
    [perfil, guardar]
  );

  const actualizarPerfil = useCallback(
    (cambios: Partial<PerfilLocal>) => {
      guardar({ ...perfil, ...cambios, esPrimeraVez: false });
    },
    [perfil, guardar]
  );

  const pedirUbicacion = useCallback(async () => {
    if (!("geolocation" in navigator)) return;
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          actualizarPerfil({
            ubicacionActiva: true,
            ubicacion: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
          resolve();
        },
        () => {
          actualizarPerfil({ ubicacionActiva: false, ubicacion: null });
          resolve();
        },
        { timeout: 8000 }
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualizarPerfil]);

  return (
    <AppStateContext.Provider
      value={{ perfil, listo, saludoDeBienvenida: saludo, iniciarSesion, actualizarPerfil, pedirUbicacion }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState debe usarse dentro de AppStateProvider");
  return ctx;
}
