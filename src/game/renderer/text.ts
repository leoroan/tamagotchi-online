import type { RGB } from '@/types/color';
import type { PixelCanvas } from './pixelCanvas';
import { GLYPH_HEIGHT, GLYPH_WIDTH, glyphFor } from './pixelFont';

/** Dibuja texto con la fuente 3x5 en el buffer de píxeles. */
export function drawText(
  canvas: PixelCanvas,
  x: number,
  y: number,
  text: string,
  color: RGB,
  options: { scale?: number; letterSpacing?: number; alpha?: number } = {},
): void {
  const scale = options.scale ?? 1;
  const spacing = options.letterSpacing ?? 1;
  const alpha = options.alpha ?? 1;
  let cursor = x;
  for (const char of text) {
    const glyph = glyphFor(char);
    for (let row = 0; row < GLYPH_HEIGHT; row += 1) {
      const line = glyph[row] ?? '...';
      for (let col = 0; col < GLYPH_WIDTH; col += 1) {
        if (line[col] === '#') {
          canvas.fillRect(cursor + col * scale, y + row * scale, scale, scale, color, alpha);
        }
      }
    }
    cursor += GLYPH_WIDTH * scale + spacing * scale;
  }
}

export function drawTextCentered(
  canvas: PixelCanvas,
  y: number,
  text: string,
  color: RGB,
  options: { scale?: number; letterSpacing?: number; alpha?: number } = {},
): void {
  const scale = options.scale ?? 1;
  const spacing = options.letterSpacing ?? 1;
  const width = text.length * GLYPH_WIDTH * scale + Math.max(0, text.length - 1) * spacing * scale;
  drawText(canvas, Math.floor((canvas.width - width) / 2), y, text, color, options);
}
