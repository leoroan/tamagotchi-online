import type { ActivityId, PetState } from './types';

/**
 * MÁQUINA DE ESTADOS de la mascota.
 *
 * Una mascota virtual es, en el fondo, una FSM: idle / comiendo / jugando /
 * durmiendo / enferma / muerta. Tener la tabla de transiciones en un solo lugar
 * es lo que evita el clásico bug del tamagotchi casero: "puedo alimentar
 * mientras duerme y el hambre sube al infinito".
 */
export interface ActivityDefinition {
  id: ActivityId;
  label: string;
  /** ms que dura por defecto (0 = indefinida). */
  durationMs: number;
  /** ¿Bloquea otras acciones mientras corre? */
  exclusive: boolean;
}

export const ACTIVITIES: Record<ActivityId, ActivityDefinition> = {
  idle:     { id: 'idle',     label: 'Al aire',     durationMs: 0,    exclusive: false },
  eating:   { id: 'eating',   label: 'Comiendo',    durationMs: 3500, exclusive: true },
  playing:  { id: 'playing',  label: 'Jugando',     durationMs: 5000, exclusive: true },
  bathing:  { id: 'bathing',  label: 'Bañándose',   durationMs: 4000, exclusive: true },
  sleeping: { id: 'sleeping', label: 'Durmiendo',   durationMs: 0,    exclusive: true },
  healing:  { id: 'healing',  label: 'Curándose',   durationMs: 3000, exclusive: true },
  evolving: { id: 'evolving', label: 'Evolucionando', durationMs: 2500, exclusive: true },
  dead:     { id: 'dead',     label: 'Muerta',      durationMs: 0,    exclusive: true },
};

/** Transiciones válidas: desde la clave se puede ir a cualquiera del array. */
export const ACTIVITY_TRANSITIONS: Record<ActivityId, readonly ActivityId[]> = {
  idle: ['eating', 'playing', 'bathing', 'sleeping', 'healing', 'evolving', 'dead'],
  eating: ['idle', 'dead'],
  playing: ['idle', 'dead'],
  bathing: ['idle', 'dead'],
  sleeping: ['idle', 'dead'],
  healing: ['idle', 'dead'],
  evolving: ['idle', 'dead'],
  dead: [],
};

export function canTransition(from: ActivityId, to: ActivityId): boolean {
  return (ACTIVITY_TRANSITIONS[from] ?? []).includes(to);
}

/** ¿Está ocupada en algo que impide una acción nueva? */
export function isBusy(state: PetState): boolean {
  return ACTIVITIES[state.status]?.exclusive === true && state.status !== 'sleeping';
}

export function isSleeping(state: PetState): boolean {
  return state.status === 'sleeping';
}

export interface TransitionCheck {
  ok: boolean;
  reason?: string;
}

/** Valida si la mascota puede empezar una actividad (sin efectos secundarios). */
export function checkActivity(state: PetState, activity: ActivityId): TransitionCheck {
  if (!state.alive) return { ok: false, reason: 'Ya no está…' };
  if (state.status === activity) return { ok: false, reason: 'Ya está haciendo eso' };
  if (state.status === 'sleeping') return { ok: false, reason: 'Está durmiendo (despertala primero)' };
  if (isBusy(state)) return { ok: false, reason: 'Está ocupada, esperá un segundo' };
  if (!canTransition(state.status, activity)) return { ok: false, reason: 'No puede hacer eso ahora' };
  return { ok: true };
}

/** Aplica el cambio de actividad devolviendo un estado nuevo (inmutable). */
export function startActivity(
  state: PetState,
  activity: ActivityId,
  now: number,
  durationMs?: number,
): PetState {
  const definition = ACTIVITIES[activity];
  const duration = durationMs ?? definition.durationMs;
  return {
    ...state,
    status: activity,
    statusUntil: duration > 0 ? now + duration : null,
  };
}
