/** Color en RGB entero 0..255. El core de render trabaja con esto, no con strings. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function rgb(r: number, g: number, b: number): RGB {
  return { r, g, b };
}

/** '#8bd450' -> { r:139, g:212, b:80 }. Acepta con o sin '#', 3 o 6 dígitos. */
export function hexToRgb(hex: string): RGB {
  let value = hex.trim().replace('#', '');
  if (value.length === 3) value = value.split('').map((char) => char + char).join('');
  const int = Number.parseInt(value, 16);
  if (Number.isNaN(int)) return rgb(255, 0, 255); // magenta = "color roto", fácil de ver
  return rgb((int >> 16) & 255, (int >> 8) & 255, int & 255);
}

export function rgbToCss(color: RGB, alpha = 1): string {
  return alpha >= 1 ? `rgb(${color.r}, ${color.g}, ${color.b})` : `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

/** Mezcla lineal: t=0 => a, t=1 => b. */
export function mix(a: RGB, b: RGB, t: number): RGB {
  const k = Math.min(1, Math.max(0, t));
  return rgb(Math.round(a.r + (b.r - a.r) * k), Math.round(a.g + (b.g - a.g) * k), Math.round(a.b + (b.b - a.b) * k));
}

/** Luminancia perceptual 0..1 (para decidir si un color es "claro" u "oscuro"). */
export function luminance(color: RGB): number {
  return (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
}

export function lighten(color: RGB, amount = 0.15): RGB {
  return mix(color, rgb(255, 255, 255), amount);
}

export function darken(color: RGB, amount = 0.15): RGB {
  return mix(color, rgb(0, 0, 0), amount);
}
