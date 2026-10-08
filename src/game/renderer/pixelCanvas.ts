import type { RGB } from '@/types/color';

/**
 * LIENZO DE PÍXELES propio.
 *
 * Un buffer RGBA en memoria donde 1 unidad = 1 píxel REAL de la pantalla de la
 * mascota (32x24 en el estilo LCD clásico). Después se escala x8/x12 con
 * `imageSmoothingEnabled = false` para que se vean los cuadraditos.
 *
 * Ventajas contra dibujar directo en el canvas del DOM:
 *  - No depende del DOM => se puede testear en Node (y hasta hashear el frame).
 *  - Te obliga al look pixel-art auténtico: no hay antialiasing ni decimales.
 *  - Reemplazar el "arte" es reemplazar quién escribe en este buffer.
 */
export class PixelCanvas {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.data = new Uint8ClampedArray(this.width * this.height * 4);
  }

  index(x: number, y: number): number {
    return (Math.floor(y) * this.width + Math.floor(x)) * 4;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  clear(color: RGB | null, alpha = 1): void {
    if (color === null) {
      this.data.fill(0);
      return;
    }
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) this.plot(x, y, color, alpha);
    }
  }

  /** Pinta un píxel con alpha (source-over simple). */
  plot(x: number, y: number, color: RGB, alpha = 1): void {
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (!this.inBounds(px, py) || alpha <= 0) return;
    const i = this.index(px, py);
    const a = Math.min(1, alpha);
    const dstA = (this.data[i + 3] ?? 0) / 255;
    const outA = a + dstA * (1 - a);
    if (outA <= 0) return;
    for (let c = 0; c < 3; c += 1) {
      const src = c === 0 ? color.r : c === 1 ? color.g : color.b;
      const dst = this.data[i + c] ?? 0;
      this.data[i + c] = Math.round((src * a + dst * dstA * (1 - a)) / outA);
    }
    this.data[i + 3] = Math.round(outA * 255);
  }

  readAt(x: number, y: number): RGB | null {
    if (!this.inBounds(x, y)) return null;
    const i = this.index(x, y);
    if ((this.data[i + 3] ?? 0) === 0) return null;
    return { r: this.data[i] ?? 0, g: this.data[i + 1] ?? 0, b: this.data[i + 2] ?? 0 };
  }

  fillRect(x: number, y: number, w: number, h: number, color: RGB, alpha = 1): void {
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) this.plot(x + dx, y + dy, color, alpha);
    }
  }

  strokeRect(x: number, y: number, w: number, h: number, color: RGB, alpha = 1): void {
    for (let dx = 0; dx < w; dx += 1) {
      this.plot(x + dx, y, color, alpha);
      this.plot(x + dx, y + h - 1, color, alpha);
    }
    for (let dy = 0; dy < h; dy += 1) {
      this.plot(x, y + dy, color, alpha);
      this.plot(x + w - 1, y + dy, color, alpha);
    }
  }

  /** Elipse rellena por fuerza bruta: con 32x24 el costo es irrelevante. */
  fillEllipse(cx: number, cy: number, rx: number, ry: number, color: RGB, alpha = 1): void {
    const rxr = Math.max(0.5, rx);
    const ryr = Math.max(0.5, ry);
    for (let y = Math.floor(cy - ryr); y <= Math.ceil(cy + ryr); y += 1) {
      for (let x = Math.floor(cx - rxr); x <= Math.ceil(cx + rxr); x += 1) {
        const nx = (x - cx) / rxr;
        const ny = (y - cy) / ryr;
        if (nx * nx + ny * ny <= 1) this.plot(x, y, color, alpha);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: RGB, alpha = 1): void {
    let x = Math.floor(x0);
    let y = Math.floor(y0);
    const tx = Math.floor(x1);
    const ty = Math.floor(y1);
    const dx = Math.abs(tx - x);
    const dy = Math.abs(ty - y);
    const sx = x < tx ? 1 : -1;
    const sy = y < ty ? 1 : -1;
    let err = dx - dy;
    for (let guard = 0; guard < 4096; guard += 1) {
      this.plot(x, y, color, alpha);
      if (x === tx && y === ty) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /** Copia otro buffer encima (útil para las "calcomanías" de mutaciones). */
  drawCanvas(source: PixelCanvas, offsetX = 0, offsetY = 0, alpha = 1): void {
    for (let y = 0; y < source.height; y += 1) {
      for (let x = 0; x < source.width; x += 1) {
        const i = source.index(x, y);
        const a = (source.data[i + 3] ?? 0) / 255;
        if (a <= 0) continue;
        this.plot(x + offsetX, y + offsetY, { r: source.data[i] ?? 0, g: source.data[i + 1] ?? 0, b: source.data[i + 2] ?? 0 }, a * alpha);
      }
    }
  }

  /** Copia profunda: útil para "foto" del frame anterior (ghosting del LCD). */
  clone(): PixelCanvas {
    const copy = new PixelCanvas(this.width, this.height);
    copy.data.set(this.data);
    return copy;
  }
}
