import type { StatKey } from './types';

/** Balance del juego en un solo lugar. Tocar acá, no en la lógica. */
export interface GameConfig {
  /** Paso lógico de la simulación en modo "online" (ms). */
  tickMs: number;
  /**
   * Tope de tiempo que se simula de un saque al volver a entrar.
   * Evita el "me morí mientras dormía": si faltó más tiempo, se simula solo
   * este tope y el resto se pierde a favor del jugador.
   */
  maxOfflineCatchUpMs: number;
  /** Paso lógico cuando el catch-up es largo (no hace falta precisión de 250ms). */
  coarseTickMs: number;
  /** Umbral a partir del cual el catch-up pasa a paso grueso. */
  coarseThresholdMs: number;
  /** Multiplicador de velocidad global (1 = tiempo real; 60 = 1 minuto por segundo). */
  speed: number;

  stats: Record<StatKey, { decayPerMinute: number; criticalAt: number }>;

  sleep: {
    /** Energía ganada por minuto durmiendo. */
    energyGainPerMinute: number;
    happinessGainPerMinute: number;
    /** Durmiendo el hambre baja más lento (como en la vida real). */
    hungerDecayMultiplier: number;
    /** Duración de una siesta automática (si el jugador no la despierta). */
    autoWakeAfterMs: number;
    batteryLowEnergy: number;
  };

  health: {
    regenPerMinute: number;
    starvePenaltyPerMinute: number;
    filthPenaltyPerMinute: number;
    sickPenaltyPerMinute: number;
    sadPenaltyPerMinute: number;
    /** Salud por debajo de esto => se considera "enfermo". */
    sickBelowHealth: number;
    /** Salud en 0 => "crítico", y arranca el contador de gracia. */
    deathBelowHealth: number;
    /** Cuánto tiempo se puede estar en crítico antes de morir. */
    graceMs: number;
  };

  illness: {
    /** Probabilidad base por minuto de enfermarse. */
    chancePerMinute: number;
    filthMultiplier: number;
    hungerMultiplier: number;
    junkLoadMultiplier: number;
    /** Curación: cuánta salud recupera la medicina y cuánto limpia. */
    medicineHealthGain: number;
    medicineJunkReduction: number;
  };

  care: {
    /** Todo por encima de esto cuenta como "buen cuidado". */
    goodAt: number;
    /** Por debajo de esto cuenta como descuido. */
    neglectAt: number;
    /** Vida media (minutos) de la media exponencial del careScore. */
    halfLifeMinutes: number;
    /** Cuánto suma/resta el careScore por minuto en cada caso. */
    gainPerMinute: number;
    decayPerMinute: number;
    bondGainPerMinute: number;
    bondDecayPerMinute: number;
  };

  economy: { startingCoins: number; playCoinReward: number; careBonusPerHour: number; medicineCost: number };

  /** Multiplicador de score por mutación: el end-game se juega acá. */
  scoring: { careFactorFloor: number; mutationExponent: number };
}

export const DEFAULT_CONFIG: GameConfig = {
  tickMs: 250,
  maxOfflineCatchUpMs: 12 * 60 * 60 * 1000, // 12 h
  coarseTickMs: 15_000,
  coarseThresholdMs: 30 * 60 * 1000,
  speed: 1,

  stats: {
    // Balance pensado para "entrar 2 o 3 veces por dia y que alcance".
    // Saciedad: de 100 a 0 en ~20 h de vigilia
    hunger: { decayPerMinute: 0.083, criticalAt: 15 },
    // Animo: de 100 a 0 en ~28 h
    happiness: { decayPerMinute: 0.06, criticalAt: 15 },
    // Energia: despierta 100 -> 0 en ~14 h; se recupera durmiendo
    energy: { decayPerMinute: 0.12, criticalAt: 10 },
    // Higiene: de 100 a 0 en ~30 h
    hygiene: { decayPerMinute: 0.055, criticalAt: 20 },
    health: { decayPerMinute: 0, criticalAt: 20 },
  },

  sleep: {
    energyGainPerMinute: 2.5,
    happinessGainPerMinute: 0.05,
    hungerDecayMultiplier: 0.5,
    autoWakeAfterMs: 4 * 60 * 60 * 1000,
    batteryLowEnergy: 15,
  },

  health: {
    regenPerMinute: 0.3,
    // Penalizaciones por abandono: totalmente descuidada muere en ~24 h.
    starvePenaltyPerMinute: 0.35,
    filthPenaltyPerMinute: 0.25,
    sickPenaltyPerMinute: 0.5,
    sadPenaltyPerMinute: 0.2,
    sickBelowHealth: 45,
    deathBelowHealth: 0,
    // Ventana para salvarla con medicina cuando la salud llega a cero.
    graceMs: 60 * 60 * 1000,
  },

  illness: {
    chancePerMinute: 0.00035,
    filthMultiplier: 6,
    hungerMultiplier: 4,
    junkLoadMultiplier: 5,
    medicineHealthGain: 45,
    medicineJunkReduction: 60,
  },

  care: {
    goodAt: 40,
    neglectAt: 25,
    halfLifeMinutes: 240,
    gainPerMinute: 2,
    decayPerMinute: 1,
    // El vínculo crece sobre todo JUGANDO (+4 por sesión), no por estar quieto:
    // por eso gana/decae lento acá.
    bondGainPerMinute: 0.5,
    bondDecayPerMinute: 0.05,
  },

  economy: { startingCoins: 30, playCoinReward: 3, careBonusPerHour: 5, medicineCost: 18 },

  scoring: { careFactorFloor: 0.5, mutationExponent: 1 },
};

export function withConfig(overrides: Partial<GameConfig>): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}
