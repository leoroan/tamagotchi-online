import { rgb } from '@/types/color';
import type { ScreenTheme } from '../types';

/**
 * VERDE PORTÁTIL: 4 tonos de verde, más resolución interna (48x32).
 * Demuestra que cambiar resolución no requiere tocar la lógica del juego.
 */
export const GAMEBOY_GREEN: ScreenTheme = {
  id: 'gameboy-green',
  label: 'Verde portátil',
  description: '48x32 en cuatro tonos de verde. Más espacio para el bicho.',
  width: 48,
  height: 32,
  monochrome: true,
  palette: {
    background: rgb(155, 188, 15),
    ink: rgb(15, 56, 15),
    inkDim: rgb(48, 98, 48),
    accent: rgb(139, 172, 15),
  },
  pixelGrid: true,
  ghosting: 0.3,
  glow: 0,
  scanlines: false,
  scaleMode: 'integer',
  backgroundStyle: 'room',
  unlockCost: 60,
};
