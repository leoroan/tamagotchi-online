# Modelo de datos, persistencia y anti-cheat

## Principio: local-first, cloud-sync

```
                 ┌──────────────────────────────────────┐
   jugador ──►   │ localStorage (fuente de verdad local) │  ← el juego NUNCA espera la red
                 │  zustand/persist, key versionada      │
                 └───────────────┬──────────────────────┘
                                 │ debounce 5 s + pagehide
                                 ▼
                 ┌──────────────────────────────────────┐
                 │ Supabase (Postgres + RLS)             │
                 │  1 fila por mascota, state jsonb      │
                 └──────────────────────────────────────┘
```

Reglas:
1. **Nunca esperar la red para animar o para guardar.** Se guarda local y listo.
2. **Sincronizar con debounce** (5 s) y en `pagehide`/`visibilitychange`.
3. **Conflictos: last-write-wins** comparando `server_updated_at` (nunca el reloj del cliente).
4. **El servidor es la autoridad del tiempo** (`hatched_at`).

## `PetState` campo por campo

| Campo | Tipo | Para qué |
|---|---|---|
| `schemaVersion` | number | migrar saves viejos |
| `id`, `name`, `speciesId` | string | identidad |
| `eggSeed`, `rngCursor` | number | **todo el azar determinista** de esta mascota |
| `createdAt`, `hatchedAt`, `updatedAt` | number (reloj de juego) | edad, score, catch-up |
| `alive`, `diedAt`, `causeOfDeath` | bool / number / string | muerte y memorial |
| `criticalSince` | number \| null | ventana de gracia para salvarla |
| `stageId`, `status`, `statusUntil` | string / number | estadio y actividad actual |
| `sick` | bool | enfermedad |
| `stats` | 5 números 0..100 | saciedad, ánimo, energía, higiene, salud |
| `traits` | `{careScore, bond, junkLoad, goodCareMs, neglectMs}` | calidad de cuidado (histórica) |
| `counters` | 10 números | estadísticas para mutaciones y balance |
| `mutations` | string[] | multiplicadores + tinte visual |
| `reachedStageIds` | string[] | historial de estadios (requisitos de mutación) |
| `log` | `PetEvent[]` (anillo de 60) | historia visible, debug, telemetría |

Todo serializable a JSON: sin `Map`, sin `Date`, sin clases. Eso permite guardarlo
tal cual en `jsonb` y reconstruirlo en cualquier lado.

### ¿Por qué `state jsonb` y no 40 columnas?

- **Velocidad de iteración:** agregás un stat nuevo y no migrás la tabla.
- **Un solo UPDATE por sync:** no hay riesgo de guardar medio estado.
- **Lo que sí se promueve a columnas** es lo que se consulta/ordena: `stage_id`,
  `stage_order`, `mutation_count`, `alive`, `hatched_at`, `died_at`. Eso lo hace un
  trigger (`sync_pet_columns`), no el cliente.

## SQL (resumen del esquema real)

```sql
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 14),
  species_id text not null,
  schema_version int not null default 1,
  state jsonb not null,                 -- PetState completo
  stage_id text not null default 'egg',
  stage_order int not null default 0,
  mutation_count int not null default 0,
  alive boolean not null default true,
  hatched_at timestamptz not null default now(),  -- autoridad del tiempo (SERVIDOR)
  died_at timestamptz,
  is_public boolean not null default false,
  share_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now()
);
```

Más: `profiles`, `pet_events` (bitácora append-only), `pet_scores` (ranking
materializado), la vista `public_pets` (solo lo que se dibuja) y `leaderboard`.
Archivos: `supabase/migrations/0001_init.sql`, `0002_rls.sql`, `0003_public_and_score.sql`.

## RLS: la seguridad no depende de esconder la key

```sql
create policy "pets: dueño lee" on public.pets for select using (auth.uid() = user_id);
create policy "pets: dueño crea" on public.pets for insert with check (auth.uid() = user_id);
create policy "pets: dueño actualiza" on public.pets for update using (auth.uid() = user_id);
```

- La `anon key` es **pública por diseño**: sin sesión, RLS no devuelve nada.
- La `service_role` key **jamás** en el front (saltea RLS).
- El ranking es de lectura pública, pero **solo el score** (nunca el `state` completo).

## Sync: el código que vas a escribir en Fase 4

```ts
// src/lib/sync.ts (interfaz ya definida)
const push = debounce(async (payload: SavePayload) => {
  await supabase.from('pets').upsert({
    id: pet.id, user_id: userId, name: pet.name, species_id: pet.speciesId,
    schema_version: pet.schemaVersion, state: pet,
    // hatched_at NO se manda: lo escribe el servidor (trigger)
  }, { onConflict: 'id' });
}, 5000);

window.addEventListener('pagehide', () => push.flush());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') push.flush();
});
```

Al abrir en otro dispositivo:

```ts
const { data } = await supabase.from('pets').select('*').eq('user_id', userId);
for (const row of data) {
  const remote = row.state as PetState;
  const local = localPets[row.id];
  const winner = !local || remote.updatedAt > local.updatedAt ? remote : local;
  merge(winner);
}
```

### Detalle importante del merge

Si la mascota vivió offline en dos dispositivos, el merge "last-write-wins" puede
"rebobinar" stats (el estado más nuevo puede tener el hambre más alto o más bajo,
no importa). Para una mascota está bien: es un juego, no un banco. Si algún día
molesta, la solución es guardar **acciones** en vez de estado y re-simular (el RNG
determinista ya te lo permite).

## Anti-cheat: cómo se falsifica el score y cómo se evita

| Ataque | Defensa implementada / planificada |
|---|---|
| Editar el JSON en localStorage | el score **se deriva**; no hay puntos que inyectar |
| Cambiar la hora de la PC | `lib/clock.ts` con offset de servidor; `hatched_at` lo escribe el servidor |
| Editar `hatchedAt` local | el servidor guarda el suyo; `report_score` acota `lived_seconds` contra `now() - hatched_at` |
| Reportar mutaciones que no tiene | `mutations` se promueve desde el `state` que el servidor guarda; verificación real = re-simular |
| Re-simular la semilla para validar | **el RNG es determinista** (`eggSeed` + `rngCursor`): con el mismo estado inicial y las mismas acciones, el servidor obtiene las mismas mutaciones |
| Auto-clicker | límites de tasa en el servidor (Fase 4) y el propio diseño: cuidar bien requiere tiempo real |

### La verificación real (Edge Function, Fase 4+)

```
1. El cliente manda { petId, actions: [...], finalState }.
2. La Edge Function carga el estado inicial desde la DB y re-simula con el core
   (el mismo código, importado tal cual: por eso el core no depende del DOM).
3. Compara mutaciones y score.
4. Si coincide -> verified = true -> ranking serio.
5. Si no -> verified = false: el jugador sigue jugando, pero fuera del ranking.
```

Eso es posible **solo** porque: el core es puro, el azar es determinista y el tiempo
del servidor es la autoridad. Es la razón de fondo de tres decisiones que parecían
"de más" en la Fase 1.

## Migraciones de esquema

| Capa | Mecanismo |
|---|---|
| Store (localStorage) | `persist({ version, migrate })` en `usePetStore.ts` |
| `PetState` | campo `schemaVersion` + `PET_SCHEMA_VERSION` (migrar al cargar) |
| Postgres | archivos numerados en `supabase/migrations/` |

Regla: **cada vez que cambies la forma de `PetState`, subí `PET_SCHEMA_VERSION`** y
agregá la migración. Un save viejo que rompe la app es el peor bug posible en un
juego persistente: el jugador pierde su mascota y no vuelve.
