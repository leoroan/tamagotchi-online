/**
 * Tipos del CORE del juego.
 *
 * Regla de oro: este archivo (y todo `src/game/**`) NO importa React, ni
 * Supabase, ni toca el DOM. Es lógica pura => testeable, portable y
 * reutilizable (web, PWA, server, incluso un bot).
 */

export type SpeciesId = string;
export type MutationId = string;
export type FoodId = string;
export type StageId = string;

export type StatKey = 'hunger' | 'happiness' | 'energy' | 'hygiene' | 'health';

/** Valores 0..100. `hunger` se guarda como "saciedad": 100 = lleno, 0 = muerto de hambre. */
export type Stats = Record<StatKey, number>;

export const STAT_KEYS: readonly StatKey[] = ['hunger', 'happiness', 'energy', 'hygiene', 'health'];

/** Qué está haciendo la mascota ahora mismo (ver stateMachine.ts). */
export type ActivityId =
  | 'idle'
  | 'eating'
  | 'playing'
  | 'bathing'
  | 'sleeping'
  | 'healing'
  | 'evolving'
  | 'dead';

/** Contadores acumulados: base del score, de las mutaciones y de la telemetría. */
export interface PetCounters {
  meals: number;
  junkMeals: number;
  overfeeds: number;
  playSessions: number;
  sleepSessions: number;
  baths: number;
  medicines: number;
  careMistakes: number;
  illnessEpisodes: number;
  evolutions: number;
}

/** Métricas "blandas": describen la calidad del cuidado, no un stat instantáneo. */
export interface PetTraits {
  /** 0..100 calidad de cuidado, media exponencial de las últimas horas. */
  careScore: number;
  /** 0..100 vínculo: sube jugando, mimando y manteniendo stats altos. */
  bond: number;
  /** 0..100 carga de "comida chatarra": sube el riesgo de enfermar, baja con el tiempo. */
  junkLoad: number;
  /** Tiempo (ms) acumulado con stats sanos / descuidados. */
  goodCareMs: number;
  neglectMs: number;
}

export type PetEventType =
  | 'hatched'
  | 'fed'
  | 'played'
  | 'slept'
  | 'woke'
  | 'bathed'
  | 'sick'
  | 'cured'
  | 'evolved'
  | 'mutated'
  | 'critical'
  | 'care_mistake'
  | 'died';

/** El log es un anillo de eventos: sirve para la UI, para narrar la vida del bicho
 *  y para depurar. Se recorta a los últimos N para no engordar el save. */
export interface PetEvent {
  at: number;
  type: PetEventType;
  detail?: string;
}

export const MAX_EVENT_LOG = 60;

/**
 * Estado COMPLETO de una mascota. Es el guardable definitivo: si esto se guarda
 * y se restaura, la mascota "sigue viva" exactamente donde estaba.
 * Debe ser 100% serializable a JSON (nada de clases, Map, Date, funciones).
 */
export interface PetState {
  /** Versión del esquema: permite migrar saves viejos (ver store/usePetStore.ts). */
  schemaVersion: number;
  id: string;
  speciesId: SpeciesId;
  name: string;
  /** Semilla del huevo: de acá sale TODO el RNG de esta mascota (determinista). */
  eggSeed: number;
  /** Cursor del RNG: cuántas veces se consumió la semilla. Hace la sim determinista. */
  rngCursor: number;
  createdAt: number;
/**
 * Instante (reloj de JUEGO) en que empezó la vida: cuando apareció el huevo.
 * Autoridad del score: edad = updatedAt - hatchedAt.
 */
  hatchedAt: number;
  /** Último instante simulado. Clave del catch-up offline. */
  updatedAt: number;
  alive: boolean;
  diedAt: number | null;
  causeOfDeath: string | null;
  /** Instante en que la salud llegó a 0 y empezó la "gracia" para salvarla. */
  criticalSince: number | null;
  stageId: StageId;
  status: ActivityId;
  /** Cuándo termina la actividad actual (null = indefinida, ej. dormir). */
  statusUntil: number | null;
  sick: boolean;
  stats: Stats;
  traits: PetTraits;
  counters: PetCounters;
  mutations: MutationId[];
  /** Historial de estadios alcanzados ("logueado" de evoluciones). */
  reachedStageIds: StageId[];
  log: PetEvent[];
}

/** Acción del jugador. El core las valida; la UI solo las dispara. */
export type PetAction =
  | { type: 'feed'; foodId: FoodId }
  | { type: 'play' }
  | { type: 'sleep' }
  | { type: 'wake' }
  | { type: 'bath' }
  | { type: 'medicine' }
  | { type: 'rename'; name: string };

export interface ActionResult {
  state: PetState;
  ok: boolean;
  /** Motivo si ok=false ("está durmiendo", "no tenés monedas", ...). */
  reason?: string;
  events: PetEvent[];
  /** Monedas ganadas/perdidas por la acción. */
  coinDelta?: number;
}
