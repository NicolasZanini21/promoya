import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Job diario (ver spec: Flujo principal / Arquitectura técnica).
 * Se dispara una vez por día (cron de Vercel, o cualquier scheduler que
 * llame a esta ruta con el header de autorización correcto).
 *
 * Por cada rubro/cadena conocida de Rosario:
 *  1. Busca en la web con Tavily (pensada para agentes: devuelve contenido
 *     ya limpio, no HTML crudo).
 *  2. Le pasa los resultados a Gemini Flash (tier gratuito) para extraer
 *     comercio, descuento, condiciones y método de pago en JSON.
 *  3. Guarda la promo en Supabase (upsert de comercio + promocion).
 *
 * Arranca con 2-3 rubros/cadenas conocidas (ver spec > "Puntos a
 * investigar") antes de escalar a toda la ciudad — CADENAS_CONOCIDAS_V1
 * es la lista a ir ampliando a mano a medida que se valida la calidad.
 */

interface CadenaConocida {
  rubro: string;
  cadena: string;
  /** Solo para Indumentaria: deportiva | formal | casual */
  subcategoria?: string;
}

const CADENAS_CONOCIDAS_V1: CadenaConocida[] = [
  { rubro: "Supermercados", cadena: "Carrefour" },
  { rubro: "Supermercados", cadena: "Día %" },
  { rubro: "Supermercados", cadena: "Vea" },
  { rubro: "Indumentaria", cadena: "Portsaid", subcategoria: "casual" },
  { rubro: "Indumentaria", cadena: "Taverniti", subcategoria: "formal" },
  { rubro: "Indumentaria", cadena: "Dexter", subcategoria: "deportiva" },
  { rubro: "Combustible", cadena: "YPF" },
  { rubro: "Combustible", cadena: "Shell" },
  { rubro: "Combustible", cadena: "Axion" },
  { rubro: "Carnicerías", cadena: "Carnicerías de Rosario" },
  { rubro: "Verdulerías", cadena: "Verdulerías de Rosario" },
  { rubro: "Gimnasios", cadena: "Megatlon" },
  { rubro: "Gimnasios", cadena: "Sport Club" },
  { rubro: "Gastronomía", cadena: "La Montada Resto Bar" },
  { rubro: "Farmacias", cadena: "Farmacity" },
  { rubro: "Farmacias", cadena: "Vantage" },
  { rubro: "Electrodomésticos y Tecnología", cadena: "Megatone" },
  { rubro: "Electrodomésticos y Tecnología", cadena: "Fravega" },
  { rubro: "Mascotas", cadena: "Veterinarias y petshops de Rosario" },
  { rubro: "Delivery", cadena: "PedidosYa" },
  { rubro: "Delivery", cadena: "Rappi" },
];

interface ResultadoWeb {
  url: string;
  contenido: string;
}

/** fetch con timeout: evita que una llamada colgada trabe todo el job. */
async function fetchConTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 20000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`Timeout después de ${timeoutMs}ms llamando a ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

interface PromoExtraida {
  encontrada: boolean;
  descuentoPorcentaje?: number | null;
  descuentoMonto?: number | null;
  condiciones?: string | null;
  metodoPago?: string | null;
  diasValidos?: string[] | null;
  topeReintegro?: number | null;
  fechaFin?: string | null; // YYYY-MM-DD
  fuenteUrl?: string | null;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!process.env.TAVILY_API_KEY || !process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Faltan TAVILY_API_KEY y/o GEMINI_API_KEY en las variables de entorno" },
      { status: 500 }
    );
  }

  const supabase = createServiceRoleClient();
  const resumen: { rubro: string; cadena: string; resultado: string }[] = [];

  for (const { rubro, cadena, subcategoria } of CADENAS_CONOCIDAS_V1) {
    try {
      const resultadosWeb = await buscarResultadosWeb(rubro, cadena);
      if (resultadosWeb.length === 0) {
        resumen.push({ rubro, cadena, resultado: "sin resultados de búsqueda" });
        continue;
      }

      const promo = await extraerPromoConLLM(rubro, cadena, resultadosWeb);
      if (!promo.encontrada) {
        resumen.push({ rubro, cadena, resultado: "sin promo vigente detectada" });
        continue;
      }

      await guardarPromo(supabase, { rubro, cadena, subcategoria, promo });
      resumen.push({ rubro, cadena, resultado: "promo guardada" });
    } catch (err) {
      console.error(`[cron] error con ${cadena} (${rubro}):`, err);
      resumen.push({ rubro, cadena, resultado: `error: ${(err as Error).message}` });
    }
  }

  return NextResponse.json({ ok: true, resumen });
}

/** Búsqueda web con Tavily (https://tavily.com) — tier gratis: 1000/mes. */
async function buscarResultadosWeb(rubro: string, cadena: string): Promise<ResultadoWeb[]> {
  // Combustible: los descuentos casi siempre dependen de banco/tarjeta y día
  // de la semana — una consulta genérica trae notas viejas o genéricas que
  // Gemini después descarta por "no concretas". Apuntamos directo a eso.
  const query =
    rubro === "Combustible"
      ? `descuento "${cadena}" nafta combustible Rosario con qué tarjeta o banco, qué día, qué porcentaje`
      : `promoción descuento "${cadena}" ${rubro} Rosario Santa Fe este mes`;

  const res = await fetchConTimeout("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      // "advanced" trae contenido más completo y relevante que "basic" —
      // clave para rubros como Combustible, donde el dato concreto (banco,
      // día, %) suele estar más adentro de la página, no en el resumen.
      search_depth: "advanced",
      max_results: 5,
      include_answer: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily respondió ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const resultados: { url: string; content: string }[] = data.results ?? [];
  return resultados
    .filter((r) => r.content && r.content.trim().length > 0)
    .map((r) => ({ url: r.url, contenido: r.content.slice(0, 3000) }));
}

/** Extracción estructurada con Gemini Flash (tier gratis de Google AI Studio). */
async function extraerPromoConLLM(
  rubro: string,
  cadena: string,
  resultadosWeb: ResultadoWeb[]
): Promise<PromoExtraida> {
  const hoy = new Date().toISOString().slice(0, 10);
  const contexto = resultadosWeb
    .map((r, i) => `[Fuente ${i + 1}: ${r.url}]\n${r.contenido}`)
    .join("\n\n");

  const prompt = `Hoy es ${hoy}. Los siguientes son resultados de una búsqueda web sobre promociones/descuentos de "${cadena}" (rubro: ${rubro}) en Rosario, Argentina.

${contexto}

Tarea: si estos resultados describen una promoción vigente y concreta (no genérica, no vencida), devolvé sus datos. Si no hay ninguna promoción clara y vigente, devolvé {"encontrada": false}.
No inventes datos que no estén en el texto: un campo que no se pueda confirmar va en null.`;

  const schema = {
    type: "object",
    properties: {
      encontrada: { type: "boolean" },
      descuentoPorcentaje: { type: "number", nullable: true },
      descuentoMonto: { type: "number", nullable: true },
      condiciones: { type: "string", nullable: true, description: "Resumen breve y claro para mostrarle al usuario" },
      metodoPago: { type: "string", nullable: true, description: "Banco, billetera o tarjeta requerida, si aplica" },
      diasValidos: { type: "array", nullable: true, items: { type: "string" } },
      topeReintegro: { type: "number", nullable: true },
      fechaFin: { type: "string", nullable: true, description: "Formato YYYY-MM-DD" },
      fuenteUrl: { type: "string", nullable: true },
    },
    required: ["encontrada"],
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.1,
    },
  });

  // Reintenta en caso de 503 (modelo con mucha demanda) o timeout: suele
  // resolverse solo en unos segundos.
  let res: Response | null = null;
  let ultimoError: unknown = null;
  for (let intento = 1; intento <= 3; intento++) {
    try {
      res = await fetchConTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) break;
      if (res.status !== 503) break; // error no transitorio: no reintentar
      ultimoError = new Error(`Gemini respondió 503 (intento ${intento}/3)`);
    } catch (err) {
      ultimoError = err;
      res = null;
    }
    if (intento < 3) await new Promise((r) => setTimeout(r, 3000 * intento));
  }

  if (!res) throw ultimoError as Error;
  if (!res.ok) {
    throw new Error(`Gemini respondió ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) return { encontrada: false };

  try {
    return JSON.parse(texto) as PromoExtraida;
  } catch {
    return { encontrada: false };
  }
}

/** Upsert de comercio + metodo_pago + promocion en Supabase. */
async function guardarPromo(
  supabase: ReturnType<typeof createServiceRoleClient>,
  {
    rubro,
    cadena,
    subcategoria,
    promo,
  }: { rubro: string; cadena: string; subcategoria?: string; promo: PromoExtraida }
) {
  const { data: rubroRow, error: errRubro } = await supabase
    .from("rubro")
    .select("id")
    .eq("nombre", rubro)
    .single();
  if (errRubro || !rubroRow) throw new Error(`Rubro "${rubro}" no existe en la base`);

  let { data: comercioRow } = await supabase
    .from("comercio")
    .select("id")
    .eq("nombre", cadena)
    .eq("rubro_id", rubroRow.id)
    .maybeSingle();

  if (!comercioRow) {
    const { data: nuevoComercio, error: errComercio } = await supabase
      .from("comercio")
      .insert({ nombre: cadena, rubro_id: rubroRow.id, subcategoria: subcategoria ?? null })
      .select("id")
      .single();
    if (errComercio) throw errComercio;
    comercioRow = nuevoComercio;
  }

  let metodoPagoId: string | null = null;
  if (promo.metodoPago) {
    const { data: metodoRow } = await supabase
      .from("metodo_pago")
      .select("id")
      .ilike("nombre", promo.metodoPago)
      .maybeSingle();

    if (metodoRow) {
      metodoPagoId = metodoRow.id;
    } else {
      const { data: nuevoMetodo, error: errMetodo } = await supabase
        .from("metodo_pago")
        .insert({ nombre: promo.metodoPago })
        .select("id")
        .single();
      if (errMetodo) throw errMetodo;
      metodoPagoId = nuevoMetodo.id;
    }
  }

  // Evita duplicar: si ya hay una promo activa para este comercio con las
  // mismas condiciones, se actualiza en vez de insertar una nueva fila.
  const { data: existente } = await supabase
    .from("promocion")
    .select("id")
    .eq("comercio_id", comercioRow.id)
    .eq("activa", true)
    .eq("condiciones", promo.condiciones ?? "")
    .maybeSingle();

  const payload = {
    comercio_id: comercioRow.id,
    descuento_porcentaje: promo.descuentoPorcentaje ?? null,
    descuento_monto: promo.descuentoMonto ?? null,
    condiciones: promo.condiciones ?? null,
    tope_reintegro: promo.topeReintegro ?? null,
    dias_validos: promo.diasValidos ?? null,
    metodo_pago_requerido_id: metodoPagoId,
    fuente_url: promo.fuenteUrl ?? null,
    fecha_fin: promo.fechaFin ?? null,
    activa: true,
  };

  if (existente) {
    const { error } = await supabase.from("promocion").update(payload).eq("id", existente.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("promocion")
      .insert({ ...payload, fecha_detectada: new Date().toISOString() });
    if (error) throw error;
  }

  // TODO: cuando esté el paso de notificaciones push, disparar acá un push
  // a los usuarios con suscripcion_rubro para este rubro (solo si la promo
  // es nueva, no en cada actualización).
}
