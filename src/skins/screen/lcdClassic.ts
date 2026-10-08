import { rgb } from '@/types/color';
import type { ScreenTheme } from '../types';

/**
 * LCD CLÁSICO: la pantalla de los tamagotchi de los 90.
 * Verde-gris de fondo, tinta oscura, 32x24 píxeles, TODOS los defectos a la
 * vista: grilla de píxeles y esa estela que dejan los sprites al moverse.
 */
export const LCD_CLASSIC: ScreenTheme = {
  id: 'lcd-classic',
  label: 'LCD clásico',
  description: 'Monocromo 32x24 con estela y grilla visible. El look original.',
  width: 32,
  height: 24,
  monochrome: true,
  palette: {
    background: rgb(158, 168, 143),
    ink: rgb(28, 32, 26),
    inkDim: rgb(96, 106, 86),
    accent: rgb(60, 70, 52),
  },
  pixelGrid: true,
  ghosting: 0.35,
  glow: 0,
  scanlines: false,
  scaleMode: 'integer',
  backgroundStyle: 'room',
  unlockCost: 0,
};
