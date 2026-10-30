"use client";

import type { MetodoPago, OrdenPromos, Rubro } from "@/types";

interface FiltersProps {
  rubros: Rubro[];
  metodosPago: MetodoPago[];
  rubroSeleccionado: string | null;
  metodoSeleccionado: string | null;
  orden: OrdenPromos;
  onRubroChange: (id: string | null) => void;
  onMetodoChange: (id: string | null) => void;
  onOrdenChange: (orden: OrdenPromos) => void;
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-left text-sm font-medium transition md:whitespace-normal ${
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
 */
export function Filters({
  rubros,
  metodosPago,
  rubroSeleccionado,
  metodoSeleccionado,
  orden,
  onRubroChange,
  onMetodoChange,
  onOrdenChange,
}: FiltersProps) {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Rubro
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
          <Chip activo={rubroSeleccionado === null} onClick={() => onRubroChange(null)}>
            Todos
          </Chip>
          {rubros.map((r) => (
            <Chip
              key={r.id}
              activo={rubroSeleccionado === r.id}
              onClick={() => onRubroChange(r.id)}
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
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
          <Chip activo={metodoSeleccionado === null} onClick={() => onMetodoChange(null)}>
            Todos
          </Chip>
          {metodosPago.map((m) => (
            <Chip
              key={m.id}
              activo={metodoSeleccionado === m.id}
              onClick={() => onMetodoChange(m.id)}
            >
              {m.nombre}
            </Chip>
          ))}
        </div>
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
