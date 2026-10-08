import { getFood } from '@/content/foods';
import { DEFAULT_SPECIES_ID, getSpecies } from '@/content/species';
import { DAY_MS, HOUR_MS, FIRST_STAGE_ID, getStage } from './lifecycle';
import { randomId, randomSeed } from './rng';
import { checkActivity, isBusy, isSleeping, startActivity } from './stateMachine';
import { DEFAULT_CONFIG, type GameConfig } from './config';
import { MAX_EVENT_LOG } from './types';
import type { ActionResult, PetAction, PetEvent, PetState, StatKey, Stats } from './types';

export const PET_SCHEMA_VERSION = 1;

/**
 * Acciones del jugador. Todas devuelven un estado NUEVO (nada de mutar a mano:
 * así la UI se actualiza sola, y podés guardar un historial si querés deshacer).
 */

export interface ActionContext {
  now: number;
  /** Monedas disponibles. El core valida, el store paga. */
  coins?: number;
  config?: GameConfig;
}

export function clampStat(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function applyStatDelta(stats: Stats, delta: Partial<Stats>): Stats {
  const next: Stats = { ...stats };
  (Object.keys(delta) as StatKey[]).forEach((key) => {
    const change = delta[key];
    if (typeof change === 'number') next[key] = clampStat(next[key] + change);
  });
  return next;
}

/** Recorta el log a un anillo: el save no puede crecer sin control. */
export function pushEvent(log: readonly PetEvent[], event: PetEvent): PetEvent[] {
  const next = [...log, event];
  return next.length > MAX_EVENT_LOG ? next.slice(next.length - MAX_EVENT_LOG) : next;
}

/**
 * Crea un HUEVO. El huevo no decae ni se puede cuidar: es la pantalla de
 * "elegir y esperar". La semilla define toda su vida futura (especie, mutaciones).
 */
export function createEggState(options: {
  now: number;
  name?: string;
  speciesId?: string;
  seed?: number;
  id?: string;
}): PetState {
  const seed = options.seed ?? randomSeed();
  return {
    schemaVersion: PET_SCHEMA_VERSION,
    id: options.id ?? randomId('pet'),
    speciesId: options.speciesId ?? DEFAULT_SPECIES_ID,
    name: options.name ?? 'Sin nombre',
    eggSeed: seed,
    rngCursor: 0,
    createdAt: options.now,
    hatchedAt: options.now,
    updatedAt: options.now,
    alive: true,
    diedAt: null,
    causeOfDeath: null,
    criticalSince: null,
    stageId: FIRST_STAGE_ID,
    status: 'idle',
    statusUntil: null,
    sick: false,
    stats: { hunger: 70, happiness: 70, energy: 70, hygiene: 90, health: 100 },
    traits: { careScore: 70, bond: 30, junkLoad: 0, goodCareMs: 0, neglectMs: 0 },
    counters: {
      meals: 0,
      junkMeals: 0,
      overfeeds: 0,
      playSessions: 0,
      sleepSessions: 0,
      baths: 0,
      medicines: 0,
      careMistakes: 0,
      illnessEpisodes: 0,
      evolutions: 0,
    },
    mutations: [],
    reachedStageIds: [FIRST_STAGE_ID],
    log: [{ at: options.now, type: 'hatched', detail: 'Un huevo apareció. Todo lo que pase después depende de vos.' }],
  };
}

export function getAgeMs(state: PetState, now: number): number {
  return Math.max(0, (state.alive ? now : state.diedAt ?? now) - state.hatchedAt);
}

/** "2 d 4 h", "18 min"… legible para HUD. */
export function formatAge(ageMs: number): string {
  if (ageMs < HOUR_MS) return `${Math.floor(ageMs / 60000)} min`;
  if (ageMs < DAY_MS) return `${Math.floor(ageMs / HOUR_MS)} h ${Math.floor((ageMs % HOUR_MS) / 60000)} min`;
  return `${Math.floor(ageMs / DAY_MS)} d ${Math.floor((ageMs % DAY_MS) / HOUR_MS)} h`;
}

export function isDirty(state: PetState): boolean {
  return state.stats.hygiene < 40;
}

export function isCritical(state: PetState): boolean {
  return state.alive && (state.criticalSince !== null || state.stats.health <= 20);
}

export type Mood = 'feliz' | 'tranqui' | 'triste' | 'enferma' | 'hambrienta' | 'agotada' | 'sucia' | 'muerta';

/** Ánimo derivado: lo usa el HUD y el renderer para elegir la carita. */
export function getMood(state: PetState): Mood {
  if (!state.alive) return 'muerta';
  if (state.sick || state.stats.health < 45) return 'enferma';
  if (state.stats.hunger <= 20) return 'hambrienta';
  if (state.stats.energy <= 15) return 'agotada';
  if (state.stats.hygiene < 35) return 'sucia';
  if (state.stats.happiness <= 25) return 'triste';
  if (state.stats.happiness >= 70 && state.stats.hunger >= 45) return 'feliz';
  return 'tranqui';
}

/** 0..1: proporción histórica de tiempo bien cuidado. */
export function getCareRatio(state: PetState): number {
  const total = state.traits.goodCareMs + state.traits.neglectMs;
  if (total <= 0) return state.traits.careScore / 100;
  return state.traits.goodCareMs / total;
}

/** Texto humano del estado actual (lo usa el HUD y el log). */
export function describeStatus(state: PetState, now: number): string {
  if (!state.alive) return `${state.name} ya no está (${state.causeOfDeath ?? 'causa desconocida'}).`;
  if (state.stageId === FIRST_STAGE_ID) return 'Todavía es un huevo. Esperá a que eclosione.';
  const stage = getStage(state.stageId);
  const mood = getMood(state);
  const age = formatAge(getAgeMs(state, now));
  return `${state.name} · ${stage.label} · ${mood} · ${age}`;
}

function result(state: PetState, events: PetEvent[], ok = true, reason?: string, coinDelta?: number): ActionResult {
  return coinDelta === undefined ? { state, ok, events, ...(reason ? { reason } : {}) } : { state, ok, events, coinDelta, ...(reason ? { reason } : {}) };
}

/**
 * Único punto de entrada de las acciones del jugador.
 * Todo lo que pasa en el juego entra por acá => si algo se puede explotar,
 * se ve en un solo archivo.
 */
export function applyAction(state: PetState, action: PetAction, context: ActionContext): ActionResult {
  const config = context.config ?? DEFAULT_CONFIG;
  const now = context.now;
  const coins = context.coins ?? Number.POSITIVE_INFINITY;

  if (action.type === 'rename') {
    const name = action.name.trim().slice(0, 14) || state.name;
    return result({ ...state, name, updatedAt: now }, []);
  }

  if (!state.alive) return result(state, [], false, 'Ya no está… no se puede hacer nada.');

  if (action.type === 'wake') {
    if (!isSleeping(state)) return result(state, [], false, 'No está durmiendo');
    const event: PetEvent = { at: now, type: 'woke', detail: 'La despertaste.' };
    return result({ ...startActivity(state, 'idle', now), updatedAt: now, log: pushEvent(state.log, event) }, [event]);
  }

  if (action.type === 'sleep') {
    const check = checkActivity(state, 'sleeping');
    if (!check.ok) return result(state, [], false, check.reason);
    const event: PetEvent = { at: now, type: 'slept', detail: 'Se fue a dormir.' };
    const next = startActivity(state, 'sleeping', now, config.sleep.autoWakeAfterMs);
    return result(
      {
        ...next,
        updatedAt: now,
        counters: { ...state.counters, sleepSessions: state.counters.sleepSessions + 1 },
        log: pushEvent(state.log, event),
      },
      [event],
    );
  }

  if (action.type === 'feed') {
    const food = getFood(action.foodId);
    if (!food) return result(state, [], false, 'Esa comida no existe');
    const check = checkActivity(state, 'eating');
    if (!check.ok) return result(state, [], false, check.reason);
    if (food.cost > coins) return result(state, [], false, `Sin monedas: te faltan ${food.cost - coins}`);

    const species = getSpecies(state.speciesId);
    const favourite = species.favoriteFoodIds.includes(food.id);
    const overfeed = state.stats.hunger >= 92;
    const happinessGain = food.happiness * (favourite ? 1.6 : 1) - (overfeed ? 4 : 0);

    const events: PetEvent[] = [
      {
        at: now,
        type: 'fed',
        detail: `Comió ${food.name}${favourite ? ' (¡su favorita!)' : ''}${overfeed ? ' con la panza llena…' : ''}`,
      },
    ];
    if (overfeed) {
      events.push({ at: now, type: 'care_mistake', detail: 'Sobre alimentación: le cayó mal. No es un bug, es un límite.' });
    }

    const stats = applyStatDelta(state.stats, {
      hunger: food.hunger,
      happiness: happinessGain,
      energy: food.energy,
      health: food.health - (overfeed ? 4 : 0),
    });

    const next = startActivity(state, 'eating', now);
    return result(
      {
        ...next,
        stats,
        updatedAt: now,
        traits: { ...state.traits, junkLoad: clampStat(state.traits.junkLoad + food.junkLoad) },
        counters: {
          ...state.counters,
          meals: state.counters.meals + 1,
          junkMeals: state.counters.junkMeals + (food.junk ? 1 : 0),
          overfeeds: state.counters.overfeeds + (overfeed ? 1 : 0),
          careMistakes: state.counters.careMistakes + (overfeed ? 1 : 0),
        },
        log: events.reduce((log, event) => pushEvent(log, event), state.log),
      },
      events,
      true,
      undefined,
      -food.cost,
    );
  }

  if (action.type === 'play') {
    const check = checkActivity(state, 'playing');
    if (!check.ok) return result(state, [], false, check.reason);
    if (state.stats.energy < config.stats.energy.criticalAt) {
      return result(state, [], false, 'Está agotada: primero que duerma');
    }
    const event: PetEvent = { at: now, type: 'played', detail: 'Jugaron un rato.' };
    const stats = applyStatDelta(state.stats, { happiness: 16, energy: -9, hunger: -3 });
    const next = startActivity(state, 'playing', now);
    return result(
      {
        ...next,
        stats,
        updatedAt: now,
        traits: {
          ...state.traits,
          bond: clampStat(state.traits.bond + 4),
          careScore: clampStat(state.traits.careScore + 1),
        },
        counters: { ...state.counters, playSessions: state.counters.playSessions + 1 },
        log: pushEvent(state.log, event),
      },
      [event],
      true,
      undefined,
      config.economy.playCoinReward,
    );
  }

  if (action.type === 'bath') {
    const check = checkActivity(state, 'bathing');
    if (!check.ok) return result(state, [], false, check.reason);
    const event: PetEvent = { at: now, type: 'bathed', detail: 'Baño completo. No le encantó.' };
    const stats = applyStatDelta(state.stats, { hygiene: 100, happiness: -4 });
    const next = startActivity(state, 'bathing', now);
    return result(
      {
        ...next,
        stats,
        updatedAt: now,
        traits: { ...state.traits, junkLoad: clampStat(state.traits.junkLoad - 5) },
        counters: { ...state.counters, baths: state.counters.baths + 1 },
        log: pushEvent(state.log, event),
      },
      [event],
    );
  }

  if (action.type === 'medicine') {
    const check = checkActivity(state, 'healing');
    if (!check.ok) return result(state, [], false, check.reason);
    const cost = config.economy.medicineCost;
    if (cost > coins) return result(state, [], false, `Sin monedas para la medicina (${cost})`);
    const event: PetEvent = { at: now, type: 'cured', detail: 'Le diste medicina.' };
    const stats = applyStatDelta(state.stats, { health: config.illness.medicineHealthGain, happiness: -3 });
    const next = startActivity(state, 'healing', now);
    const cured = stats.health > config.health.sickBelowHealth;
    return result(
      {
        ...next,
        stats,
        sick: !cured,
        criticalSince: stats.health > config.health.sickBelowHealth ? null : state.criticalSince,
        updatedAt: now,
        traits: { ...state.traits, junkLoad: clampStat(state.traits.junkLoad - config.illness.medicineJunkReduction) },
        counters: { ...state.counters, medicines: state.counters.medicines + 1 },
        log: pushEvent(state.log, event),
      },
      [event],
      true,
      undefined,
      -cost,
    );
  }

  return result(state, [], false, 'Acción desconocida');
}

export { isBusy, isSleeping };
