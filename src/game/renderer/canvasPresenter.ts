import type { ScreenTheme } from '@/skins/types';
import { rgbToCss } from '@/types/color';
import { PixelCanvas } from './pixelCanvas';
import { composeScene, type SceneRequest } from './scene';
import type { SpriteProvider } from './sprites/types';

/**
 * PRESENTADOR: la única pieza que habla con el DOM.
 *
 * Responsabilidades (y nada más que esto):
 *  - Mantener un canvas interno del tamaño del tema (32x24, 48x32…).
 *  - Escalar con factor ENTERO y `imageSmoothingEnabled = false` => píxeles
 *    perfectos, sin bordes borrosos.
 *  - Agregar los "defectos" del hardware: grilla de píxeles, estela (ghosting),
 *    glow del backlight, scanlines.
 *
 * No conoce el juego: recibe `PetState` y dibuja. Eso permite la Fase 3 (R3F)
 * sin tocar nada de acá, y permite usarlo en una página pública de solo lectura.
 */
export interface PresenterFrame {
  pet: SceneRequest['pet'];
  gameNow: number;
  nightMode?: boolean;
  hud?: SceneRequest['hud'];
}

export class CanvasPresenter {
  private readonly canvas: HTMLCanvasElement;
  private readonly spriteProvider: SpriteProvider;
  private theme: ScreenTheme;
  private scene: PixelCanvas;
  private offscreen: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;
  private ctx: CanvasRenderingContext2D | null;
  private ghost: HTMLCanvasElement | null = null;
  private frame = 0;

  constructor(options: { canvas: HTMLCanvasElement; theme: ScreenTheme; spriteProvider: SpriteProvider }) {
    this.canvas = options.canvas;
    this.theme = options.theme;
    this.spriteProvider = options.spriteProvider;
    this.scene = new PixelCanvas(this.theme.width, this.theme.height);
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = this.theme.width;
    this.offscreen.height = this.theme.height;
    this.offscreenCtx = this.offscreen.getContext('2d');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
  }

  setTheme(theme: ScreenTheme): void {
    this.theme = theme;
    this.scene = new PixelCanvas(theme.width, theme.height);
    this.offscreen.width = theme.width;
    this.offscreen.height = theme.height;
    this.ghost = null;
    this.resize();
  }

  /** Ajusta el canvas de pantalla al tamaño CSS disponible (device pixel ratio incluido). */
  resize(): void {
    const ratio = typeof window === 'undefined' ? 1 : Math.min(2.5, window.devicePixelRatio || 1);
    const cssWidth = Math.max(1, Math.floor(this.canvas.clientWidth || this.theme.width * 8));
    const cssHeight = Math.max(1, Math.floor(this.canvas.clientHeight || this.theme.height * 8));
    this.canvas.width = Math.floor(cssWidth * ratio);
    this.canvas.height = Math.floor(cssHeight * ratio);
  }

  /** Escala en píxeles de dispositivo (factor entero salvo en modo 'fit'). */
  scale(): number {
    const raw = Math.min(this.canvas.width / this.theme.width, this.canvas.height / this.theme.height);
    if (this.theme.scaleMode === 'fit') return raw;
    return Math.max(1, Math.floor(raw));
  }

  render(frame: PresenterFrame): void {
    const ctx = this.ctx;
    if (!ctx || !this.offscreenCtx) return;
    this.frame += 1;

    composeScene(this.scene, {
      pet: frame.pet,
      gameNow: frame.gameNow,
      frame: this.frame,
      theme: this.theme,
      spriteProvider: this.spriteProvider,
      nightMode: frame.nightMode ?? false,
      hud: frame.hud ?? 'minimal',
    });

    // 1) Buffer de píxeles -> ImageData -> canvas del tamaño del tema.
    this.offscreenCtx.imageSmoothingEnabled = false;
    this.offscreenCtx.putImageData(new ImageData(new Uint8ClampedArray(this.scene.data), this.theme.width, this.theme.height), 0, 0);

    // 2) Canvas real: fondo, glow del backlight y la imagen escalada al centro.
    const scale = this.scale();
    const drawWidth = this.theme.width * scale;
    const drawHeight = this.theme.height * scale;
    const offsetX = Math.floor((this.canvas.width - drawWidth) / 2);
    const offsetY = Math.floor((this.canvas.height - drawHeight) / 2);

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = rgbToCss(this.theme.palette.background);
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.theme.glow > 0) {
      ctx.save();
      ctx.shadowColor = rgbToCss(this.theme.palette.accent, 0.85);
      ctx.shadowBlur = this.theme.glow * scale * 0.5;
      ctx.drawImage(this.offscreen, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();
    }

    ctx.drawImage(this.offscreen, offsetX, offsetY, drawWidth, drawHeight);

    // 3) Estela del frame anterior (el "smearing" del cristal líquido).
    if (this.theme.ghosting > 0 && this.ghost) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.6, this.theme.ghosting * 0.5);
      ctx.drawImage(this.ghost, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();
    }

    // 4) Defectos de hardware: scanlines y grilla de píxeles.
    if (this.theme.scanlines) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for (let y = offsetY; y < offsetY + drawHeight; y += 2) ctx.fillRect(offsetX, y, drawWidth, 1);
      ctx.restore();
    }
    if (this.theme.pixelGrid && scale >= 3) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      for (let x = 1; x < this.theme.width; x += 1) ctx.fillRect(offsetX + x * scale, offsetY, 1, drawHeight);
      for (let y = 1; y < this.theme.height; y += 1) ctx.fillRect(offsetX, offsetY + y * scale, drawWidth, 1);
      ctx.restore();
    }

    // 5) Guardar el frame como "fantasma" para la próxima estela.
    if (this.theme.ghosting > 0) {
      if (!this.ghost) this.ghost = document.createElement('canvas');
      this.ghost.width = this.theme.width;
      this.ghost.height = this.theme.height;
      const ghostCtx = this.ghost.getContext('2d');
      ghostCtx?.drawImage(this.offscreen, 0, 0);
    }
  }
}
