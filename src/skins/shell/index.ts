import type { ShellSkin, ShellSkinId } from '../types';
import { NEON_ARCADE } from './neonArcade';
import { PLASTIC_CLASSIC } from './plasticClassic';
import { WOOD_RETRO } from './woodRetro';

/** Registro de carcasas. Misma idea que los temas: data, no código. */
export const SHELL_SKINS: readonly ShellSkin[] = [PLASTIC_CLASSIC, NEON_ARCADE, WOOD_RETRO];

export const DEFAULT_SHELL_SKIN_ID: ShellSkinId = PLASTIC_CLASSIC.id;

export function getShellSkin(id: ShellSkinId | null | undefined): ShellSkin {
  return SHELL_SKINS.find((skin) => skin.id === id) ?? PLASTIC_CLASSIC;
}

export { NEON_ARCADE, PLASTIC_CLASSIC, WOOD_RETRO };
