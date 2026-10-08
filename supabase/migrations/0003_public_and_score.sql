-- ============================================================================
-- 0003_public_and_score.sql — mascotas públicas (Fase 5) y score validado.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Vista pública: lo MÍNIMO necesario para mostrar la mascota de un amigo.
-- Nunca expone `state` completo: solo lo que la pantalla necesita.
-- ---------------------------------------------------------------------------
create or replace view public.public_pets
with (security_invoker = false)
as
select
  p.id,
  p.name,
  p.species_id,
  p.stage_id,
  p.stage_order,
  p.mutation_count,
  p.alive,
  p.hatched_at,
  p.died_at,
  p.share_slug,
  -- El dueño puede publicar un nombre de jugador; el resto es anónimo.
  coalesce(pr.display_name, 'alguien') as owner_name,
  -- El estado se recorta a lo que se dibuja y se puntúa (nada de log privado).
  jsonb_build_object(
    'stageId', p.state -> 'stageId',
    'speciesId', p.state -> 'speciesId',
    'mutations', coalesce(p.state -> 'mutations', '[]'::jsonb),
    'stats', p.state -> 'stats'
  ) as public_state
from public.pets p
left join public.profiles pr on pr.id = p.user_id
where p.is_public = true;

-- ---------------------------------------------------------------------------
-- Reportar score.
-- El cliente manda su cálculo; el servidor lo guarda y lo marca como NO
-- verificado. La verificación real (re-simular la semilla) es trabajo de un
-- Edge Function: ver docs/04-modelo-de-datos.md.
--
-- Idea clave: el servidor NUNCA confía en `lived_seconds` del cliente sin
-- comparar contra `hatched_at` (que escribió él mismo).
-- ---------------------------------------------------------------------------
create or replace function public.report_score(
  p_pet_id uuid,
  p_score bigint,
  p_mutations text[],
  p_lived_seconds bigint
)
returns public.pet_scores
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_pet public.pets;
  v_max_seconds bigint;
  v_row public.pet_scores;
begin
  if v_user is null then
    raise exception 'Necesitás iniciar sesión';
  end if;

  select * into v_pet from public.pets where id = p_pet_id and user_id = v_user;
  if not found then
    raise exception 'Esa mascota no es tuya';
  end if;

  -- Tope físico: no puede haber vivido más segundos que los que pasaron desde
  -- el nacimiento según el reloj del servidor.
  v_max_seconds := extract(epoch from (now() - v_pet.hatched_at))::bigint;

  insert into public.pet_scores (pet_id, user_id, score, stage_id, mutations, lived_seconds, verified, client_reported_at)
  values (
    p_pet_id,
    v_user,
    greatest(0, p_score),
    v_pet.stage_id,
    coalesce(p_mutations, '{}'),
    least(greatest(0, p_lived_seconds), v_max_seconds),
    false,
    now()
  )
  on conflict (pet_id) do update
    set score = excluded.score,
        stage_id = excluded.stage_id,
        mutations = excluded.mutations,
        lived_seconds = excluded.lived_seconds,
        client_reported_at = now(),
        computed_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ranking público: solo scores verificados en el ranking "serio"; los no
-- verificados se listan aparte (transparencia sin bloquear a nadie).
-- ---------------------------------------------------------------------------
create or replace view public.leaderboard
as
select
  s.pet_id,
  s.score,
  s.stage_id,
  s.mutations,
  s.lived_seconds,
  s.verified,
  s.computed_at,
  coalesce(pr.display_name, 'alguien') as owner_name
from public.pet_scores s
left join public.profiles pr on pr.id = s.user_id
where s.score > 0
order by s.score desc
limit 200;
