import { PLACEHOLDER_SPRITES } from './placeholderSprites';
import type { SpriteProvider } from './types';

/**
 * Proveedor activo. Cambiarlo es cambiar UNA línea:
 *   export const ACTIVE_SPRITES = SHEET_SPRITES;
 * (y listo: la mascota usa tus dibujos de Piskel).
 */
export const ACTIVE_SPRITES: SpriteProvider = PLACEHOLDER_SPRITES;

export * from './types';
export { PLACEHOLDER_SPRITES, animationFor } from './placeholderSprites';
