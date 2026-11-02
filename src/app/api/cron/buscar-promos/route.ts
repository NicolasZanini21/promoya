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
  /**
   * true cuando "cadena" no es una marca puntual sino una categoría de
   * búsqueda (ej. "Carnicerías de Rosario"). En ese caso no se guarda ese
   * texto como nombre del comercio: se le pide al LLM que identifique el
   * negocio real y concreto que aparece en los resultados, y se usa ese
   * nombre — así cada comercio queda bien identificado (y puede tener su
   * propio logo más adelante) en vez de agruparse todos bajo un genérico.
   */
  generica?: boolean;
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
  { rubro: "Carnicerías", cadena: "Carnicerías de Rosario", generica: true },
  { rubro: "Verdulerías", cadena: "Verdulerías de Rosario", generica: true },
  { rubro: "Gimnasios", cadena: "Megatlon" },
  { rubro: "Gimnasios", cadena: "Sport Club" },
  { rubro: "Gastronomía", cadena: "La Montada Resto Bar" },
  { rubro: "Farmacias", cadena: "Farmacity" },
  { rubro: "Farmacias", cadena: "Vantage" },
  { rubro: "Electrodomésticos y Tecnología", cadena: "Megatone" },
  { rubro: "Electrodomésticos y Tecnología", cadena: "Fravega" },
  { rubro: "Mascotas", cadena: "Veterinarias y petshops de Rosario", generica: true },
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
  /** Solo se le pide al LLM en búsquedas "genéricas" (ver CadenaConocida.generica). */
  nombreComercio?: string | null;
  /** Idem nombreComercio: dirección del local, solo en búsquedas genéricas. */
  direccionComercio?: string | null;
  /**
   * WhatsApp del negocio, solo en búsquedas genéricas (comercios de
   * barrio/chicos — las cadenas grandes no lo necesitan, ya tienen web).
   * Formato libre tal como aparece en el texto; se normaliza después.
   */
  telefonoComercio?: string | null;
}

// Google AI Studio (tier gratis) limita gemini-flash-lite a 15 pedidos por
// minuto. Con ~20 comercios en la lista, hay que espaciar los pedidos para
// no chocar contra ese límite — 4.5s de pausa entre cada uno deja margen
// de sobra (13 pedidos/min como máximo).
const PAUSA_ENTRE_COMERCIOS_MS = 4500;

// Con ~20 comercios, pausa de 4.5s entre cada uno + el tiempo real de
// Tavily/Gemini por comercio puede superar fácil los 120s — el límite real
// de Vercel Hobby es 300s, así que usamos casi todo ese margen.
export const maxDuration = 280;

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

  for (const [indice, { rubro, cadena, subcategoria, generica }] of CADENAS_CONOCIDAS_V1.entries()) {
    if (indice > 0) await new Promise((r) => setTimeout(r, PAUSA_ENTRE_COMERCIOS_MS));
    try {
      const resultadosWeb = await buscarResultadosWeb(rubro, cadena, generica);
      if (resultadosWeb.length === 0) {
        resumen.push({ rubro, cadena, resultado: "sin resultados de búsqueda" });
        continue;
      }

      const promo = await extraerPromoConLLM(rubro, cadena, resultadosWeb, generica);
      if (!promo.encontrada) {
        resumen.push({ rubro, cadena, resultado: "sin promo vigente detectada" });
        continue;
      }
      // Búsqueda genérica sin un comercio real identificado: mejor no
      // guardar nada que guardar una tarjeta bajo el nombre de la
      // categoría (ej. "Verdulerías de Rosario"), que no dice qué local es.
      if (generica && !promo.nombreComercio?.trim()) {
        resumen.push({ rubro, cadena, resultado: "sin comercio específico identificado" });
        continue;
      }

      const nombreGuardado = generica ? promo.nombreComercio!.trim() : cadena;
      let direccionGuardada = promo.direccionComercio?.trim() || null;
      // WhatsApp solo tiene sentido en comercios chicos/de barrio (búsqueda
      // "genérica"): una cadena grande como Shell o Carrefour tiene línea de
      // atención al cliente, no un WhatsApp personal que vaya a contestar.
      let telefonoGuardado = generica ? normalizarTelefono(promo.telefonoComercio) : null;
      // La búsqueda por categoría a veces no trae dirección y/o teléfono
      // del comercio puntual (la nota de la promo no los menciona, aunque
      // el negocio sí los tenga publicados en otro lado, ej. Google o
      // Instagram) — una vez identificado el nombre real, hacemos siempre
      // una segunda búsqueda puntual para completar lo que falte y, de
      // paso, detectar si tiene varias sucursales.
      let sucursalesGuardadas: { nombre: string | null; direccion: string | null; telefono: string | null }[] = [];
      if (generica) {
        const datos = await buscarDatosFaltantesComercio(nombreGuardado, !direccionGuardada, !telefonoGuardado);
        if (!direccionGuardada && datos.direccion) direccionGuardada = datos.direccion;
        if (!telefonoGuardado && datos.telefono) telefonoGuardado = datos.telefono;
        sucursalesGuardadas = datos.sucursales;
      }
      await guardarPromo(supabase, {
        rubro,
        cadena: nombreGuardado,
        subcategoria,
        direccion: direccionGuardada,
        telefono: telefonoGuardado,
        sucursales: sucursalesGuardadas,
        promo,
      });
      resumen.push({ rubro, cadena: nombreGuardado, resultado: "promo guardada" });
    } catch (err) {
      console.error(`[cron] error con ${cadena} (${rubro}):`, err);
      resumen.push({ rubro, cadena, resultado: `error: ${(err as Error).message}` });
    }
  }

  return NextResponse.json({ ok: true, resumen });
}

/**
 * Convierte un teléfono tal como lo escribió el LLM (puede venir con
 * espacios, guiones, "0341-", "+54 9 341...", etc.) a solo dígitos con
 * código de país, listo para un link wa.me. Si no parece un teléfono
 * argentino con al menos 10 dígitos locales, devuelve null en vez de
 * guardar algo roto.
 */
function normalizarTelefono(crudo: string | null | undefined): string | null {
  if (!crudo) return null;
  const soloDigitos = crudo.replace(/\D/g, "");
  if (soloDigitos.length < 10) return null;
  if (soloDigitos.startsWith("54")) return soloDigitos;
  // Local tipo "0341 15 1234567" o "341 1234567": le agrega 549 (código de
  // Argentina + celular) y sacamos el 0 inicial si lo tiene.
  const sinCero = soloDigitos.replace(/^0/, "");
  return `549${sinCero}`;
}

/** Búsqueda web con Tavily (https://tavily.com) — tier gratis: 1000/mes. */
async function buscarResultadosWeb(
  rubro: string,
  cadena: string,
  generica?: boolean
): Promise<ResultadoWeb[]> {
  let query: string;
  if (generica) {
    // Búsqueda por categoría, no por marca: NO se cita "cadena" entre
    // comillas (sería buscar ese texto literal) — se busca un comercio
    // real y puntual del rubro con una promo concreta.
    // "Rosario Santa Fe" (no solo "Rosario") para no confundir con otras
    // localidades argentinas que también se llaman Rosario (Salta, etc.).
    query = `promoción descuento ${rubro.toLowerCase()} Rosario Santa Fe Argentina este mes nombre, dirección y teléfono o WhatsApp del local`;
  } else if (rubro === "Combustible") {
    // Combustible: los descuentos casi siempre dependen de banco/tarjeta y
    // día de la semana — una consulta genérica trae notas viejas o
    // genéricas que Gemini después descarta por "no concretas".
    query = `descuento "${cadena}" nafta combustible Rosario con qué tarjeta o banco, qué día, qué porcentaje`;
  } else {
    query = `promoción descuento "${cadena}" ${rubro} Rosario Santa Fe este mes`;
  }

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
  resultadosWeb: ResultadoWeb[],
  generica?: boolean
): Promise<PromoExtraida> {
  const hoy = new Date().toISOString().slice(0, 10);
  const contexto = resultadosWeb
    .map((r, i) => `[Fuente ${i + 1}: ${r.url}]\n${r.contenido}`)
    .join("\n\n");

  const exigenciaEspecificidad = `Una promoción es "concreta" solo si incluye al menos un dato puntual además del tipo de descuento (sea %, $, 2x1, combo, etc.): a qué productos/categorías aplica (ej. "heladeras y lavarropas" o "alimento balanceado para perros", nunca una categoría genérica como "productos seleccionados" o el rubro del comercio sin más detalle — ej. "2x1 en PetShop" NO alcanza, tiene que decir en qué productos del petshop), o con qué banco/tarjeta, o qué día. Si el texto es vago y no da NINGÚN detalle puntual más allá del tipo de descuento, tratala como no concreta y devolvé {"encontrada": false} — mejor no mostrar nada que mostrar algo inútil para decidir.

Al armar "condiciones", redactá SIEMPRE en este orden cuando el dato esté disponible: (1) tipo y magnitud del descuento, (2) a qué productos/categorías puntuales aplica, (3) con qué método de pago (si hace falta uno en particular) o si es sin restricción de pago, (4) día/horario si aplica. Ejemplo bueno: "25% de descuento en alimento balanceado para perros y gatos, pagando con Banco Macro, los martes." Ejemplo malo (evitar): "Promoción 2x1 en PetShop" (no dice en qué productos).`;

  const prompt = generica
    ? `Hoy es ${hoy}. Los siguientes son resultados de una búsqueda web sobre promociones/descuentos de comercios del rubro "${rubro}" en Rosario, Santa Fe, Argentina (búsqueda por categoría, no por una marca puntual).

${contexto}

Verificación de ubicación OBLIGATORIA antes de cualquier otra cosa: Argentina tiene varias localidades llamadas "Rosario" (Rosario de Santa Fe es la ciudad grande que nos interesa, pero también existen Rosario de la Frontera y Rosario de Lerma en Salta, entre otras). Si el texto no deja en claro que el comercio está en Rosario, provincia de Santa Fe (por ejemplo porque menciona otra provincia, otro código de área telefónico, u otra ciudad), descartalo directamente: no lo tomes como válido aunque tenga una promoción concreta. Ante la duda, descartalo — es preferible no mostrar nada a mostrar un comercio que no está en Rosario.

Tarea: si, pasada esa verificación, estos resultados describen una promoción vigente y concreta (no vencida) de UN comercio real, específico y confirmado en Rosario (Santa Fe), devolvé sus datos:
- "nombreComercio": el nombre propio de ese negocio, copiado EXACTAMENTE letra por letra tal como aparece escrito en el texto (incluyendo mayúsculas, acentos y cómo esté escrito, ej. "Bistecca" y no "Bistecs" o "Bisteca") — nunca lo parafrasees, acortes ni corrijas de memoria, y nunca uses una descripción genérica como "varias carnicerías".
- "direccionComercio": copiá la dirección SOLO si aparece literalmente en el texto (calle y altura, o al menos el barrio) — nunca la inventes ni la completes a partir de otro comercio con nombre parecido. Si el comercio tiene varias sucursales en Rosario y el texto no aclara cuál, poné "Todas las sucursales en Rosario". Si el texto no da ninguna dirección ni pista de ubicación dentro de Rosario, usá null.
- "telefonoComercio": el teléfono o WhatsApp de ATENCIÓN DIRECTA de ese comercio puntual (no una línea general de la cadena ni un 0800), copiado tal cual aparece en el texto (con o sin 0341, con o sin +54); buscalo con atención, suele aparecer junto a la dirección o en el pie de la página. Si no aparece ningún número, null. No inventes uno.
${exigenciaEspecificidad}
Si no hay ninguna promoción clara, vigente y de un comercio identificable y confirmado en Rosario (Santa Fe), devolvé {"encontrada": false}.
No inventes datos que no estén en el texto: un campo que no se pueda confirmar va en null.`
    : `Hoy es ${hoy}. Los siguientes son resultados de una búsqueda web sobre promociones/descuentos de "${cadena}" (rubro: ${rubro}) en Rosario, Argentina.

${contexto}

Tarea: si estos resultados describen una promoción vigente y concreta (no vencida), devolvé sus datos. ${exigenciaEspecificidad}
Además, completá si podés:
- "direccionComercio": dirección de "${cadena}" en Rosario, si el texto la menciona (calle y altura, o al menos el barrio); si "${cadena}" tiene varias sucursales en Rosario y el texto no aclara cuál, poné "Todas las sucursales en Rosario"; null si no hay ninguna pista.
No completes "telefonoComercio" para esta cadena: es un negocio grande, con línea de atención al cliente, no un WhatsApp personal — dejalo siempre en null.
Si no hay ninguna promoción clara y vigente, devolvé {"encontrada": false}.
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
      nombreComercio: {
        type: "string",
        nullable: true,
        description: "Nombre propio y específico del comercio (solo si la búsqueda es por categoría, no por una marca puntual)",
      },
      direccionComercio: {
        type: "string",
        nullable: true,
        description: "Dirección del comercio, si se menciona en el texto",
      },
      telefonoComercio: {
        type: "string",
        nullable: true,
        description: "Teléfono o WhatsApp del comercio, si se menciona en el texto",
      },
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

interface SucursalExtraida {
  nombre: string | null;
  direccion: string | null;
  telefono: string | null;
}

/**
 * Segunda pasada, solo para comercios de barrio: busca específicamente la
 * dirección y/o el teléfono/WhatsApp de ESE negocio puntual (la búsqueda
 * por categoría de arriba a veces no los trae, aunque el comercio sí los
 * tenga publicados en otro lado, ej. Google o Instagram), y de paso
 * detecta si tiene varias sucursales con dirección/WhatsApp propios (ej.
 * "Bistecca Centro", "Bistecca Alberdi"). Es best-effort: cualquier error
 * acá no debe tirar abajo el guardado de la promo, así que nunca lanza.
 */
async function buscarDatosFaltantesComercio(
  nombreComercio: string,
  faltaDireccion: boolean,
  faltaTelefono: boolean
): Promise<{ direccion: string | null; telefono: string | null; sucursales: SucursalExtraida[] }> {
  const vacio = { direccion: null, telefono: null, sucursales: [] };
  try {
    const res = await fetchConTimeout("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `"${nombreComercio}" Rosario sucursales dirección teléfono whatsapp contacto`,
        search_depth: "basic",
        max_results: 5,
        include_answer: false,
      }),
    });
    if (!res.ok) return vacio;

    const data = await res.json();
    const resultados: { url: string; content: string }[] = data.results ?? [];
    const contexto = resultados
      .filter((r) => r.content?.trim())
      .map((r) => r.content.slice(0, 1200))
      .join("\n\n");
    if (!contexto.trim()) return vacio;

    const pedidos = [
      faltaDireccion
        ? `- "direccion": la dirección de ESE negocio puntual en Rosario (calle y altura, o al menos el barrio) — si tiene una sola boca. Si tiene varias sucursales, dejá esto en null y usá "sucursales" en cambio.`
        : "",
      faltaTelefono
        ? `- "telefono": el teléfono o WhatsApp de contacto de ESE negocio puntual, tal cual aparece — si tiene una sola boca. Si tiene varias sucursales, dejá esto en null y usá "sucursales" en cambio.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const body = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Los siguientes son resultados de una búsqueda web sobre el negocio "${nombreComercio}" en Rosario, Argentina.\n\n${contexto}\n\nTarea: devolvé estos datos SOLO si estás seguro de que son de ESE negocio puntual (no de otro con nombre parecido en otra ciudad):\n${pedidos}\n- "sucursales": SOLO si el texto deja en claro que el negocio tiene VARIAS bocas distintas en Rosario (ej. "Bistecca Centro", "Bistecca Alberdi"), devolvé un array con una entrada por sucursal — cada una con "nombre" (el barrio/zona que la distingue, ej. "Centro", "Alberdi"; null si no hay forma de distinguirla), "direccion" y "telefono" (cada uno null si no se confirma para esa sucursal puntual). Si el negocio tiene una sola boca, o no podés confirmar varias direcciones distintas, devolvé un array vacío.\nNo inventes nada: lo que no se pueda confirmar va en null, y ante la duda de si una dirección es de este negocio o de otro parecido, no la incluyas.`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            direccion: { type: "string", nullable: true },
            telefono: { type: "string", nullable: true },
            sucursales: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nombre: { type: "string", nullable: true },
                  direccion: { type: "string", nullable: true },
                  telefono: { type: "string", nullable: true },
                },
              },
            },
          },
          required: [],
        },
        temperature: 0.1,
      },
    });

    const resGemini = await fetchConTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!resGemini.ok) return vacio;

    const dataGemini = await resGemini.json();
    const texto = dataGemini.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) return vacio;

    const parseado = JSON.parse(texto) as {
      direccion?: string | null;
      telefono?: string | null;
      sucursales?: { nombre?: string | null; direccion?: string | null; telefono?: string | null }[];
    };
    return {
      direccion: parseado.direccion?.trim() || null,
      telefono: normalizarTelefono(parseado.telefono),
      sucursales: (parseado.sucursales ?? [])
        .filter((s) => s.direccion?.trim() || s.telefono?.trim())
        .map((s) => ({
          nombre: s.nombre?.trim() || null,
          direccion: s.direccion?.trim() || null,
          telefono: normalizarTelefono(s.telefono),
        })),
    };
  } catch (err) {
    console.error(`[cron] no se pudieron buscar datos de "${nombreComercio}":`, err);
    return vacio;
  }
}

/** Upsert de comercio + metodo_pago + promocion en Supabase. */
async function guardarPromo(
  supabase: ReturnType<typeof createServiceRoleClient>,
  {
    rubro,
    cadena,
    subcategoria,
    direccion,
    telefono,
    sucursales,
    promo,
  }: {
    rubro: string;
    cadena: string;
    subcategoria?: string;
    direccion?: string | null;
    telefono?: string | null;
    sucursales?: SucursalExtraida[];
    promo: PromoExtraida;
  }
) {
  const { data: rubroRow, error: errRubro } = await supabase
    .from("rubro")
    .select("id")
    .eq("nombre", rubro)
    .single();
  if (errRubro || !rubroRow) throw new Error(`Rubro "${rubro}" no existe en la base`);

  let { data: comercioRow } = await supabase
    .from("comercio")
    .select("id, direccion, telefono")
    .eq("nombre", cadena)
    .eq("rubro_id", rubroRow.id)
    .maybeSingle();

  if (!comercioRow) {
    const { data: nuevoComercio, error: errComercio } = await supabase
      .from("comercio")
      .insert({
        nombre: cadena,
        rubro_id: rubroRow.id,
        subcategoria: subcategoria ?? null,
        direccion: direccion ?? null,
        telefono: telefono ?? null,
      })
      .select("id, direccion, telefono")
      .single();
    if (errComercio) throw errComercio;
    comercioRow = nuevoComercio;
  } else {
    // El comercio ya existía (de una corrida anterior): si hoy conseguimos
    // dirección/teléfono y antes no los tenía, los completamos — nunca
    // borramos un dato bueno que ya estaba guardado con uno vacío de hoy.
    const actualizacion: Record<string, string> = {};
    if (direccion && !comercioRow.direccion) actualizacion.direccion = direccion;
    if (telefono && !comercioRow.telefono) actualizacion.telefono = telefono;
    if (Object.keys(actualizacion).length > 0) {
      await supabase.from("comercio").update(actualizacion).eq("id", comercioRow.id);
    }
  }

  // Sucursales: si hoy encontramos una lista de bocas para este comercio,
  // reemplaza lo que hubiera guardado (la lista completa es más confiable
  // que ir acumulando entradas sueltas de corridas distintas). Si hoy no
  // encontramos ninguna, se deja lo que ya había — no se borra por una
  // búsqueda que no encontró nada esta vez.
  if (sucursales && sucursales.length > 0) {
    await supabase.from("sucursal").delete().eq("comercio_id", comercioRow.id);
    await supabase.from("sucursal").insert(
      sucursales.map((s) => ({
        comercio_id: comercioRow!.id,
        nombre: s.nombre,
        direccion: s.direccion,
        telefono: s.telefono,
      }))
    );
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

  // Evita duplicar: cada comercio tiene como máximo UNA promo activa a la
  // vez (se actualiza cada día, no se acumulan filas por pequeñas
  // diferencias de redacción entre una corrida y otra). Si por una corrida
  // vieja ya quedaron varias activas para el mismo comercio, se actualiza
  // la más reciente y se desactivan las demás (limpieza automática).
  const { data: existentes } = await supabase
    .from("promocion")
    .select("id")
    .eq("comercio_id", comercioRow.id)
    .eq("activa", true)
    .order("fecha_detectada", { ascending: false });

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

  if (existentes && existentes.length > 0) {
    const [masReciente, ...duplicadas] = existentes;
    const { error } = await supabase.from("promocion").update(payload).eq("id", masReciente.id);
    if (error) throw error;
    if (duplicadas.length > 0) {
      await supabase
        .from("promocion")
        .update({ activa: false })
        .in("id", duplicadas.map((d) => d.id));
    }
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
