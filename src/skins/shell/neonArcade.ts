import type { ShellSkin } from '../types';

/** Carcasa oscura con acento cian: la versión "moderna" del plan original. */
export const NEON_ARCADE: ShellSkin = {
  id: 'neon-arcade',
  label: 'Neón arcade',
  description: 'Negro mate con luz cian y botones que parecen de arcade.',
  appearance: {
    body: '#1d2026',
    bodyShadow: '#0f1116',
    bezel: '#0a0c10',
    button: '#2b3440',
    buttonShadow: '#141a22',
    buttonText: '#7ef5e6',
    screenTint: 'rgba(0,255,220,0.05)',
  },
  material: { roughness: 0.2, metalness: 0.35, clearcoat: 0.8 },
  unlockCost: 40,
};
