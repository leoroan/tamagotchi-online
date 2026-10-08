import { getSpecies } from '@/content/species';
import { DEFAULT_CONFIG, type GameConfig } from './config';
import { FIRST_STAGE_ID, getNextStage, getStage } from './lifecycle';
import { rollMutation } from './mutations';
import { clampStat, pushEvent, PET_SCHEMA_VERSION } from './pet';
import { nextRandom } from './rng';
import type { PetEvent, PetState, StatKey } from './types';

/**
 * SIMULACIÓN: el corazón del juego.
 *
 * Dos ideas que hacen que la mascota "viva" sin que el jugador esté mirando:
 *
 * 1) El estado guarda CUÁNDO fue la última simulación (`updatedAt`, reloj de
 *    juego). Al volver a entrar no hay que "reproducir" nada raro: se calcula
 *    cuánto tiempo pasó y se simula de corrido (catch-up).
 *
 * 2) El core NUNCA mira el reloj real. Recibe milisegundos transcurridos. Eso
 *    permite acelerar x60 en desarrollo sin romper nada, y testear "pasaron 8
 *    horas" en un test de 1 ms.
 */
export interface AdvanceResult {
  state: PetState;
  events: PetEvent[];
  /** Monedas que la sim pagó (evoluciones). El store decide qué hacer con ellas. */
  coinDelta: number;
}

/**
 * Función principal: hace avanzar la mascota.
 * @param realElapsedMs tiempo REAL transcurrido (lo mide el adaptador, no el core)
 */
export function advance(
  state: PetState,
  realElapsedMs: number,
  options: { config?: GameConfig; maxCatchUpMs?: number } = {},
): AdvanceResult {
  const config = options.config ?? DEFAULT_CONFIG;
  const cap = options.maxCatchUpMs ?? config.maxOfflineCatchUpMs;
  let remaining = Math.max(0, Math.min(realElapsedMs * config.speed, cap));

  const events: PetEvent[] = [];
  let coinDelta = 0;
  let current = state;

  while (remaining > 0) {
    // Pasos gruesos cuando el salto es grande: 12 h en pasos de 250 ms son 172k
    // iteraciones al pedo. Con 15 s alcanza y sobra (todas las tasas son lineales).
    const coarse = remaining > config.coarseThresholdMs;
    const step = Math.min(coarse ? config.coarseTickMs : config.tickMs, remaining);
    if (step <= 0) break; // guarda contra configs rotas (no colgar nunca el browser)
    const out = tick(current, step, config);
    current = out.state;
    if (out.events.length > 0) events.push(...out.events);
    coinDelta += out.coinDelta;
    remaining -= step;
    if (!current.alive) break;
  }

  return { state: current, events, coinDelta };
}

/** Un paso de simulación. Determinista: mismas entradas => misma salida. */
export function tick(state: PetState, dtMs: number, config: GameConfig = DEFAULT_CONFIG): AdvanceResult {
  if (!state.alive || dtMs <= 0) return { state, events: [], coinDelta: 0 };

  const dtMin = dtMs / 60000;
  const now = state.updatedAt + dtMs;
  const events: PetEvent[] = [];
  let coinDelta = 0;
  const species = getSpecies(state.speciesId);
  const isEgg = state.stageId === FIRST_STAGE_ID;
  const sleeping = state.status === 'sleeping';

  // ── Huevo: no decae, solo espera la eclosión ─────────────────────────────
  if (isEgg) {
    const evolved = tryEvolve({ ...state, updatedAt: now }, now, events, species.growthModifier);
    coinDelta += evolved.coinDelta;
    return { state: evolved.state, events, coinDelta };
  }

  // ── 1. Decaimiento de stats ─────────────────────────────────────────────
  const stats = { ...state.stats };
  const decayKeys: StatKey[] = ['hunger', 'happiness', 'energy', 'hygiene'];
  for (const key of decayKeys) {
    if (isEgg) continue;
    const modifier = species.decayModifiers[key] ?? 0;
    let change = -config.stats[key].decayPerMinute * (1 + modifier) * dtMin;
    if (sleeping) {
      if (key === 'hunger') change *= config.sleep.hungerDecayMultiplier;
      if (key === 'energy') change = config.sleep.energyGainPerMinute * dtMin;
      if (key === 'happiness') change += config.sleep.happinessGainPerMinute * dtMin;
    }
    stats[key] = clampStat(stats[key] + change);
  }

  // ── 2. Cuidado: careScore, vínculo, errores ──────────────────────────────
  const care = state.traits.careScore;
  const neglectful =
    stats.hunger <= config.care.neglectAt || stats.hygiene <= config.care.neglectAt || stats.happiness <= config.care.neglectAt;
  const wellCared = stats.hunger > config.care.goodAt && stats.hygiene > config.care.goodAt && stats.happiness > config.care.goodAt;
  const target = neglectful ? 0 : wellCared ? 100 : care;
  const halfLife = Math.max(1, config.care.halfLifeMinutes);
  const smoothing = 1 - Math.pow(0.5, dtMin / halfLife);
  const maxStep = (wellCared ? config.care.gainPerMinute : config.care.decayPerMinute) * dtMin;
  const rawDelta = (target - care) * smoothing;
  const capped = Math.max(-maxStep, Math.min(maxStep, rawDelta));
  const careScore = clampStat(care + capped);

  let bond = state.traits.bond;
  bond = clampStat(bond + (wellCared ? config.care.bondGainPerMinute : -config.care.bondDecayPerMinute) * dtMin);
  const junkLoad = clampStat(state.traits.junkLoad - 0.4 * dtMin);

  let counters = state.counters;
  // Errores de cuidado: se cuenta el CRUCE hacia zona crítica (no cada tick).
  const crossed = decayKeys.filter(
    (key) => state.stats[key] > config.stats[key].criticalAt && stats[key] <= config.stats[key].criticalAt,
  );
  for (const key of crossed) {
    events.push({ at: now, type: 'care_mistake', detail: `${key} en rojo: la dejaste caer.` });
  }
  if (crossed.length > 0) {
    counters = { ...counters, careMistakes: counters.careMistakes + crossed.length };
  }

  // ── 3. Enfermedad (probabilística, determinista por semilla) ─────────────
  let rngCursor = state.rngCursor;
  let sick = state.sick;
  let riskFactor = 0;
  if (stats.hygiene <= config.care.neglectAt) riskFactor += config.illness.filthMultiplier;
  if (stats.hunger <= config.stats.hunger.criticalAt) riskFactor += config.illness.hungerMultiplier;
  riskFactor += (junkLoad / 100) * config.illness.junkLoadMultiplier;
  if (!sick && riskFactor > 0) {
    const chance = config.illness.chancePerMinute * dtMin * Math.max(1, riskFactor);
    if (chance > 0) {
      const roll = nextRandom(state.eggSeed, rngCursor);
      rngCursor = roll.cursor;
      if (roll.value < chance) {
        sick = true;
        counters = { ...counters, illnessEpisodes: counters.illnessEpisodes + 1 };
        events.push({ at: now, type: 'sick', detail: 'Se enfermó. Dale medicina o va a empeorar.' });
      }
    }
  }

  // ── 4. Salud: se regenera cuidando y se hunde descuidando ────────────────
  let healthDelta = 0;
  if (stats.hunger <= 0.5) healthDelta -= config.health.starvePenaltyPerMinute * dtMin;
  if (stats.hygiene <= 5) healthDelta -= config.health.filthPenaltyPerMinute * dtMin;
  if (stats.happiness <= 0.5) healthDelta -= config.health.sadPenaltyPerMinute * dtMin;
  if (sick) healthDelta -= config.health.sickPenaltyPerMinute * dtMin;
  if (wellCared && !sick) healthDelta += config.health.regenPerMinute * dtMin;
  stats.health = clampStat(stats.health + healthDelta);

  if (!sick && stats.health < config.health.sickBelowHealth) sick = true;
  if (sick && stats.health > config.health.sickBelowHealth + 5) sick = false;

  // ── 5. Muerte: salud en 0 abre una "gracia" para poder salvarla ─────────
  let criticalSince = state.criticalSince;
  // Ojo: `state.alive` está narrowed a `true` por el guard de arriba => anotar el tipo.
  let alive: boolean = state.alive;
  let diedAt = state.diedAt;
  let causeOfDeath = state.causeOfDeath;
  if (stats.health <= config.health.deathBelowHealth) {
    if (criticalSince === null) {
      criticalSince = now;
      events.push({ at: now, type: 'critical', detail: '¡Salud en cero! Tenés minutos para darle medicina.' });
    } else if (now - criticalSince >= config.health.graceMs) {
      alive = false;
      diedAt = now;
      causeOfDeath = stats.hunger <= 0.5 ? 'abandono / inanición' : sick ? 'enfermedad' : 'negligencia';
      events.push({ at: now, type: 'died', detail: `Murió (${causeOfDeath}). El tiempo de juego se detiene acá.` });
    }
  } else {
    criticalSince = null;
  }

  // ── 6. Cambio de estadio (evolución) ────────────────────────────────────
  let status = state.status;
  let statusUntil = state.statusUntil;
  let stageId = state.stageId;
  const reached = [...state.reachedStageIds];
  let mutations = [...state.mutations];
  let evolutions = counters.evolutions;

  if (alive) {
    const ageMs = now - state.hatchedAt;
    const next = getNextStage(state.stageId);
    const noAging = mutations.includes('eterno');
    if (next && !noAging && ageMs >= next.enterAgeMs * species.growthModifier && careScore >= next.minCareScore) {
      stageId = next.id;
      reached.push(next.id);
      evolutions += 1;
      coinDelta += next.coinReward;
      status = 'evolving';
      statusUntil = now + 2500;
      events.push({ at: now, type: 'evolved', detail: `¡Evolucionó a ${next.label}! +${next.coinReward} monedas` });

      const rolled = rollMutation({ ...state, stageId, traits: { ...state.traits, careScore, bond, junkLoad }, counters: { ...counters, evolutions } });
      rngCursor = rolled.state.rngCursor;
      if (rolled.mutation) {
        mutations = [...mutations, rolled.mutation.id];
        events.push({ at: now, type: 'mutated', detail: `¡MUTACIÓN ${rolled.mutation.name} (${rolled.mutation.rarity})! x${rolled.mutation.scoreMultiplier} score` });
      }
    }
  }

  // ── 7. Fin de la actividad actual ───────────────────────────────────────
  if (alive && statusUntil !== null && now >= statusUntil) {
    const wasSleeping = status === 'sleeping';
    status = 'idle';
    statusUntil = null;
    if (wasSleeping) events.push({ at: now, type: 'woke', detail: 'Se despertó sola.' });
  }

  const nextState: PetState = {
    ...state,
    schemaVersion: PET_SCHEMA_VERSION,
    alive,
    diedAt,
    causeOfDeath,
    criticalSince,
    updatedAt: now,
    stageId,
    status: alive ? status : 'dead',
    statusUntil: alive ? statusUntil : null,
    sick,
    stats,
    traits: { ...state.traits, careScore, bond, junkLoad },
    counters: { ...counters, evolutions },
    mutations,
    reachedStageIds: reached,
    rngCursor,
    log: events.reduce((log, event) => pushEvent(log, event), state.log),
  };

  return { state: nextState, events, coinDelta };
}

/** Chequeo de evolución aislado (lo usa el camino del huevo). */
function tryEvolve(
  state: PetState,
  now: number,
  events: PetEvent[],
  growthModifier: number,
): { state: PetState; coinDelta: number } {
  const next = getNextStage(state.stageId);
  if (!next) return { state, coinDelta: 0 };
  const ageMs = now - state.hatchedAt;
  if (ageMs < next.enterAgeMs * growthModifier) return { state: { ...state, updatedAt: now }, coinDelta: 0 };

  const evolved: PetState = {
    ...state,
    stageId: next.id,
    reachedStageIds: [...state.reachedStageIds, next.id],
    counters: { ...state.counters, evolutions: state.counters.evolutions + 1 },
    status: 'evolving',
    statusUntil: now + 2500,
    log: pushEvent(state.log, { at: now, type: 'evolved', detail: `¡Eclosionó! Ahora es ${getStage(next.id).label}.` }),
  };
  events.push({ at: now, type: 'evolved', detail: `¡Eclosionó! Ahora es ${next.label}. +${next.coinReward} monedas` });
  return { state: evolved, coinDelta: next.coinReward };
}
