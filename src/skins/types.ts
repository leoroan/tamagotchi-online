import type { RGB } from '@/types/color';

export type ScreenThemeId = string;
export type ShellSkinId = string;

/**
 * TEMA DE PANTALLA ("el juego"): define resolución interna, color, y cuánto
 * LCD/CRT falso se aplica (grilla de píxeles, ghosting, glow, scanlines).
 *
 * Cambiar de tema no toca NADA de la lógica: es solo esta config + el render.
 */
export interface ScreenTheme {
  id: ScreenThemeId;
  label: string;
  description: string;
  /** Resolución interna en píxeles reales del juego. */
  width: number;
  height: number;
  /** Si es monocromo, el sprite se dibuja con la rampa de la paleta (look LCD viejo). */
  monochrome: boolean;
  palette: {
    /** Fondo del cristal líquido. */
    background: RGB;
    /** Tinta principal (el "negro" del LCD). */
    ink: RGB;
    /** Tinta secundaria (detalles, sombras, texto apagado). */
    inkDim: RGB;
    /** Acento (notificaciones, mutaciones, brillos). */
    accent: RGB;
  };
  /** Dibuja la grilla de píxeles sobre la imagen escalada (muy LCD). */
  pixelGrid: boolean;
  /** 0..1 cuánta "estela" del frame anterior deja el panel (muy LCD también). */
  ghosting: number;
  /** Radio de glow del backlight, en píxeles CSS (0 = apagado). */
  glow: number;
  scanlines: boolean;
  scaleMode: 'integer' | 'fit';
  /** Fondo del escenario: plano, grilla o "cuarto" con piso. */
  backgroundStyle: 'plain' | 'grid' | 'room';
  /** Costo en monedas para desbloquear (0 = gratis). */
  unlockCost: number;
}

/**
 * SKIN DE CARCASA ("la cáscara"): el plástico de afuera.
 * Hoy se usa para el armazón en CSS; en Fase 3 la misma data alimenta
 * MeshPhysicalMaterial de R3F (roughness / clearcoat / metalness).
 */
export interface ShellSkin {
  id: ShellSkinId;
  label: string;
  description: string;
  appearance: {
    body: string;
    bodyShadow: string;
    bezel: string;
    button: string;
    buttonShadow: string;
    buttonText: string;
    screenTint: string;
  };
  material: { roughness: number; metalness: number; clearcoat: number };
  unlockCost: number;
}
