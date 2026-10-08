import { applyAction, createEggState } from '../pet';
import { HOUR_MS } from '../lifecycle';
import { advance } from '../simulation';
import type { PetAction, PetEvent, PetState, Stats } from '../types';

export const T0 = 1_700_000_000_000; // instante fijo: tests reproducibles

/**
 * Fábrica de mascotas para tests.
 * Permite forzar cualquier combinación de estado sin pasar por el juego.
 */
export type PetOverrides = Omit<Partial<PetState>, 'stats'> & {
  stats?: Partial<Stats>;
  /** Edad simulada: mueve el nacimiento hacia atrás para testear estadios/score. */
  ageMs?: number;
};

export function makePet(overrides: PetOverrides = {}): PetState {
  const { stats, ageMs = 0, ...rest } = overrides;
  const base = createEggState({ now: T0 - ageMs, name: 'Test', seed: 12345, id: 'pet_test' });
  return {
    ...base,
    ...rest,
    // `updatedAt` siempre en T0: así todos los tests simulan desde el mismo instante.
    updatedAt: T0,
    stats: { ...base.stats, ...(stats ?? {}) },
  };
}

/** Mascota ya eclosionada y crecidita: para no repetir el setup en cada test. */
export function makeGrownPet(overrides: PetOverrides = {}): PetState {
  return makePet({
    ageMs: 3 * HOUR_MS,
    stageId: 'child',
    reachedStageIds: ['egg', 'baby', 'child'],
    stats: { hunger: 90, happiness: 90, energy: 90, hygiene: 90, health: 100 },
    traits: { careScore: 90, bond: 60, junkLoad: 0, goodCareMs: 3_600_000, neglectMs: 0 },
    ...overrides,
  });
}

/**
 * Simula un JUGADOR CUIDADOSO con un criterio realista:
 *  - hace UNA acción y deja que la animación termine (1 minuto de juego) antes de la siguiente;
 *  - baña cuando está sucia, alimenta cuando tiene hambre, juega si tiene energía y
 *    la manda a dormir cuando está agotada.
 *
 * Es exactamente el flujo de la UI real, así que sirve para testear el largo
 * plazo de verdad ("¿una mascota bien cuidada llega a adulta?", "¿el score crece?").
 */
export function simulateWithCare(
  pet: PetState,
  totalMs: number,
  stepMs: number,
  options: { maxCatchUpMs?: number } = {},
): { state: PetState; coins: number; events: PetEvent[]; steps: number } {
  let state = pet;
  let coins = 0;
  let elapsed = 0;
  let steps = 0;
  const events: PetEvent[] = [];

  const tryAction = (action: PetAction): boolean => {
    const result = applyAction(state, action, { now: state.updatedAt, coins: Number.POSITIVE_INFINITY });
    if (!result.ok) return false;
    state = result.state;
    // Deja pasar la animación (comer/jugar/bañarse duran pocos segundos de juego).
    state = advance(state, 60_000, options).state;
    return true;
  };

  while (elapsed < totalMs && state.alive) {
    if (state.status === 'sleeping') {
      if (state.stats.energy >= 85) tryAction({ type: 'wake' });
    } else if (state.stats.energy < 25) {
      tryAction({ type: 'sleep' });
    } else {
      if (state.stats.hygiene < 60) tryAction({ type: 'bath' });
      if (state.stats.hunger < 70) tryAction({ type: 'feed', foodId: 'pan' });
      if (state.stats.happiness < 75 && state.stats.energy > 35) tryAction({ type: 'play' });
    }

    const step = Math.min(stepMs, totalMs - elapsed);
    const out = advance(state, step, options);
    state = out.state;
    coins += out.coinDelta;
    events.push(...out.events);
    elapsed += step;
    steps += 1;
  }
  return { state, coins, events, steps };
}
