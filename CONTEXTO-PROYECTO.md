# PromoYa (antes "DescuentoHoy") — contexto del proyecto

Documento de referencia para retomar el proyecto en otra conversación. Última actualización: 2 de noviembre de 2026.

## Qué es

App web + PWA instalable que muestra promociones y descuentos vigentes por rubro en **Rosario, Argentina**. Un bot corre una vez al día, busca promociones en la web para una lista de comercios/categorías conocidas, las interpreta con un modelo de lenguaje y las guarda en la base. Los usuarios navegan y filtran esas promos desde la app (login con cuenta propia).

## Dónde está todo

- **Código**: local en `D:\DescuentoHoy`, repo de GitHub en `https://github.com/NicolasZanini21/promoya`.
- **Producción**: desplegada en Vercel (plan Hobby, gratis) en `https://promoya-tau.vercel.app`. Se redeploya solo con cada `git push` a `main`.
- **Base de datos**: Supabase (Postgres + Auth). El esquema completo está en `supabase/schema.sql` — es idempotente, se puede re-correr sin romper nada.
- **Presupuesto**: $0. Todo con tiers gratuitos (Vercel Hobby, Supabase free, Tavily free, Gemini free). Esto condiciona varias decisiones de diseño (ver "Limitaciones conocidas").

## Stack técnico

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS.
- Supabase: Postgres, Auth (email/password), Row Level Security.
- `@supabase/ssr` para sesión en cookies (middleware de Next protege las rutas).
- Bot diario: `src/app/api/cron/buscar-promos/route.ts`, disparado por un cron de Vercel (`vercel.json`) con `Authorization: Bearer $CRON_SECRET`.
  - Búsqueda web: Tavily API (tier gratis, 1000 búsquedas/mes).
  - Extracción estructurada: Gemini (`gemini-flash-lite-latest`, tier gratis de Google AI Studio — **límite duro de 15 pedidos/minuto**, por eso el bot pausa 4.5s entre cada comercio).
  - `maxDuration = 280` en la ruta (Vercel Hobby permite hasta 300s).

## Modelo de datos (tablas principales)

- `rubro`: categorías (Supermercados, Combustible, Mascotas, etc.)
- `comercio`: cada negocio — nombre, rubro, dirección, teléfono (WhatsApp, solo comercios chicos), lat/lng.
- `sucursal`: para comercios con varias bocas (ej. "Bistecca Centro", "Bistecca Alberdi") — dirección y WhatsApp propios por sucursal. Si un comercio no tiene filas acá, se usa `comercio.direccion`/`comercio.telefono` directamente.
- `metodo_pago`: texto libre que extrae el bot (ej. "Banco Macro, Banco Ciudad, MODO"). El filtro de la UI lo agrupa en categorías con una lista cerrada de bancos/tarjetas reales (`src/lib/metodo-pago-categorias.ts`), para no mostrar el texto crudo como si fuera una opción confiable.
- `promocion`: una fila por promo activa. Cada comercio tiene **como máximo una promo activa a la vez** — se actualiza in-place, no se acumulan duplicados (dedup por `comercio_id + activa=true`).
- `usuario`, `suscripcion_rubro`, `usuario_metodo_pago`, `push_subscription`, `notificacion`: perfil y preferencias del usuario logueado.

## Cómo busca el bot (`CADENAS_CONOCIDAS_V1` en route.ts)

Dos modos:
1. **Cadena conocida** (ej. "Carrefour", "Shell", "Megatone"): busca promos de esa marca puntual.
2. **Búsqueda genérica por categoría** (ej. "Carnicerías de Rosario", "Veterinarias y petshops de Rosario"): no busca una marca, le pide al LLM que identifique un comercio real y específico entre los resultados, con nombre propio, dirección y WhatsApp si los encuentra. Si no logra identificar un comercio puntual y confirmado en Rosario (Santa Fe, no otra localidad "Rosario" de Argentina), **no guarda nada** — mejor nada que una tarjeta vacía o mal ubicada.

Para comercios genéricos, si la búsqueda principal no trae dirección/teléfono, hay una segunda pasada (`buscarDatosFaltantesComercio`) que busca específicamente esos datos para ese negocio puntual, y de paso detecta si tiene varias sucursales.

## Features ya implementadas

- Login/registro real con Supabase Auth, middleware protegiendo rutas.
- PWA instalable en celular, funciona remoto (no depende de que la PC del usuario esté prendida).
- Filtros: rubro, método de pago (por categoría: Efectivo / Transferencia / Bancos / Tarjetas de crédito / Otros, con desplegable de bancos/tarjetas reales dentro de Bancos y Tarjetas), orden (% de descuento / distancia / rubros frecuentes). En celular, panel deslizable en vez de scroll horizontal.
- Botón de WhatsApp para consultar sobre la promo — solo en comercios chicos/de barrio (las cadenas grandes no lo tienen, tienen atención al cliente formal). Si el comercio tiene varias sucursales con WhatsApp propio, muestra un desplegable "Elegí tu sucursal".
- Logos de comercio: dominio fijo conocido (`src/lib/comercio-logos.ts`) + favicon vía Google (gratis) como respaldo; si no hay ninguno disponible, un avatar con la inicial del nombre (nunca queda en blanco).
- Deduplicación de promos y exigencia de especificidad en las condiciones (rechaza promos vagas tipo "productos seleccionados" sin decir cuáles).

## Limitaciones conocidas (por el presupuesto $0 y el enfoque)

- **Logos reales**: no se pueden traer fotos de perfil de Instagram/Facebook de los comercios sin acceso autenticado a la API de Meta (requiere verificación de negocio). El avatar con inicial es la solución actual.
- **Favicons**: el servicio gratis de Google (`google.com/s2/favicons`) no tiene garantía ni SLA — para comercios chicos sin web propia, simplemente no hay favicon que traer.
- **Datos de sucursales/Google Maps**: lo que muestra el panel de negocios de Google (como el ejemplo de "Bistecca" con 4 sucursales en el mapa) no es accesible vía scraping simple — el bot arma la lista de sucursales con lo que encuentre en texto indexado por Tavily, así que puede quedar incompleta.
- **Veracidad de las promos**: el bot no puede verificar al 100% que una promo siga vigente o sea exacta — depende de qué tan actualizada esté la página que Tavily indexó.
- **Cuota de Gemini**: 15 pedidos/minuto en el tier gratis. Con ~20 comercios + búsquedas de respaldo, el bot ya está ajustado para no pasarse, pero correr el cron manualmente varias veces seguidas en poco tiempo puede agotarla (da error 429, hay que esperar ~1 minuto).
- **Sin testing automatizado ni CI**: todo se prueba corriendo el cron a mano y mirando la UI.
- **Sin notificaciones push reales todavía** (hay una tabla `push_subscription` preparada pero no implementado el envío).

## Cómo se trabaja en este proyecto (flujo típico)

1. Cambios de código se hacen en este chat (sesión en la nube), se sincronizan al `D:\DescuentoHoy` del usuario vía un puente a su PC.
2. El usuario prueba primero en local (`npm run dev` + `curl` al cron local en `localhost:3000`) antes de subir nada a producción — así se evita ir y venir de Vercel por cada prueba chica.
3. Cuando algo queda validado, se junta todo en un commit y se sube (`git add . && git commit -m "..." && git push`), lo que dispara el redeploy automático en Vercel.
4. Cambios de esquema de base (`supabase/schema.sql`, o scripts puntuales como `supabase/limpiar-duplicados.sql`) se corren a mano en el SQL Editor de Supabase — es un paso manual, no se automatiza desde el bot.

## Pendientes / ideas para más adelante

- Limpieza automática de comercios "genéricos" que quedaron desactualizados si no se reconfirman en varias corridas (hoy solo se evita que se dupliquen, pero un comercio malo que entró una vez puede quedar colgado si después nunca se vuelve a encontrar nada nuevo de esa categoría).
- Notificaciones push reales.
- Filtro de fechas más preciso.
- Revisar si vale la pena invertir en un servicio de logos pago más adelante (hoy no, por presupuesto).
