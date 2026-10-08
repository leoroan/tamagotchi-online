import { getStage } from './lifecycle';
import { mutationMultiplier } from './mutations';
import { DEFAULT_CONFIG, type GameConfig } from './config';
import type { PetState } from './types';

/**
 * SCORE: "tiempo vivido" x "estadio" x "mutaciones" x "calidad de cuidado".
 *
 * Es DERIVADO: no se guarda, se calcula. Ventaja enorme: si mañana rebalanceás
 * los multiplicadores, los rankings históricos se recalculan solos y nadie puede
 * inyectar puntos en el JSON del save.
 */
export interface ScoreBreakdown {
  score: number;
  ageSeconds: number;
  stageMultiplier: number;
  mutationMultiplier: number;
  careFactor: number;
  careRatio: number;
  mutations: readonly string[];
  stageLabel: string;
}

export function computeBreakdown(state: PetState, config: GameConfig = DEFAULT_CONFIG): ScoreBreakdown {
  const ageMs = Math.max(0, (state.alive ? state.updatedAt : state.diedAt ?? state.updatedAt) - state.hatchedAt);
  const ageSeconds = ageMs / 1000;
  const stage = getStage(state.stageId);
  const totalCare = state.traits.goodCareMs + state.traits.neglectMs;
  const careRatio = totalCare > 0 ? state.traits.goodCareMs / totalCare : state.traits.careScore / 100;
  // careFactor va de `careFactorFloor` (cuidado pésimo) a 1 + floor (cuidado perfecto).
  // Con floor 0.5 => rango 0.5x .. 1.5x. El floor evita que un mal cuidado anule el tiempo vivido.
  const careFactor = config.scoring.careFactorFloor + careRatio;
  const mutationFactor = mutationMultiplier(state, config.scoring.mutationExponent);
  const score = Math.round(ageSeconds * stage.scoreMultiplier * mutationFactor * careFactor);
  return {
    score: Math.max(0, score),
    ageSeconds: Math.round(ageSeconds),
    stageMultiplier: stage.scoreMultiplier,
    mutationMultiplier: Number(mutationFactor.toFixed(3)),
    careFactor: Number(careFactor.toFixed(3)),
    careRatio: Number(careRatio.toFixed(3)),
    mutations: [...state.mutations],
    stageLabel: stage.label,
  };
}

/**
 * OJO: el score es \"local-first\" (se calcula en el cliente). Para un ranking
 * serio hay que validarlo en el servidor con el reloj del servidor y una
 * re-simulación determinista de la misma semilla => ver docs/04.
 */

export function computeScore(state: PetState, config?: GameConfig): number {
  return computeBreakdown(state, config).score;
}

/** Formato compacto para HUD (12.4 k, 1.2 M). */
export function formatScore(score: number): string {
  if (score < 1000) return String(score);
  if (score < 1_000_000) return `${(score / 1000).toFixed(1)}k`;
  return `${(score / 1_000_000).toFixed(2)}M`;
}
