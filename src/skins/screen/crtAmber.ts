import { rgb } from '@/types/color';
import type { ScreenTheme } from '../types';

/**
 * CRT ÁMBAR: fósforo naranja, scanlines y glow. El look "terminal viejo".
 * Este tema NO usa la grilla: usa glow + scanlines, que es lo que tenía un CRT.
 */
export const CRT_AMBER: ScreenTheme = {
  id: 'crt-amber',
  label: 'CRT ámbar',
  description: 'Fósforo ámbar con glow y scanlines. Para cuando te cansás del LCD.',
  width: 48,
  height: 36,
  monochrome: true,
  palette: {
    background: rgb(26, 12, 0),
    ink: rgb(255, 176, 0),
    inkDim: rgb(150, 96, 0),
    accent: rgb(255, 226, 130),
  },
  pixelGrid: false,
  ghosting: 0.2,
  glow: 14,
  scanlines: true,
  scaleMode: 'integer',
  backgroundStyle: 'grid',
  unlockCost: 120,
};
