-- Limpieza única de promos activas duplicadas (más de una fila "activa=true"
-- para el mismo comercio). Deja activa solo la más reciente por comercio y
-- desactiva el resto. Corré esto UNA SOLA VEZ en el SQL Editor de Supabase.
-- De acá en adelante el bot ya no debería volver a duplicar (ver el nuevo
-- código de deduplicación en /api/cron/buscar-promos).

with ranking as (
  select
    id,
    comercio_id,
    row_number() over (
      partition by comercio_id
      order by fecha_detectada desc
    ) as orden
  from promocion
  where activa = true
)
update promocion
set activa = false
where id in (
  select id from ranking where orden > 1
);
