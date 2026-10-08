import type { SpeciesDefinition } from '@/content/species';
import type { PetState } from '@/game/types';
import type { RGB } from '@/types/color';
import type { PixelCanvas } from '../pixelCanvas';

/**
 * ANIMACIÓN pedida: es la traducción de "qué está pasando" a "qué se dibuja".
 * Tenerla como id finito permite reemplazar el renderer sin tocar la lógica.
 */
export type PetAnimation = 'egg' | 'idle' | 'eat' | 'play' | 'sleep' | 'bath' | 'heal' | 'evolve' | 'dead';

/**
 * Paleta que el compositor le entrega al sprite.
 * En temas MONOCROMOS (LCD/CRT) la paleta NO tiene los colores de la especie:
 * tiene una rampa de tinta. Así el mismo dibujo sirve para los 4 temas y la
 * mascota "se ve" como el hardware que la muestra.
 */
export interface SpritePalette {
  base: RGB;
  shade: RGB;
  accent: RGB;
  ink: RGB;
  inkDim: RGB;
  mono: boolean;
}

export interface SpriteFrameRequest {
  pet: PetState;
  /** Reloj de juego (ms). El sprite lo usa para animar; nunca el reloj real. */
  gameNow: number;
  /** Contador de frames del loop. */
  frame: number;
  /** Caja donde dibujar (en píxeles de la pantalla del tema). */
  box: { x: number; y: number; size: number };
  palette: SpritePalette;
  species: SpeciesDefinition;
  /** Orden del estadio de vida (0 = huevo). */
  stageOrder: number;
  animation: PetAnimation;
  isDirty: boolean;
  isCritical: boolean;
}

/**
 * PROVEEDOR DE SPRITES: la costura que te deja cambiar el arte sin tocar el juego.
 *  - Hoy: `placeholderSprites` (dibuja formas por código, cero assets).
 *  - Mañana: `sheetSprites` (atlas PNG hecho en Piskel) o `threeSprites`.
 */
export interface SpriteProvider {
  id: string;
  label: string;
  draw(canvas: PixelCanvas, request: SpriteFrameRequest): void;
}
