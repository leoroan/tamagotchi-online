-- ============================================================================
-- 0001_init.sql — esquema base de Tamagotchi Online (Fase 4)
--
-- Filosofía del modelo: LOCAL-FIRST, CLOUD-SYNC.
--   * El estado completo del juego vive en `pets.state` (jsonb). Es UNA fila por
--     mascota, un solo UPDATE por sync. Simple, rápido, y no hay que migrar la
--     tabla cada vez que agregás un stat nuevo.
--   * Las columnas "promovidas" (stage_id, hatched_at, died_at) existen para
--     poder ORDENAR y FILTRAR sin abrir el jsonb (rankings, visitas, métricas).
--   * `hatched_at` lo escribe el SERVIDOR: es la autoridad del tiempo y del
--     score. El reloj del cliente no se usa para nada crítico.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: datos mínimos del jugador (lo público, no credenciales).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- pets: una fila por mascota.
-- ---------------------------------------------------------------------------
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 14),
  species_id text not null,
  schema_version int not null default 1,

  -- PetState serializado (todo el juego: stats, traits, counters, mutaciones, log)
  state jsonb not null,

  -- columnas promovidas para consultas y rankings
  stage_id text not null default 'egg',
  stage_order int not null default 0,
  mutation_count int not null default 0,
  alive boolean not null default true,

  -- AUTORIDAD DEL TIEMPO: nacimiento según el reloj del servidor
  hatched_at timestamptz not null default now(),
  died_at timestamptz,

  -- compartir (Fase 5)
  is_public boolean not null default false,
  share_slug text unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now()
);

create index if not exists pets_user_id_idx on public.pets (user_id);
create index if not exists pets_public_idx on public.pets (is_public) where is_public;
create index if not exists pets_alive_idx on public.pets (alive);

-- ---------------------------------------------------------------------------
-- pet_events: bitácora append-only.
-- Sirve para: (a) narrar la vida de la mascota, (b) depurar, (c) detectar
-- patrones raros (ej: 500 evoluciones en 2 minutos = trampa).
-- ---------------------------------------------------------------------------
create table if not exists public.pet_events (
  id bigserial primary key,
  pet_id uuid not null references public.pets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pet_events_pet_idx on public.pet_events (pet_id, created_at desc);

-- ---------------------------------------------------------------------------
-- pet_scores: ranking materializado.
-- El score es DERIVADO en el cliente; acá se guarda el último valor reportado
-- junto con si el servidor lo pudo VALIDAR (re-simulando la semilla).
-- `verified = false` no bloquea al jugador: lo separa del ranking serio.
-- ---------------------------------------------------------------------------
create table if not exists public.pet_scores (
  pet_id uuid primary key references public.pets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score bigint not null default 0,
  stage_id text not null default 'egg',
  mutations text[] not null default '{}',
  lived_seconds bigint not null default 0,
  verified boolean not null default false,
  client_reported_at timestamptz,
  computed_at timestamptz not null default now()
);

create index if not exists pet_scores_rank_idx on public.pet_scores (score desc);

-- ---------------------------------------------------------------------------
-- Trigger: mantener updated_at / server_updated_at y promover campos del jsonb.
-- Así el cliente solo manda `state` y la base se encarga del resto: menos
-- superficie para inconsistencias.
-- ---------------------------------------------------------------------------
create or replace function public.sync_pet_columns()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.server_updated_at := now();

  -- Promover desde el jsonb (si vienen).
  new.stage_id := coalesce(new.state ->> 'stageId', new.stage_id);
  new.alive := coalesce((new.state ->> 'alive')::boolean, new.alive);
  new.mutation_count := coalesce(jsonb_array_length(new.state -> 'mutations'), new.mutation_count);

  -- El nacimiento es del SERVIDOR: no se acepta lo que diga el cliente.
  if new.hatched_at is null then
    new.hatched_at := now();
  end if;

  if not new.alive and new.died_at is null then
    new.died_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists pets_sync_columns on public.pets;
create trigger pets_sync_columns
  before insert or update on public.pets
  for each row execute function public.sync_pet_columns();

-- ---------------------------------------------------------------------------
-- Perfil automático al crear el usuario.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(coalesce(new.email, 'jugador'), '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
