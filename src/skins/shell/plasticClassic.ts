import type { ShellSkin } from '../types';

/** Carcasa de plástico gris con los tres botones de colores. La de siempre. */
export const PLASTIC_CLASSIC: ShellSkin = {
  id: 'plastico-clasico',
  label: 'Plástico clásico',
  description: 'Gris, redondeada, con botones rojo, azul y amarillo. Nostalgia pura.',
  appearance: {
    body: '#b9bcc4',
    bodyShadow: '#8b8f99',
    bezel: '#5a5e66',
    button: '#2f333b',
    buttonShadow: '#1c1f25',
    buttonText: '#f2f4f8',
    screenTint: 'rgba(0,0,0,0.06)',
  },
  material: { roughness: 0.35, metalness: 0.05, clearcoat: 0.4 },
  unlockCost: 0,
};
