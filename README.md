# PromoYa — Rosario

App que busca automáticamente todos los días las promociones vigentes por
rubro en Rosario, las guarda normalizadas y las muestra ordenadas por mayor
descuento, filtradas por método de pago y distancia. Avisa por notificación
push cuando aparece algo nuevo en los rubros del usuario, y también permite
consultar on-demand.

Una sola app web responsive: funciona en el navegador de escritorio (sidebar
+ grilla) y se instala como PWA en el celular (bottom nav + notificaciones
push), con los mismos datos y el mismo backend. Ver el spec completo:
https://claude.ai/artifact/LpdkKHDSRYgngCtUCCXbKY

## Stack

- Next.js 16 + React 19 + TypeScript + Tailwind CSS (App Router)
- Supabase (Postgres, Auth, Realtime)
- PWA con service worker propio (`public/sw.js`) para Web Push
- Job diario vía Vercel Cron (`vercel.json` → `/api/cron/buscar-promos`)

## Primeros pasos

```bash
npm install
cp .env.example .env.local   # completar con las keys de tu proyecto de Supabase
npm run dev
```

Abrí http://localhost:3000. Con la ventana angosta (o el modo celular de las
devtools) se ve el layout de celular; en ancho de escritorio, el de sidebar.

Hoy las pantallas usan datos de muestra (`src/lib/mock-data.ts`) para poder
ver y ajustar el diseño sin depender todavía de Supabase ni del job real.

## Conectar Supabase

1. Crear un proyecto en https://supabase.com.
2. Correr `supabase/schema.sql` en el SQL Editor del proyecto (crea las
   tablas del modelo de datos y las políticas de RLS).
3. Completar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
   `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`.
4. Reemplazar `src/lib/mock-data.ts` por consultas reales (`src/lib/supabase/client.ts`
   para componentes de cliente, `server.ts` para Server Components y el cron).

## El job diario (el bot)

`src/app/api/cron/buscar-promos/route.ts` ya busca de verdad: por cada
cadena conocida de `CADENAS_CONOCIDAS_V1`, busca en la web con **Tavily**,
le pasa los resultados a **Gemini Flash** para extraer descuento/condiciones
en JSON, y guarda (o actualiza) la promo en Supabase.

Las dos APIs son gratis con este volumen de uso:

1. **Tavily**: crear cuenta en https://app.tavily.com (gratis hasta
   1000 búsquedas/mes) y copiar la API key a `TAVILY_API_KEY`.
2. **Gemini**: crear una API key gratis en https://aistudio.google.com/apikey
   (sin tarjeta) y copiarla a `GEMINI_API_KEY`.
3. Con Supabase ya conectado (`NEXT_PUBLIC_SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`) y el esquema cargado, probar el endpoint a
   mano:

   ```bash
   curl http://localhost:3000/api/cron/buscar-promos -H "Authorization: Bearer <CRON_SECRET>"
   ```

Por ahora `CADENAS_CONOCIDAS_V1` tiene 2-3 cadenas por rubro a propósito
(ver spec > "Puntos a investigar") — conviene revisar a mano la calidad de
lo que extrae antes de sumar más cadenas o escalar a toda la ciudad. Falta
todavía: marcar como vencida una promo cuando pasa su `fecha_fin`, y
disparar la notificación push cuando la promo guardada es nueva (hoy el
`guardarPromo` tiene un TODO ahí, pendiente del paso de notificaciones).

Para las notificaciones reales falta generar las claves VAPID
(`npx web-push generate-vapid-keys`), guardar las suscripciones push de cada
usuario (tabla `push_subscription`) y, en el cron, llamar a `web-push` con
esas claves cuando se detecta una promo nueva en un rubro suscripto.

## Estructura

```
src/
  app/              páginas (Inicio, Rubros, Buscar, Perfil, detalle de promo, cron)
  components/       AppShell, Sidebar, BottomNav, PromoCard, Filters, PWA
  lib/supabase/     clientes de Supabase (browser, server, service role)
  lib/mock-data.ts  datos de muestra
  types/            tipos del modelo de datos
supabase/schema.sql esquema de la base (tablas + RLS)
public/manifest.json, sw.js, icons/   PWA
```
