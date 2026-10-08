import type { StageId } from './types';

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/**
 * Un estadio de vida. TODO es data: para agregar "crisálida" o "dios" solo
 * se toca este array (y el arte). El score y las evoluciones se derivan de acá.
 */
export interface StageDefinition {
  id: StageId;
  order: number;
  label: string;
  /** Edad mínima (ms desde la eclosión) para poder entrar a este estadio. */
  enterAgeMs: number;
  /** Cuidado mínimo (0..100) para que la evolución se habilite. */
  minCareScore: number;
  /** Multiplicador de score: vivir un segundo siendo adulto vale mucho más. */
  scoreMultiplier: number;
  /** Monedas que se pagan al alcanzar el estadio. */
  coinReward: number;
}

const MINUTE = 60 * 1000;

/**
 * Curva de vida (ajustable sin tocar código de simulación).
 * Números pensados para una mascota que vive días: en desarrollo usá el
 * DevPanel para acelerar el tiempo x60 y ver todo el ciclo en minutos.
 */
export const LIFE_STAGES: readonly StageDefinition[] = [
  { id: 'egg',   order: 0, label: 'Huevo',        enterAgeMs: 0,          minCareScore: 0,  scoreMultiplier: 1,    coinReward: 0 },
  { id: 'baby',  order: 1, label: 'Cría',         enterAgeMs: 10 * MINUTE, minCareScore: 0,  scoreMultiplier: 2,    coinReward: 10 },
  { id: 'child', order: 2, label: 'Infante',      enterAgeMs: 2 * HOUR_MS, minCareScore: 30, scoreMultiplier: 5,    coinReward: 25 },
  { id: 'teen',  order: 3, label: 'Adolescente',  enterAgeMs: 12 * HOUR_MS, minCareScore: 45, scoreMultiplier: 15,  coinReward: 60 },
  { id: 'adult', order: 4, label: 'Adulto',       enterAgeMs: 2 * DAY_MS,  minCareScore: 60, scoreMultiplier: 40,  coinReward: 150 },
  { id: 'elder', order: 5, label: 'Anciano',      enterAgeMs: 7 * DAY_MS,  minCareScore: 70, scoreMultiplier: 100, coinReward: 400 },
];

export const FIRST_STAGE_ID: StageId = LIFE_STAGES[0]?.id ?? 'egg';

export function getStage(stageId: StageId): StageDefinition {
  return LIFE_STAGES.find((stage) => stage.id === stageId) ?? (LIFE_STAGES[0] as StageDefinition);
}

export function getStageIndex(stageId: StageId): number {
  return getStage(stageId).order;
}

/** El próximo estadio, o null si ya es el último (el "end-game" vive en las mutaciones). */
export function getNextStage(stageId: StageId): StageDefinition | null {
  const current = getStage(stageId);
  return LIFE_STAGES.find((stage) => stage.order === current.order + 1) ?? null;
}

/**
 * Devuelve el estadio que corresponde a una edad, PERO respetando el gate de
 * cuidado: si el jugador descuidó la mascota, se queda atascada en el estadio
 * anterior (y eso se nota: el score deja de multiplicarse).
 */
export function resolveStageForAge(ageMs: number, careScore: number, currentStageId: StageId): StageDefinition {
  let result = getStage(currentStageId);
  for (const stage of LIFE_STAGES) {
    if (stage.order <= result.order) continue;
    if (ageMs < stage.enterAgeMs) break;
    if (careScore < stage.minCareScore) break;
    result = stage;
  }
  return result;
}
