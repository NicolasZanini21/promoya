-- Esquema inicial de DescuentoHoy (Rosario)
-- Correr en el SQL Editor de Supabase. Idempotente: se puede volver a correr sin romper nada.

create extension if not exists "pgcrypto";

-- Rubros (supermercados, indumentaria, gastronomía, etc.)
create table if not exists rubro (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

-- Comercios / cadenas conocidas de Rosario
create table if not exists comercio (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rubro_id uuid not null references rubro(id) on delete cascade,
  -- Solo se usa hoy para Indumentaria: 'deportiva' | 'formal' | 'casual'
  subcategoria text,
  direccion text,
  lat double precision,
  lng double precision
);
create index if not exists comercio_rubro_idx on comercio(rubro_id);

-- Por si la tabla ya existía de antes de que se agregara esta columna.
alter table comercio add column if not exists subcategoria text;

-- Métodos de pago (tarjeta de tal banco, efectivo, billetera virtual, etc.)
create table if not exists metodo_pago (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

-- Usuarios de la app (perfil liviano; auth real vía Supabase Auth)
create table if not exists usuario (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique, -- referencia a auth.users.id de Supabase Auth
  nombre text,
  telefono_o_email text,
  barrio text,
  ubicacion_lat double precision,
  ubicacion_lng double precision,
  creado_en timestamptz not null default now()
);

-- Por si la tabla ya existía de antes de que se agregara esta columna.
alter table usuario add column if not exists nombre text;

-- A qué rubros está suscripto cada usuario
create table if not exists suscripcion_rubro (
  usuario_id uuid not null references usuario(id) on delete cascade,
  rubro_id uuid not null references rubro(id) on delete cascade,
  primary key (usuario_id, rubro_id)
);

-- Qué métodos de pago tiene cargados cada usuario
create table if not exists usuario_metodo_pago (
  usuario_id uuid not null references usuario(id) on delete cascade,
  metodo_pago_id uuid not null references metodo_pago(id) on delete cascade,
  primary key (usuario_id, metodo_pago_id)
);

-- Promociones detectadas por el job diario
create table if not exists promocion (
  id uuid primary key default gen_random_uuid(),
  comercio_id uuid not null references comercio(id) on delete cascade,
  descuento_porcentaje numeric(5,2),
  descuento_monto numeric(12,2),
  condiciones text,
  tope_reintegro numeric(12,2),
  dias_validos text[], -- ej. ['lunes','miercoles']
  metodo_pago_requerido_id uuid references metodo_pago(id),
  fuente_url text,
  fecha_detectada timestamptz not null default now(),
  fecha_fin date,
  activa boolean not null default true,
  revisada_por_admin boolean not null default false,
  marcada_incorrecta boolean not null default false
);
create index if not exists promocion_comercio_idx on promocion(comercio_id);
create index if not exists promocion_activa_idx on promocion(activa) where activa = true;

-- Notificaciones push disparadas por promos nuevas
create table if not exists notificacion (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuario(id) on delete cascade,
  promocion_id uuid not null references promocion(id) on delete cascade,
  enviada_en timestamptz,
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'ENVIADA', 'FALLIDA'))
);
create index if not exists notificacion_usuario_idx on notificacion(usuario_id);

-- Suscripciones de Web Push por usuario (endpoint del navegador/PWA)
create table if not exists push_subscription (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuario(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creado_en timestamptz not null default now()
);

-- Rubros base para arrancar (ajustar según v1)
insert into rubro (nombre)
values
  ('Supermercados'),
  ('Indumentaria'),
  ('Combustible'),
  ('Carnicerías'),
  ('Verdulerías'),
  ('Gimnasios'),
  ('Gastronomía'),
  ('Farmacias'),
  ('Electrodomésticos y Tecnología'),
  ('Mascotas'),
  ('Delivery')
on conflict (nombre) do nothing;

-- RLS: cada usuario ve y edita solo lo suyo
alter table usuario enable row level security;
alter table suscripcion_rubro enable row level security;
alter table usuario_metodo_pago enable row level security;
alter table push_subscription enable row level security;
alter table notificacion enable row level security;

-- create policy no soporta "if not exists": se borra la de antes (si existe) y se recrea.
drop policy if exists "usuario ve su propia fila" on usuario;
create policy "usuario ve su propia fila"
  on usuario for select using (auth.uid() = auth_user_id);
drop policy if exists "usuario edita su propia fila" on usuario;
create policy "usuario edita su propia fila"
  on usuario for update using (auth.uid() = auth_user_id);
drop policy if exists "usuario crea su propia fila" on usuario;
create policy "usuario crea su propia fila"
  on usuario for insert with check (auth.uid() = auth_user_id);

drop policy if exists "usuario gestiona sus suscripciones" on suscripcion_rubro;
create policy "usuario gestiona sus suscripciones"
  on suscripcion_rubro for all
  using (usuario_id in (select id from usuario where auth_user_id = auth.uid()));

drop policy if exists "usuario gestiona sus metodos de pago" on usuario_metodo_pago;
create policy "usuario gestiona sus metodos de pago"
  on usuario_metodo_pago for all
  using (usuario_id in (select id from usuario where auth_user_id = auth.uid()));

drop policy if exists "usuario gestiona sus push subscriptions" on push_subscription;
create policy "usuario gestiona sus push subscriptions"
  on push_subscription for all
  using (usuario_id in (select id from usuario where auth_user_id = auth.uid()));

drop policy if exists "usuario ve sus notificaciones" on notificacion;
create policy "usuario ve sus notificaciones"
  on notificacion for select
  using (usuario_id in (select id from usuario where auth_user_id = auth.uid()));

-- Rubro, comercio, metodo_pago y promocion son de lectura pública (catálogo)
alter table rubro enable row level security;
alter table comercio enable row level security;
alter table metodo_pago enable row level security;
alter table promocion enable row level security;

drop policy if exists "catalogo rubro lectura publica" on rubro;
create policy "catalogo rubro lectura publica" on rubro for select using (true);
drop policy if exists "catalogo comercio lectura publica" on comercio;
create policy "catalogo comercio lectura publica" on comercio for select using (true);
drop policy if exists "catalogo metodo_pago lectura publica" on metodo_pago;
create policy "catalogo metodo_pago lectura publica" on metodo_pago for select using (true);
drop policy if exists "catalogo promocion lectura publica" on promocion;
create policy "catalogo promocion lectura publica" on promocion for select using (activa = true);
