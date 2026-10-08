import { MUTATIONS } from '@/content/mutations';
import type { MutationDefinition, MutationRequirements } from '@/content/mutationTypes';
import { getStage } from './lifecycle';
import { nextRandom, weightedPick } from './rng';
import type { PetState } from './types';

/** ¿Cumple esta mascota los requisitos de la mutación? */
export function meetsRequirements(state: PetState, requirements: MutationRequirements): boolean {
  const { careScore, bond, junkLoad } = state.traits;
  if (requirements.minCareScore !== undefined && careScore < requirements.minCareScore) return false;
  if (requirements.minBond !== undefined && bond < requirements.minBond) return false;
  if (requirements.minJunkLoad !== undefined && junkLoad < requirements.minJunkLoad) return false;
  if (requirements.maxJunkLoad !== undefined && junkLoad > requirements.maxJunkLoad) return false;
  if (requirements.minMutations !== undefined && state.mutations.length < requirements.minMutations) return false;
  if (requirements.minMeals !== undefined && state.counters.meals < requirements.minMeals) return false;
  if (requirements.speciesIds && !requirements.speciesIds.includes(state.speciesId)) return false;
  if (requirements.requiredStageId && !state.reachedStageIds.includes(requirements.requiredStageId)) return false;
  return true;
}

/**
 * Qué mutaciones puede tirar esta mascota AHORA.
 * Filtra por: ya alcanzó el estadio mínimo, no la tiene todavía, cumple requisitos
 * y la especie la permite (el pool de la especie limita el catálogo).
 */
export function eligibleMutations(state: PetState, stageOrder: number): MutationDefinition[] {
  return MUTATIONS.filter(
    (mutation) =>
      !state.mutations.includes(mutation.id) &&
      mutation.minStageOrder <= stageOrder &&
      (mutation.requirements.speciesIds === undefined || mutation.requirements.speciesIds.includes(state.speciesId)) &&
      meetsRequirements(state, mutation.requirements),
  );
}

/** Producto de multiplicadores: 3 mutaciones x1.5 => x3.375. */
export function mutationMultiplier(state: PetState, exponent = 1): number {
  return state.mutations.reduce((total, id) => {
    const mutation = MUTATIONS.find((entry) => entry.id === id);
    if (!mutation) return total;
    return total * Math.pow(mutation.scoreMultiplier, exponent);
  }, 1);
}

/**
 * Tirada de mutación al evolucionar.
 * Detalles importantes del diseño:
 *  - La chance depende del cuidado (careScore) y del vínculo: cuidar bien paga.
 *  - Usa el RNG determinista del huevo (eggSeed + rngCursor), así que la misma
 *    semilla + las mismas decisiones = las mismas mutaciones. Eso permite,
 *    más adelante, re-simular en el servidor para validar el score.
 */
export function rollMutation(
  state: PetState,
  options: { baseChance?: number; careWeight?: number; bondWeight?: number } = {},
): { state: PetState; mutation?: MutationDefinition } {
  const baseChance = options.baseChance ?? 0.18;
  const careWeight = options.careWeight ?? 0.000_5;
  const bondWeight = options.bondWeight ?? 0.000_25;
  const stageOrder = getStage(state.stageId).order;

  const chance = Math.min(
    0.75,
    Math.max(0, baseChance + state.traits.careScore * careWeight + state.traits.bond * bondWeight),
  );

  // Consume SIEMPRE un número aleatorio: así el cursor avanza igual aunque no toque mutación.
  const roll = nextRandom(state.eggSeed, state.rngCursor);
  const advanced: PetState = { ...state, rngCursor: roll.cursor };

  const pool = eligibleMutations(advanced, stageOrder);
  if (pool.length === 0 || roll.value > chance) return { state: advanced };

  const pickRoll = nextRandom(advanced.eggSeed, advanced.rngCursor);
  const withCursor: PetState = { ...advanced, rngCursor: pickRoll.cursor };
  const index = weightedPick(pickRoll.value, pool.map((mutation) => mutation.weight));
  const mutation = pool[Math.min(index, pool.length - 1)];
  if (!mutation) return { state: withCursor };
  return { state: { ...withCursor, mutations: [...withCursor.mutations, mutation.id] }, mutation };
}
