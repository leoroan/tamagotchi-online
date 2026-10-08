import type { ShellSkin } from '../types';

/** Carcasa de madera tipo radio vieja. Se compra con monedas del juego. */
export const WOOD_RETRO: ShellSkin = {
  id: 'madera-retro',
  label: 'Madera retro',
  description: 'Como la radio de la abuela, pero con un bicho adentro.',
  appearance: {
    body: '#7a4a26',
    bodyShadow: '#4c2c14',
    bezel: '#2c1a0c',
    button: '#c9a06a',
    buttonShadow: '#8a6a3f',
    buttonText: '#2c1a0c',
    screenTint: 'rgba(255,200,120,0.08)',
  },
  material: { roughness: 0.6, metalness: 0, clearcoat: 0.15 },
  unlockCost: 150,
};
