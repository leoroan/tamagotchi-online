-- ============================================================================
-- 0002_rls.sql — Seguridad por fila (RLS)
--
-- Regla mental: sin política, NO hay acceso. RLS está activo por defecto en
-- Supabase y acá se cierra del todo y se abre lo mínimo.
--
-- Con esto, aunque alguien tenga la publishable key (que es pública), NO puede leer ni
-- escribir mascotas de otros. La seguridad no depende de esconder la key.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.pet_events enable row level security;
alter table public.pet_scores enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────
drop policy if exists "profiles: cada uno ve el suyo" on public.profiles;
create policy "profiles: cada uno ve el suyo"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: cada uno edita el suyo" on public.profiles;
create policy "profiles: cada uno edita el suyo"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── pets ────────────────────────────────────────────────────────────────────
drop policy if exists "pets: dueño lee" on public.pets;
create policy "pets: dueño lee"
  on public.pets for select
  using (auth.uid() = user_id);

drop policy if exists "pets: dueño crea" on public.pets;
create policy "pets: dueño crea"
  on public.pets for insert
  with check (auth.uid() = user_id);

drop policy if exists "pets: dueño actualiza" on public.pets;
create policy "pets: dueño actualiza"
  on public.pets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "pets: dueño borra" on public.pets;
create policy "pets: dueño borra"
  on public.pets for delete
  using (auth.uid() = user_id);

-- ── pet_events ──────────────────────────────────────────────────────────────
drop policy if exists "eventos: dueño lee" on public.pet_events;
create policy "eventos: dueño lee"
  on public.pet_events for select
  using (auth.uid() = user_id);

drop policy if exists "eventos: dueño escribe" on public.pet_events;
create policy "eventos: dueño escribe"
  on public.pet_events for insert
  with check (auth.uid() = user_id);

-- ── pet_scores ──────────────────────────────────────────────────────────────
-- Lectura pública del ranking (solo el score, no el estado del juego).
drop policy if exists "scores: todos leen" on public.pet_scores;
create policy "scores: todos leen"
  on public.pet_scores for select
  using (true);

drop policy if exists "scores: dueño escribe" on public.pet_scores;
create policy "scores: dueño escribe"
  on public.pet_scores for insert
  with check (auth.uid() = user_id);

drop policy if exists "scores: dueño actualiza" on public.pet_scores;
create policy "scores: dueño actualiza"
  on public.pet_scores for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
