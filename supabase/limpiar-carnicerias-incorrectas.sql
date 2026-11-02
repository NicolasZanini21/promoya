-- Desactiva las dos carnicerías que se colaron antes del ajuste de
-- geolocalización (una de Jujuy, otra con una dirección inventada que no
-- existe en Rosario). Corré esto una sola vez en el SQL Editor de Supabase.

update promocion
set activa = false
where comercio_id in (
  select id from comercio
  where nombre in ('Carnicería Almita', 'Don Hilario Carniceria')
);
