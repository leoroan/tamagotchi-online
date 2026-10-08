/**
 * Setup de tests.
 *
 * Zustand `persist` necesita `localStorage`. En Node no existe (o existe como
 * getter que tira error si no se habilita Web Storage), así que le damos una
 * implementación mínima en memoria: los tests corren sin jsdom y sin disco.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

function storageWorks(): boolean {
  try {
    return typeof globalThis.localStorage?.setItem === 'function';
  } catch {
    return false;
  }
}

if (!storageWorks()) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
}
