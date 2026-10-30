"use client";

import { useEffect } from "react";

/** Registra el service worker (public/sw.js) apenas carga la app. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("No se pudo registrar el service worker", err);
      });
    }
  }, []);

  return null;
}
