/**
 * RELOJ.
 *
 * Toda la app pide la hora por acá, nunca `Date.now()` suelto.
 * Motivo: cuando exista Supabase (Fase 4) el servidor va a ser la autoridad del
 * tiempo. Con este offset se corrige el reloj del cliente (que el jugador puede
 * adelantar para inflar el score) sin tocar una línea del juego.
 */
let serverOffsetMs = 0;

/** Hora "de juego" (epoch real + corrección del servidor). */
export function now(): number {
  return Date.now() + serverOffsetMs;
}

/** Lo llama la capa de sync cuando conoce la hora del servidor. */
export function setServerOffset(offsetMs: number): void {
  serverOffsetMs = Number.isFinite(offsetMs) ? offsetMs : 0;
}

export function getServerOffset(): number {
  return serverOffsetMs;
}

/** ¿Es de noche en la hora local del jugador? (look de cuarto oscuro). */
export function isNightTime(date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 20 || hour < 7;
}
