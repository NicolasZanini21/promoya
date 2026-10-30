import type { Rubro } from "@/types";

// Un color de acento por rubro: ayuda a escanear la lista de un vistazo.
// Con 11 rubros ya no alcanza con 3 colores a mano — se define uno por
// cada rubro conocido y se cae a la paleta de marca para cualquier otro.
const COLOR_POR_RUBRO: Record<string, string> = {
  Supermercados: "from-emerald-500 to-emerald-600",
  Indumentaria: "from-fuchsia-500 to-pink-600",
  Combustible: "from-orange-500 to-red-600",
  Carnicerías: "from-rose-500 to-red-700",
  Verdulerías: "from-lime-500 to-green-600",
  Gimnasios: "from-cyan-500 to-blue-600",
  Gastronomía: "from-amber-500 to-orange-600",
  Farmacias: "from-sky-500 to-indigo-500",
  "Electrodomésticos y Tecnología": "from-slate-500 to-slate-700",
  Mascotas: "from-yellow-500 to-amber-600",
  Delivery: "from-violet-500 to-purple-600",
};

export function colorRubro(rubro: Rubro): string {
  return COLOR_POR_RUBRO[rubro.nombre] ?? "from-brand-500 to-brand-700";
}
