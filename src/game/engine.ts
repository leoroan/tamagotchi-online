/**
 * GAME LOOP.
 *
 * Reglas de oro (esto es lo que separa una animación decente de una que sufre):
 *  - Se usa `requestAnimationFrame`, NUNCA `setInterval`: rAF se sincroniza con
 *    el refresco del monitor y se pausa cuando la pestaña no se ve.
 *  - Se usa un ACUMULADOR de tiempo fijo: la lógica avanza en pasos iguales
 *    (`tickMs`) sin importar cuántos FPS tenga el equipo. Con `delta` variable
 *    los números del juego se despeinan (y los tests se vuelven imposibles).
 *  - Si un frame tardó muchísimo (pestaña en background), se recorta: el tiempo
 *    perdido lo resuelve `advance()` con el catch-up offline, no este loop.
 */

export interface GameLoopOptions {
  /** Paso lógico en ms (ver DEFAULT_CONFIG.tickMs). */
  tickMs: number;
  /** Se llama 0..N veces por frame con un paso exacto de `tickMs`. */
  onTick: (stepMs: number) => void;
  /** Se llama una vez por frame, para dibujar. `alpha` = interpolación 0..1. */
  onFrame?: (info: { alpha: number; frameMs: number }) => void;
  /** Frame máximo aceptado antes de recortar (default 1000 ms). */
  maxFrameMs?: number;
  /** Inyectable para tests (en Node no hay rAF). */
  scheduler?: { request: (cb: (ts: number) => void) => number; cancel: (handle: number) => void };
}

export interface GameLoop {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
  /** Ejecuta el loop a mano (tests, o modo "sin animación"). */
  pump: (elapsedMs: number) => void;
}

const defaultScheduler = {
  request: (callback: (ts: number) => void) =>
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(callback)
      : (setTimeout(() => callback(Date.now()), 16) as unknown as number),
  cancel: (handle: number) => {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
    else clearTimeout(handle);
  },
};

export function createGameLoop(options: GameLoopOptions): GameLoop {
  const scheduler = options.scheduler ?? defaultScheduler;
  const maxFrameMs = options.maxFrameMs ?? 1000;
  let running = false;
  let handle: number | null = null;
  let lastTs = 0;
  let accumulator = 0;

  const pump = (elapsedMs: number) => {
    const delta = Math.max(0, Math.min(elapsedMs, maxFrameMs));
    accumulator += delta;
    let steps = 0;
    while (accumulator >= options.tickMs && steps < 240) {
      options.onTick(options.tickMs);
      accumulator -= options.tickMs;
      steps += 1;
    }
    if (steps >= 240) accumulator = 0; // nos quedamos atrás: que lo arregle el catch-up
    options.onFrame?.({ alpha: accumulator / options.tickMs, frameMs: delta });
  };

  const frame = (ts: number) => {
    if (!running) return;
    const delta = lastTs === 0 ? 0 : ts - lastTs;
    lastTs = ts;
    pump(delta);
    handle = scheduler.request(frame);
  };

  return {
    start: () => {
      if (running) return;
      running = true;
      lastTs = 0;
      accumulator = 0;
      handle = scheduler.request(frame);
    },
    stop: () => {
      running = false;
      if (handle !== null) scheduler.cancel(handle);
      handle = null;
    },
    isRunning: () => running,
    pump,
  };
}
