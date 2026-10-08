/**
 * API pública del CORE del juego. La UI importa SOLO desde acá:
 * si mañana refactorizás los archivos internos, la UI no se entera.
 */
export * from './types';
export { DEFAULT_CONFIG, withConfig, type GameConfig } from './config';
export { advance, tick, type AdvanceResult } from './simulation';
export { applyAction, createEggState, getAgeMs, formatAge, formatAgeCompact, getMood, getCareRatio, isCritical, isDirty, describeStatus, clampStat, PET_SCHEMA_VERSION, type ActionContext, type Mood } from './pet';
export { ACTIVITIES, ACTIVITY_TRANSITIONS, canTransition, checkActivity, isBusy, isSleeping, startActivity } from './stateMachine';
export { DAY_MS, FIRST_STAGE_ID, HOUR_MS, LIFE_STAGES, getNextStage, getStage, getStageIndex, resolveStageForAge, type StageDefinition } from './lifecycle';
export { computeBreakdown, computeScore, formatScore, type ScoreBreakdown } from './scoring';
export { eligibleMutations, meetsRequirements, mutationMultiplier, rollMutation } from './mutations';
export { createGameLoop, type GameLoop, type GameLoopOptions } from './engine';
export { hashString, nextRandom, randomId, randomSeed, weightedPick } from './rng';
