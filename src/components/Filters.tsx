"use client";

import {
  bancosEnTexto,
  CATEGORIAS_CON_DESPLEGABLE,
  CATEGORIAS_METODO_PAGO,
  categorizarMetodoPago,
  tarjetasEnTexto,
  type CategoriaMetodoPago,
} from "@/lib/metodo-pago-categorias";
import type { MetodoPago, OrdenPromos, Rubro } from "@/types";

interface FiltersProps {
  rubros: Rubro[];
  metodosPago: MetodoPago[];
  rubroSeleccionado: string | null;
  categoriaMetodoSeleccionada: CategoriaMetodoPago | null;
  /** Banco o tarjeta puntual elegido dentro de la categoría (ej. "Banco Macro", "Visa"). */
  metodoSeleccionado: string | null;
  orden: OrdenPromos;
  onRubroChange: (id: string | null) => void;
  onCategoriaMetodoChange: (categoria: CategoriaMetodoPago | null) => void;
  onMetodoChange: (opcion: string | null) => void;
  onOrdenChange: (orden: OrdenPromos) => void;
  /** true dentro del panel lateral de celular: lista vertical, sin scroll
   * horizontal, aunque el viewport sea chico (ver MobileFiltersDrawer). */
  vertical?: boolean;
}

function Chip({
  activo,
  onClick,
  vertical,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  vertical?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-left text-sm font-medium transition ${
        vertical ? "whitespace-normal" : "whitespace-nowrap md:whitespace-normal"
      } ${
        activo
          ? "border-transparent bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-sm"
          : "border-neutral-200 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Mismo componente de filtros para las dos plataformas: en escritorio se
 * acomoda como panel vertical (dentro del aside de la página de Inicio);
 * en celular, como fila de chips con scroll horizontal arriba de la lista.
 * Ver spec: "Diseño para escritorio y celular".
 *
 * El filtro de método de pago es de dos niveles: categorías generales
 * (Efectivo, Transferencia, Bancos, Tarjetas de crédito, Otros); "Bancos" y
 * "Tarjetas de crédito" además abren un desplegable, pero con una lista
 * CERRADA de bancos/tarjetas reales de Argentina (ver
 * lib/metodo-pago-categorias.ts) — no con lo que sea que haya extraído el
 * bot ese día, para no terminar con decenas de chips raros.
 */
export function Filters({
  rubros,
  metodosPago,
  rubroSeleccionado,
  categoriaMetodoSeleccionada,
  metodoSeleccionado,
  orden,
  onRubroChange,
  onCategoriaMetodoChange,
  onMetodoChange,
  onOrdenChange,
  vertical = false,
}: FiltersProps) {
  const filaClasses = vertical
    ? "flex flex-col flex-wrap gap-2"
    : "flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible";

  // Solo se ofrecen como chips los bancos/tarjetas de la lista cerrada que
  // realmente aparecen en alguna promo activa — no la lista completa
  // siempre, para no mostrar opciones sin ningún resultado.
  const opcionesDesplegable = (() => {
    if (categoriaMetodoSeleccionada === "Bancos") {
      const vistos = new Set<string>();
      metodosPago.forEach((m) => bancosEnTexto(m.nombre).forEach((b) => vistos.add(b)));
      return [...vistos].sort();
    }
    if (categoriaMetodoSeleccionada === "Tarjetas de crédito") {
      const vistos = new Set<string>();
      metodosPago.forEach((m) => tarjetasEnTexto(m.nombre).forEach((t) => vistos.add(t)));
      return [...vistos].sort();
    }
    return [];
  })();

  const etiquetaTodos =
    categoriaMetodoSeleccionada === "Bancos"
      ? "Todos los bancos"
      : categoriaMetodoSeleccionada === "Tarjetas de crédito"
      ? "Todas las tarjetas"
      : "Todos";

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Rubro
        </p>
        <div className={filaClasses}>
          <Chip activo={rubroSeleccionado === null} onClick={() => onRubroChange(null)} vertical={vertical}>
            Todos
          </Chip>
          {rubros.map((r) => (
            <Chip
              key={r.id}
              activo={rubroSeleccionado === r.id}
              onClick={() => onRubroChange(r.id)}
              vertical={vertical}
            >
              {r.nombre}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Método de pago
        </p>
        <div className={filaClasses}>
          <Chip
            activo={categoriaMetodoSeleccionada === null}
            onClick={() => {
              onCategoriaMetodoChange(null);
              onMetodoChange(null);
            }}
            vertical={vertical}
          >
            Todos los medios de pago
          </Chip>
          {CATEGORIAS_METODO_PAGO.map((c) => (
            <Chip
              key={c}
              activo={categoriaMetodoSeleccionada === c}
              onClick={() => {
                onCategoriaMetodoChange(c);
                onMetodoChange(null); // cambiar de categoría resetea el banco/tarjeta puntual elegido
              }}
              vertical={vertical}
            >
              {c}
            </Chip>
          ))}
        </div>

        {/* Desplegable con bancos/tarjetas reales, solo si la categoría elegida tiene opciones para mostrar. */}
        {categoriaMetodoSeleccionada &&
          CATEGORIAS_CON_DESPLEGABLE.includes(categoriaMetodoSeleccionada) &&
          opcionesDesplegable.length > 0 && (
            <div className={`mt-2 border-l-2 border-neutral-100 pl-3 dark:border-neutral-800 ${filaClasses}`}>
              <Chip activo={metodoSeleccionado === null} onClick={() => onMetodoChange(null)} vertical={vertical}>
                {etiquetaTodos}
              </Chip>
              {opcionesDesplegable.map((opcion) => (
                <Chip
                  key={opcion}
                  activo={metodoSeleccionado === opcion}
                  onClick={() => onMetodoChange(opcion)}
                  vertical={vertical}
                >
                  {opcion}
                </Chip>
              ))}
            </div>
          )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Ordenar por
        </p>
        <select
          value={orden}
          onChange={(e) => onOrdenChange(e.target.value as OrdenPromos)}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="descuento">Mayor % de ahorro</option>
          <option value="distancia">Más cerca</option>
          <option value="frecuencia">Rubros que frecuento</option>
        </select>
      </div>
    </div>
  );
}
