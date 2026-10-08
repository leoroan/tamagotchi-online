import type { FoodId } from '@/game/types';

/**
 * COMIDA: el sistema de alimentos es data pura. `tier` define cuán buena es,
 * `unlockStageOrder` cuándo se desbloquea, y `junk` marca la chatarra que sube
 * el riesgo de enfermarse (mecánica anti-spam: podés engordar a la mascota a
 * base de caramelos, y va a enfermar).
 */
export interface FoodDefinition {
  id: FoodId;
  name: string;
  description: string;
  tier: 1 | 2 | 3;
  /** Costo en monedas. La básica es gratis (nunca te quedás sin poder cuidarla). */
  cost: number;
  /** Estadio mínimo (order) para poder comprarla. */
  unlockStageOrder: number;
  hunger: number;
  happiness: number;
  energy: number;
  health: number;
  junk: boolean;
  /** Cuánto suma a la "carga de chatarra" (0..100). */
  junkLoad: number;
}

export const FOODS: readonly FoodDefinition[] = [
  { id: 'semillas',  name: 'Semillas',    description: 'Comida básica, gratis y aburrida. Nunca falla.',       tier: 1, cost: 0,  unlockStageOrder: 0, hunger: 18, happiness: 2,  energy: 0,  health: 0, junk: false, junkLoad: 0 },
  { id: 'frutilla',  name: 'Frutilla',    description: 'Rica y sana. Sube el ánimo.',                          tier: 1, cost: 3,  unlockStageOrder: 1, hunger: 22, happiness: 9,  energy: 1,  health: 2, junk: false, junkLoad: 0 },
  { id: 'alga',      name: 'Alga',        description: 'Verdurita acuática: digestión liviana.',               tier: 1, cost: 4,  unlockStageOrder: 1, hunger: 26, happiness: 4,  energy: 2,  health: 3, junk: false, junkLoad: 0 },
  { id: 'pan',       name: 'Pan caliente',description: 'Llena de verdad. Un poco de energía extra.',            tier: 2, cost: 6,  unlockStageOrder: 1, hunger: 34, happiness: 6,  energy: 4,  health: 1, junk: false, junkLoad: 0 },
  { id: 'caramelo',  name: 'Caramelo',    description: 'Feliz al instante, cero nutrientes. Ojo con el spam.',  tier: 2, cost: 2,  unlockStageOrder: 1, hunger: 8,  happiness: 14, energy: 6,  health: 0, junk: true,  junkLoad: 18 },
  { id: 'pastel',    name: 'Pastel',      description: 'Fiesta total. Después viene la panza.',                 tier: 2, cost: 8,  unlockStageOrder: 2, hunger: 28, happiness: 20, energy: 8,  health: 0, junk: true,  junkLoad: 32 },
  { id: 'carne',     name: 'Carne',       description: 'Sólida y nutritiva. La favorita de los duros.',         tier: 2, cost: 14, unlockStageOrder: 2, hunger: 48, happiness: 4,  energy: 6,  health: 5, junk: false, junkLoad: 0 },
  { id: 'sushi',     name: 'Sushi',       description: 'Gourmet: llena, alegra y da salud.',                    tier: 3, cost: 22, unlockStageOrder: 3, hunger: 45, happiness: 16, energy: 8,  health: 8, junk: false, junkLoad: 0 },
  { id: 'elixir',    name: 'Elixir',      description: 'End-game: rellena energía y repara la salud.',          tier: 3, cost: 45, unlockStageOrder: 4, hunger: 20, happiness: 10, energy: 60, health: 20, junk: false, junkLoad: 0 },
];

export function getFood(foodId: FoodId): FoodDefinition | undefined {
  return FOODS.find((food) => food.id === foodId);
}

/** Qué comida puede comprar esta mascota (según su estadio). */
export function foodsForStageOrder(stageOrder: number): FoodDefinition[] {
  return FOODS.filter((food) => food.unlockStageOrder <= stageOrder);
}
