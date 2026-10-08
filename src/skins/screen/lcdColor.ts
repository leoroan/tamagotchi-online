import { rgb } from '@/types/color';
import type { ScreenTheme } from '../types';

/**
 * LCD COLOR: como las consolas portátiles a color.
 * Acá se ven los colores reales de cada especie y mutación (monochrome: false).
 */
export const LCD_COLOR: ScreenTheme = {
  id: 'lcd-color',
  label: 'LCD color',
  description: 'Mismo tamaño de píxel, pero a color: se lucen las especies y mutaciones.',
  width: 32,
  height: 24,
  monochrome: false,
  palette: {
    background: rgb(24, 28, 38),
    ink: rgb(240, 244, 255),
    inkDim: rgb(120, 134, 166),
    accent: rgb(96, 220, 176),
  },
  pixelGrid: false,
  ghosting: 0.12,
  glow: 8,
  scanlines: false,
  scaleMode: 'integer',
  backgroundStyle: 'room',
  unlockCost: 0,
};
