"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { InstallPwaButton } from "@/components/InstallPwaButton";
import {
  IconCard,
  IconMonitor,
  IconMoon,
  IconPercent,
  IconPin,
  IconSun,
  IconTag,
  IconUser,
} from "@/components/icons";
import { useAppState, type Tema } from "@/lib/app-state";
import { fetchMetodosPago } from "@/lib/promos";
import { createClient } from "@/lib/supabase/client";
import type { MetodoPago, OrdenPromos } from "@/types";

const OPCIONES_ORDEN: { value: OrdenPromos; label: string; Icon: typeof IconPercent }[] = [
  { value: "descuento", label: "Mayor % de ahorro", Icon: IconPercent },
  { value: "distancia", label: "Más cerca", Icon: IconPin },
  { value: "frecuencia", label: "Rubros que frecuento", Icon: IconTag },
];

const OPCIONES_TEMA: { value: Tema; label: string; Icon: typeof IconSun }[] = [
  { value: "claro", label: "Claro", Icon: IconSun },
  { value: "oscuro", label: "Oscuro", Icon: IconMoon },
  { value: "sistema", label: "Como el teléfono", Icon: IconMonitor },
];

/**
 * Perfil: métodos de pago (para priorizar promos que el usuario puede
 * aprovechar), ubicación, tema visual y cómo ordenar las promos por
 * defecto en Inicio. Instalar la PWA solo tiene sentido en celular.
 * TODO: persistir métodos de pago en usuario_metodo_pago vía Supabase.
 */
export default function PerfilPage() {
  const router = useRouter();
  const { perfil, actualizarPerfil, pedirUbicacion } = useAppState();
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    fetchMetodosPago(supabase).then(setMetodosPago);
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function cerrarSesion() {
    setCerrandoSesion(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    actualizarPerfil({ nombre: null });
    router.push("/login");
    router.refresh();
  }

  function toggleMetodo(id: string) {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function onToggleUbicacion(activar: boolean) {
    if (activar) await pedirUbicacion();
    else actualizarPerfil({ ubicacionActiva: false, ubicacion: null });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white">
          <IconUser className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">{perfil.nombre ?? "Mi perfil"}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{email ?? "Rosario, Santa Fe"}</p>
        </div>
      </div>

      {/* Métodos de pago */}
      <section className="mb-8">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          <IconCard className="h-4 w-4 text-brand-600" /> Métodos de pago
        </h2>
        <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
          Marcá qué tarjetas o billeteras tenés para priorizar las promos que podés usar.
        </p>
        <div className="flex flex-col gap-2">
          {metodosPago.map((m) => {
            const activo = seleccionados.includes(m.id);
            return (
              <label
                key={m.id}
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${
                  activo
                    ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/30"
                    : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                }`}
              >
                <span className="font-medium text-neutral-800 dark:text-neutral-100">{m.nombre}</span>
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={() => toggleMetodo(m.id)}
                  className="h-5 w-5 accent-brand-600"
                />
              </label>
            );
          })}
        </div>
      </section>

      {/* Ubicación */}
      <section className="mb-8">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          <IconPin className="h-4 w-4 text-brand-600" /> Ubicación
        </h2>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <p className="font-medium text-neutral-800 dark:text-neutral-100">Usar mi ubicación</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {perfil.ubicacionActiva ? "Activada — se usa para calcular distancias" : "Desactivada"}
            </p>
          </div>
          <input
            type="checkbox"
            checked={perfil.ubicacionActiva}
            onChange={(e) => onToggleUbicacion(e.target.checked)}
            className="h-5 w-5 accent-brand-600"
          />
        </label>
      </section>

      {/* Tema */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Apariencia</h2>
        <div className="grid grid-cols-3 gap-2">
          {OPCIONES_TEMA.map(({ value, label, Icon }) => {
            const activo = perfil.tema === value;
            return (
              <button
                key={value}
                onClick={() => actualizarPerfil({ tema: value })}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition ${
                  activo
                    ? "border-transparent bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-sm"
                    : "border-neutral-200 bg-white text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Orden preferido */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          Orden preferido de las promos
        </h2>
        <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
          Así se van a ordenar por defecto en Inicio.
        </p>
        <div className="flex flex-col gap-2">
          {OPCIONES_ORDEN.map(({ value, label, Icon }) => {
            const activo = perfil.ordenPreferido === value;
            return (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                  activo
                    ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/30"
                    : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                }`}
              >
                <input
                  type="radio"
                  name="orden-preferido"
                  checked={activo}
                  onChange={() => actualizarPerfil({ ordenPreferido: value })}
                  className="h-4 w-4 accent-brand-600"
                />
                <Icon className={`h-4 w-4 ${activo ? "text-brand-600" : "text-neutral-400"}`} />
                <span className="font-medium text-neutral-800 dark:text-neutral-100">{label}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="md:hidden">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">App en el celular</h2>
        <InstallPwaButton />
      </section>

      <section>
        <button
          onClick={cerrarSesion}
          disabled={cerrandoSesion}
          className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-neutral-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          {cerrandoSesion ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      </section>
    </div>
  );
}
