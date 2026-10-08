import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SPECIES } from '@/content/species';
import { DEFAULT_CONFIG } from '@/game/config';
import { applyAction, createEggState, PET_SCHEMA_VERSION } from '@/game/pet';
import { computeScore } from '@/game/scoring';
import { advance } from '@/game/simulation';
import { getStage } from '@/game/lifecycle';
import type { PetAction, PetState, SpeciesId } from '@/game/types';
import { DEFAULT_SCREEN_THEME_ID, getScreenTheme } from '@/skins/screen';
import type { ScreenThemeId } from '@/skins/types';
import { DEFAULT_SHELL_SKIN_ID, getShellSkin } from '@/skins/shell';
import type { ShellSkinId } from '@/skins/types';
import { now as clockNow } from '@/lib/clock';
import { randomSeed } from '@/game/rng';

/**
 * STORE (Zustand + persist).
 *
 * Es el ADAPTADOR entre el core puro y el navegador:
 *  - traduce el reloj real al reloj de juego,
 *  - guarda todo en localStorage (persist),
 *  - cobra/paga monedas,
 *  - decide qué mascota está activa.
 *
 * El core (`src/game`) no sabe que esto existe. Si mañana querés un
 * "modo espectador" en una página pública, se reusa el core con otro adaptador.
 */

export const STORE_VERSION = 1;
export const STORAGE_KEY = 'tamagotchi-online/store';

export type HudMode = 'off' | 'minimal' | 'full';

export interface Preferences {
  screenThemeId: ScreenThemeId;
  shellSkinId: ShellSkinId;
  hud: HudMode;
  soundEnabled: boolean;
  /** Multiplicador de velocidad de la simulación (1 = tiempo real). */
  timeScale: number;
}

export interface MemorialEntry {
  name: string;
  speciesId: SpeciesId;
  stageLabel: string;
  score: number;
  livedMs: number;
  causeOfDeath: string | null;
  diedAt: number;
}

export interface UiResult {
  ok: boolean;
  reason?: string;
}

export interface PetStoreState {
  storeVersion: number;
  pets: Record<string, PetState>;
  activePetId: string | null;
  wallet: number;
  coinsEarned: number;
  unlockedScreenThemeIds: ScreenThemeId[];
  unlockedShellSkinIds: ShellSkinId[];
  preferences: Preferences;
  /** Reloj REAL (no de juego) de la última vez que se avanzó la simulación. */
  lastSeenAt: number;
  memorials: MemorialEntry[];

  createEgg: (input?: { name?: string; speciesId?: SpeciesId }) => string;
  selectPet: (id: string) => void;
  act: (action: PetAction) => UiResult;
  /** Avanza la simulación el tiempo REAL indicado (la velocidad la aplica el core). */
  advanceBy: (realElapsedMs: number) => void;
  /** Catch-up: simula todo el tiempo real que pasó desde la última visita. */
  catchUp: () => void;
  setScreenTheme: (id: ScreenThemeId) => UiResult;
  setShellSkin: (id: ShellSkinId) => UiResult;
  setHud: (mode: HudMode) => void;
  setTimeScale: (scale: number) => void;
  toggleSound: () => void;
  grantCoins: (amount: number) => void;
  buryPet: () => void;
  resetAll: () => void;
}

function initialState(): Omit<
  PetStoreState,
  | 'createEgg'
  | 'selectPet'
  | 'act'
  | 'advanceBy'
  | 'catchUp'
  | 'setScreenTheme'
  | 'setShellSkin'
  | 'setHud'
  | 'setTimeScale'
  | 'toggleSound'
  | 'grantCoins'
  | 'buryPet'
  | 'resetAll'
> {
  return {
    storeVersion: STORE_VERSION,
    pets: {},
    activePetId: null,
    wallet: DEFAULT_CONFIG.economy.startingCoins,
    coinsEarned: 0,
    unlockedScreenThemeIds: [DEFAULT_SCREEN_THEME_ID],
    unlockedShellSkinIds: [DEFAULT_SHELL_SKIN_ID],
    preferences: {
      screenThemeId: DEFAULT_SCREEN_THEME_ID,
      shellSkinId: DEFAULT_SHELL_SKIN_ID,
      hud: 'minimal',
      soundEnabled: true,
      timeScale: 1,
    },
    lastSeenAt: clockNow(),
    memorials: [],
  };
}

/** Elige especie por rareza (el "huevo misterioso"). */
function rollSpecies(): SpeciesId {
  const total = SPECIES.reduce((sum, species) => sum + species.eggRarity, 0);
  let threshold = Math.random() * total;
  for (const species of SPECIES) {
    threshold -= species.eggRarity;
    if (threshold <= 0) return species.id;
  }
  return SPECIES[0]?.id ?? 'gelatina';
}

export const usePetStore = create<PetStoreState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      createEgg: (input) => {
        const timestamp = clockNow();
        const pet = createEggState({
          now: timestamp,
          seed: randomSeed(),
          ...(input?.name ? { name: input.name } : {}),
          speciesId: input?.speciesId ?? rollSpecies(),
        });
        set((state) => ({
          pets: { ...state.pets, [pet.id]: pet },
          activePetId: pet.id,
          lastSeenAt: timestamp,
        }));
        return pet.id;
      },

      selectPet: (id) => {
        if (!get().pets[id]) return;
        set({ activePetId: id, lastSeenAt: clockNow() });
      },

      act: (action) => {
        const state = get();
        const pet = state.activePetId ? state.pets[state.activePetId] : null;
        if (!pet) return { ok: false, reason: 'No hay mascota activa' };
        const result = applyAction(pet, action, { now: pet.updatedAt, coins: state.wallet });
        if (!result.ok) return { ok: false, ...(result.reason ? { reason: result.reason } : {}) };

        const coinDelta = result.coinDelta ?? 0;
        set((current) => ({
          pets: { ...current.pets, [pet.id]: result.state },
          wallet: Math.max(0, current.wallet + coinDelta),
          coinsEarned: coinDelta > 0 ? current.coinsEarned + coinDelta : current.coinsEarned,
        }));
        return { ok: true };
      },

      advanceBy: (realElapsedMs) => {
        if (!Number.isFinite(realElapsedMs) || realElapsedMs <= 0) return;
        const state = get();
        const pet = state.activePetId ? state.pets[state.activePetId] : null;
        if (!pet || !pet.alive) {
          set({ lastSeenAt: clockNow() });
          return;
        }
        const config = { ...DEFAULT_CONFIG, speed: state.preferences.timeScale };
        const out = advance(pet, realElapsedMs, { config });

        // Bono de cuidado: paga por hora simulada si la mantuviste sana.
        const simulatedMs = out.state.updatedAt - pet.updatedAt;
        const careBonus =
          out.state.alive && pet.traits.careScore >= 70
            ? Math.round((simulatedMs / 3_600_000) * config.economy.careBonusPerHour)
            : 0;
        const gained = out.coinDelta + careBonus;

        set((current) => ({
          pets: { ...current.pets, [pet.id]: out.state },
          wallet: current.wallet + gained,
          coinsEarned: current.coinsEarned + Math.max(0, gained),
          lastSeenAt: clockNow(),
        }));
      },

      catchUp: () => {
        const delta = clockNow() - get().lastSeenAt;
        // Menos de 2 s es ruido (resize, navegación): no vale la pena simular.
        if (delta > 2000) get().advanceBy(delta);
        else set({ lastSeenAt: clockNow() });
      },

      setScreenTheme: (id) => {
        const theme = getScreenTheme(id);
        const state = get();
        if (!state.unlockedScreenThemeIds.includes(theme.id)) {
          if (state.wallet < theme.unlockCost) {
            return { ok: false, reason: `Necesitás ${theme.unlockCost} monedas para desbloquear ${theme.label}` };
          }
          set((current) => ({
            wallet: current.wallet - theme.unlockCost,
            unlockedScreenThemeIds: [...current.unlockedScreenThemeIds, theme.id],
            preferences: { ...current.preferences, screenThemeId: theme.id },
          }));
          return { ok: true };
        }
        set((current) => ({ preferences: { ...current.preferences, screenThemeId: theme.id } }));
        return { ok: true };
      },

      setShellSkin: (id) => {
        const skin = getShellSkin(id);
        const state = get();
        if (!state.unlockedShellSkinIds.includes(skin.id)) {
          if (state.wallet < skin.unlockCost) {
            return { ok: false, reason: `Necesitás ${skin.unlockCost} monedas para desbloquear ${skin.label}` };
          }
          set((current) => ({
            wallet: current.wallet - skin.unlockCost,
            unlockedShellSkinIds: [...current.unlockedShellSkinIds, skin.id],
            preferences: { ...current.preferences, shellSkinId: skin.id },
          }));
          return { ok: true };
        }
        set((current) => ({ preferences: { ...current.preferences, shellSkinId: skin.id } }));
        return { ok: true };
      },

      setHud: (mode) => set((state) => ({ preferences: { ...state.preferences, hud: mode } })),
      setTimeScale: (scale) => set((state) => ({ preferences: { ...state.preferences, timeScale: scale } })),
      toggleSound: () => set((state) => ({ preferences: { ...state.preferences, soundEnabled: !state.preferences.soundEnabled } })),
      grantCoins: (amount) => set((state) => ({ wallet: Math.max(0, state.wallet + amount) })),

      buryPet: () => {
        const state = get();
        const pet = state.activePetId ? state.pets[state.activePetId] : null;
        if (!pet) return;
        const memorial: MemorialEntry = {
          name: pet.name,
          speciesId: pet.speciesId,
          stageLabel: getStage(pet.stageId).label,
          score: computeScore(pet),
          livedMs: Math.max(0, (pet.diedAt ?? pet.updatedAt) - pet.hatchedAt),
          causeOfDeath: pet.causeOfDeath,
          diedAt: pet.diedAt ?? clockNow(),
        };
        const pets = { ...state.pets };
        delete pets[pet.id];
        set({ pets, activePetId: null, memorials: [memorial, ...state.memorials].slice(0, 20) });
      },

      resetAll: () => set({ ...initialState(), memorials: get().memorials }),
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      // Migración de saves: acá se van a ir apilando los cambios de esquema.
      migrate: (persisted, version) => {
        const data = (persisted ?? {}) as Partial<PetStoreState>;
        if (version < STORE_VERSION) {
          return { ...initialState(), ...data, storeVersion: STORE_VERSION } as PetStoreState;
        }
        return data as PetStoreState;
      },
      partialize: (state) => ({
        storeVersion: state.storeVersion,
        pets: state.pets,
        activePetId: state.activePetId,
        wallet: state.wallet,
        coinsEarned: state.coinsEarned,
        unlockedScreenThemeIds: state.unlockedScreenThemeIds,
        unlockedShellSkinIds: state.unlockedShellSkinIds,
        preferences: state.preferences,
        lastSeenAt: state.lastSeenAt,
        memorials: state.memorials,
      }),
    },
  ),
);

/** Versión de esquema del save de mascota (por si hay que migrar PetState). */
export const PET_SCHEMA = PET_SCHEMA_VERSION;
