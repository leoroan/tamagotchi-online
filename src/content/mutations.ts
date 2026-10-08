import type { MutationId } from '@/game/types';
import type { MutationDefinition } from './mutationTypes';

/**
 * MUTACIONES: el end-game.
 *
 * Reglas del diseño:
 *  - Se tiran al EVOLUCIONAR (no al azar de fondo), con chance que depende del
 *    cuidado y del vínculo: cuidar bien = más chance. Es el premio a largo plazo.
 *  - Son permanentes y se acumulan: 1 mascota puede tener varias.
 *  - Multiplican el score y cambian la apariencia. Así "vivir mucho" y "mutar"
 *    son las dos fuentes del ranking, como querías.
 *  - Pueden requerir condiciones raras (haberla intoxicado a propósito, haber
 *    llegado a anciano, ya tener otra mutación...). Eso genera historias y
 *    coleccionismo, y es contenido nuevo sin programar gameplay nuevo.
 */
export const MUTATIONS: readonly MutationDefinition[] = [
  {
    id: 'brillo', name: 'Brillo', rarity: 'common', weight: 40, scoreMultiplier: 1.15, minStageOrder: 1,
    description: 'Su piel emite un pulso suave. La mutación más común; primera de muchas colecciones.',
    requirements: { minCareScore: 10 },
    visual: { tint: '#eaffd0', glows: true },
  },
  {
    id: 'pulpo', name: 'Tentáculos', rarity: 'common', weight: 30, scoreMultiplier: 1.25, minStageOrder: 2,
    description: 'Le brotaron apéndices. Abraza cosas. Sospechoso pero adorable.',
    requirements: { minBond: 45 },
    visual: { tint: '#c7a2ff', glows: false },
  },
  {
    id: 'cristal', name: 'Cristalino', rarity: 'rare', weight: 14, scoreMultiplier: 1.45, minStageOrder: 3,
    description: 'Su cuerpo se volvió translúcido. Se ven los órganos. Se ve la constancia del jugador.',
    requirements: { minCareScore: 55, minBond: 40 },
    visual: { tint: '#bff3ff', glows: true },
  },
  {
    id: 'toxico', name: 'Tóxico', rarity: 'rare', weight: 12, scoreMultiplier: 1.5, minStageOrder: 2,
    description: 'Mutación sucia: solo aparece en mascotas mal alimentadas. Paga bien, huele peor.',
    requirements: { minJunkLoad: 45 },
    visual: { tint: '#b6ff6a', glows: true },
  },
  {
    id: 'alado', name: 'Alado', rarity: 'epic', weight: 6, scoreMultiplier: 1.8, minStageOrder: 3,
    description: 'Le crecieron alas. Flota un píxel sobre el suelo cuando duerme.',
    requirements: { minCareScore: 65, minBond: 60 },
    visual: { tint: '#fff6c0', glows: true },
  },
  {
    id: 'prismatico', name: 'Prismático', rarity: 'epic', weight: 4, scoreMultiplier: 2.2, minStageOrder: 4,
    description: 'Dos mutaciones sostenidas en el tiempo refractan la luz de la pantalla LCD. Pura ostentación.',
    requirements: { minCareScore: 70, minMutations: 2 },
    visual: { tint: '#ffd5f5', glows: true },
  },
  {
    id: 'coloso', name: 'Coloso', rarity: 'epic', weight: 4, scoreMultiplier: 2.0, minStageOrder: 4,
    description: 'Creció de más. No entra entera en pantalla; hay que moverla para verla.',
    requirements: { minCareScore: 60, minMeals: 40, speciesIds: ['puas'] },
    visual: { tint: '#ffbb88', glows: false },
  },
  {
    id: 'eterno', name: 'Eterno', rarity: 'legendary', weight: 1.2, scoreMultiplier: 3.0, minStageOrder: 5,
    description: 'Solo alcanzable en la ancianidad con cuidado casi perfecto. Multiplica el score x3 y ya no envejece.',
    requirements: { minCareScore: 88, minBond: 80, minMeals: 80 },
    visual: { tint: '#ffffff', glows: true },
  },
];

export function getMutation(mutationId: MutationId): MutationDefinition | undefined {
  return MUTATIONS.find((mutation) => mutation.id === mutationId);
}

/** Utilidad: traer las definiciones de las mutaciones que ya tiene una mascota. */
export function getMutationDefinitions(mutationIds: readonly MutationId[]): MutationDefinition[] {
  return MUTATIONS.filter((mutation) => mutationIds.includes(mutation.id));
}
