/**
 * RNG determinista.
 *
 * ¿Por qué no `Math.random()`? Porque queremos que la simulación sea
 * reproducible: mismo estado + mismo tiempo transcurrido = mismo resultado.
 * Eso te da (a) tests estables, (b) capacidad de re-simular en el servidor
 * para validar el score y detectar trampas (ver docs/04).
 */

/** Hash barato y estable de un string a uint32 (FNV-1a). */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** PRNG mulberry32: 32 bits de estado, rápido y suficientemente bueno para un juego. */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Devuelve un número y el cursor nuevo (así el cursor vive dentro del PetState
 * y el determinismo se mantiene entre sesiones y entre chunks de catch-up).
 */
export function nextRandom(seed: number, cursor: number): { value: number; cursor: number } {
  const random = createRandom((seed ^ Math.imul(cursor + 1, 0x9e3779b1)) >>> 0);
  return { value: random(), cursor: cursor + 1 };
}

/** Elige un índice ponderado. `weights` no necesita sumar 1. */
export function weightedPick(value: number, weights: readonly number[]): number {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (total <= 0) return 0;
  let threshold = value * total;
  for (let i = 0; i < weights.length; i += 1) {
    threshold -= Math.max(0, weights[i] ?? 0);
    if (threshold <= 0) return i;
  }
  return weights.length - 1;
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

export function randomId(prefix = 'pet'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
