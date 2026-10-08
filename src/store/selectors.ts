import { computeBreakdown, type ScoreBreakdown } from '@/game/scoring';
import { getStage, getNextStage, type StageDefinition } from '@/game/lifecycle';
import type { PetState } from '@/game/types';
import { usePetStore } from './usePetStore';

export function selectActivePet(state: ReturnType<typeof usePetStore.getState>): PetState | null {
  return state.activePetId ? state.pets[state.activePetId] ?? null : null;
}

/** Hook: mascota activa (o null). */
export function useActivePet(): PetState | null {
  return usePetStore((state) => selectActivePet(state));
}

export function useScore(): ScoreBreakdown | null {
  const pet = useActivePet();
  return pet ? computeBreakdown(pet) : null;
}

/** Hook: progreso hacia el próximo estadio (para la barra de evolución). */
export function useStageProgress(): { current: StageDefinition; next: StageDefinition | null; progress: number } | null {
  const pet = useActivePet();
  if (!pet) return null;
  const current = getStage(pet.stageId);
  const next = getNextStage(pet.stageId);
  if (!next) return { current, next: null, progress: 1 };
  const ageMs = pet.updatedAt - pet.hatchedAt;
  const from = current.enterAgeMs;
  const to = next.enterAgeMs;
  const progress = to <= from ? 1 : Math.min(1, Math.max(0, (ageMs - from) / (to - from)));
  return { current, next, progress };
}

export function useWallet(): number {
  return usePetStore((state) => state.wallet);
}

export function usePreferences() {
  return usePetStore((state) => state.preferences);
}
