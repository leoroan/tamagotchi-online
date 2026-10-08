import type { PetState } from '@/game/types';
import { isCloudEnabled } from './supabase';

/**
 * SYNC — "local-first, cloud-sync".
 *
 * Reglas que hacen que esto no duela nunca:
 *  1. El juego NUNCA espera a la red para animar o para guardar: escribe en
 *     localStorage (Zustand persist) y listo.
 *  2. La nube se actualiza con DEBOUNCE (cada N segundos) y al cerrar la pestaña
 *     (`visibilitychange` / `pagehide`), no en cada tick.
 *  3. Conflictos: last-write-wins por `updatedAt`. Es una mascota, no un banco.
 *  4. El servidor guarda ADEMÁS su propio `server_updated_at` y `hatched_at`:
 *     eso permite validar el score sin confiar en el reloj del cliente.
 */
export interface SavePayload {
  pets: Record<string, PetState>;
  activePetId: string | null;
  wallet: number;
  preferences: Record<string, unknown>;
  clientSavedAt: number;
}

export interface SyncAdapter {
  id: string;
  label: string;
  save: (payload: SavePayload) => Promise<void>;
  load: () => Promise<SavePayload | null>;
}

/** Adaptador por defecto: no hace nada (todo vive en localStorage). */
export const localOnlySync: SyncAdapter = {
  id: 'local-only',
  label: 'Solo local (localStorage)',
  save: async () => undefined,
  load: async () => null,
};

export function getActiveSync(): SyncAdapter {
  // Fase 4: devolver el adaptador de Supabase cuando haya configuración.
  return localOnlySync;
}

export function describeSync(): string {
  return isCloudEnabled()
    ? 'Nube configurada (adaptador de Fase 4 pendiente de implementar)'
    : 'Local: la mascota vive en este navegador (localStorage) y no se pierde al cerrar';
}

/** Helper de debounce, sin dependencias: lo va a usar el adaptador de Fase 4. */
export function debounce<T extends (...args: never[]) => void>(fn: T, waitMs: number): T & { cancel: () => void } {
  let handle: ReturnType<typeof setTimeout> | null = null;
  const wrapped = ((...args: never[]) => {
    if (handle) clearTimeout(handle);
    handle = setTimeout(() => fn(...args), waitMs);
  }) as T & { cancel: () => void };
  wrapped.cancel = () => {
    if (handle) clearTimeout(handle);
    handle = null;
  };
  return wrapped;
}
