import type { MutationId, SpeciesId, StageId } from '@/game/types';

export type MutationRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Condiciones para que una mutación sea elegible. Todo opcional y combinable. */
export interface MutationRequirements {
  minCareScore?: number;
  minBond?: number;
  /** Requiere que la mascota esté "sucia" (end-game alternativo: la ruta tóxica). */
  minJunkLoad?: number;
  maxJunkLoad?: number;
  /** Requiere que ya tenga N mutaciones (mutaciones de mutaciones). */
  minMutations?: number;
  /** Requiere haber comido N veces. */
  minMeals?: number;
  /** Exclusiva de ciertas especies. */
  speciesIds?: readonly SpeciesId[];
  /** Requiere haber pasado por cierto estadio. */
  requiredStageId?: StageId;
}

export interface MutationVisual {
  /** Tinte que el renderer aplica al sprite. */
  tint: string;
  /** Si "brilla" (el renderer le mete un halo/pulso, y más adelante un shader). */
  glows: boolean;
}

export interface MutationDefinition {
  id: MutationId;
  name: string;
  description: string;
  rarity: MutationRarity;
  /** Peso relativo de la tirada (no es probabilidad absoluta). */
  weight: number;
  scoreMultiplier: number;
  /** Estadio mínimo en el que puede aparecer (order de lifecycle.ts). */
  minStageOrder: number;
  requirements: MutationRequirements;
  visual: MutationVisual;
}

export const RARITY_ORDER: readonly MutationRarity[] = ['common', 'rare', 'epic', 'legendary'];
