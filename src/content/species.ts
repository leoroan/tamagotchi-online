import type { FoodId, MutationId, SpeciesId, StatKey } from '@/game/types';

/**
 * ESPECIE: la "clase" de mascota. Define cómo decae, qué le gusta, de qué
 * muta y qué silueta/colores usa el renderer.
 *
 * Agregar una especie = agregar un objeto a SPECIES + (opcional) arte.
 * Nada más. Esa es la escalabilidad que buscás.
 */
export interface SpeciesDefinition {
  id: SpeciesId;
  name: string;
  description: string;
  /** Forma base de la silueta (renderer placeholder de Fase 1; sprite sheet después). */
  bodyShape: 'round' | 'tall' | 'squat';
  earStyle: 'none' | 'spikes' | 'fins' | 'antenna';
  /** Colores en hex: el renderer los mapea a la paleta de la pantalla activa. */
  palette: { base: string; shade: string; accent: string };
  /** Modificadores de decaimiento: -0.2 = decae 20% más lento. */
  decayModifiers: Partial<Record<StatKey, number>>;
  favoriteFoodIds: FoodId[];
  /** "Sabor" del huevo: pondera las apariciones en la tienda de huevos. */
  eggRarity: number;
  /** 1 = crece normal; 1.25 = tarda 25% más (y vale más). */
  growthModifier: number;
  mutationPool: MutationId[];
}

export const SPECIES: readonly SpeciesDefinition[] = [
  {
    id: 'gelatina',
    name: 'Gelatina',
    description: 'La especie inicial: equilibrada, perezosa y agradecida. Ideal para aprender.',
    bodyShape: 'round',
    earStyle: 'none',
    palette: { base: '#8bd450', shade: '#4e8f2a', accent: '#d8ff9e' },
    decayModifiers: { energy: -0.15 },
    favoriteFoodIds: ['frutilla', 'pastel'],
    eggRarity: 10,
    growthModifier: 1,
    mutationPool: ['brillo', 'pulpo', 'cristal', 'eterno'],
  },
  {
    id: 'puas',
    name: 'Púas',
    description: 'Duro de carácter. Aguanta el hambre mucho mejor, pero se deprime si lo ignorás.',
    bodyShape: 'squat',
    earStyle: 'spikes',
    palette: { base: '#e0794b', shade: '#9c4a22', accent: '#ffd9b0' },
    decayModifiers: { hunger: -0.3, happiness: 0.15 },
    favoriteFoodIds: ['carne', 'sushi'],
    eggRarity: 6,
    growthModifier: 1.15,
    mutationPool: ['brillo', 'toxico', 'alado', 'coloso'],
  },
  {
    id: 'abisal',
    name: 'Abisal',
    description: 'Criatura de agua: se ensucia lentísimo, pero la energía se le va al toque.',
    bodyShape: 'tall',
    earStyle: 'fins',
    palette: { base: '#5bb6e0', shade: '#2a6d93', accent: '#c9f3ff' },
    decayModifiers: { hygiene: -0.35, energy: 0.2 },
    favoriteFoodIds: ['sushi', 'alga'],
    eggRarity: 4,
    growthModifier: 1.1,
    mutationPool: ['brillo', 'cristal', 'prismatico', 'eterno'],
  },
];

export const DEFAULT_SPECIES_ID: SpeciesId = SPECIES[0]?.id ?? 'gelatina';

export function getSpecies(speciesId: SpeciesId): SpeciesDefinition {
  return SPECIES.find((species) => species.id === speciesId) ?? (SPECIES[0] as SpeciesDefinition);
}

/** Mapa de "sabor" -> silueta: lo usan tanto el renderer 2D como el arte futuro. */
export const EAR_STYLE_BY_SPECIES: Record<string, SpeciesDefinition['earStyle']> = Object.fromEntries(
  SPECIES.map((species) => [species.id, species.earStyle]),
);
