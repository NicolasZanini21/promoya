"use client";

import { useEffect, useState } from "react";
import { IconDownload } from "@/components/icons";

/**
 * Botón "Instalar app" en Android/desktop Chrome (dispara el prompt nativo
 * del navegador vía beforeinstallprompt). En iPhone no existe ese evento:
 * ahí se muestra el paso manual de "Compartir > Agregar a pantalla de inicio".
 */
export function InstallPwaButton() {
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [esIos, setEsIos] = useState(false);

  useEffect(() => {
    setEsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setPromptEvent(e);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (esIos) {
    return (
      <p className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
        En iPhone: tocá el botón <strong>Compartir</strong> en Safari y elegí{" "}
        <strong>&quot;Agregar a pantalla de inicio&quot;</strong>.
      </p>
    );
  }

  if (!promptEvent) return null;

  return (
    <button
      onClick={() => promptEvent.prompt()}
      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent-500 px-4 py-2 text-sm font-medium text-white shadow-sm"
    >
      <IconDownload className="h-4 w-4" />
      Instalar app en este celular
    </button>
  );
}
