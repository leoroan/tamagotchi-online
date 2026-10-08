import { getStage } from '@/game/lifecycle';
import type { PetState } from '@/game/types';
import type { PixelCanvas } from '../pixelCanvas';
import type { PetAnimation, SpriteFrameRequest, SpriteProvider } from './types';

/**
 * SPRITES PLACEHOLDER (procedurales, cero archivos).
 *
 * Idea: que el juego se vea y se juegue HOY, sin haber dibujado nada. Cada
 * estadio de vida tiene su silueta, cada estado su animación, cada especie su
 * oreja/aleta, y cada mutación un detalle visible. Cuando tengas los sprites de
 * Piskel, se escribe otro SpriteProvider y este archivo se jubila
 * (ver sprites/README.md).
 */

/** Traduce el estado de la mascota a una animación concreta. */
export function animationFor(pet: PetState): PetAnimation {
  if (!pet.alive) return 'dead';
  if (getStage(pet.stageId).order === 0) return 'egg';
  switch (pet.status) {
    case 'eating':
      return 'eat';
    case 'playing':
      return 'play';
    case 'sleeping':
      return 'sleep';
    case 'bathing':
      return 'bath';
    case 'healing':
      return 'heal';
    case 'evolving':
      return 'evolve';
    default:
      return 'idle';
  }
}

/** Latido de animación: en vez de un reloj de animación aparte, se deriva del
 *  reloj de juego y del frame. Menos estado = menos bugs. */
function phase(request: SpriteFrameRequest, periodMs: number): number {
  return (request.gameNow / periodMs) % 1;
}

function drawEyes(canvas: PixelCanvas, request: SpriteFrameRequest, cx: number, cy: number, spacing: number, openSize: number): void {
  const color = request.palette.ink;
  const blinkPhase = phase(request, 4200);
  const blinking = blinkPhase > 0.94 && request.animation !== 'sleep';
  const closed = request.animation === 'sleep' || request.animation === 'dead';

  if (request.animation === 'dead') {
    // Ojos en X: el clásico "no está más".
    for (let i = -1; i <= 1; i += 1) {
      canvas.plot(cx - spacing + i, cy - 1 + i, color);
      canvas.plot(cx + spacing + i, cy - 1 + i, color);
      canvas.plot(cx - spacing + i, cy + 1 - i, color);
      canvas.plot(cx + spacing + i, cy + 1 - i, color);
    }
    return;
  }

  if (closed || blinking) {
    canvas.fillRect(cx - spacing - 1, cy, 3, 1, color);
    canvas.fillRect(cx + spacing - 1, cy, 3, 1, color);
    return;
  }

  canvas.fillRect(cx - spacing, cy - (openSize - 1), openSize, openSize, color);
  canvas.fillRect(cx + spacing, cy - (openSize - 1), openSize, openSize, color);
}

function drawMouth(canvas: PixelCanvas, request: SpriteFrameRequest, cx: number, cy: number, width: number): void {
  const color = request.palette.ink;
  if (request.animation === 'eat') {
    // Boca abierta/cerrada: efecto de masticar.
    const chewing = Math.sin(request.gameNow / 160) > 0;
    canvas.fillRect(cx - 1, cy, chewing ? 3 : 2, chewing ? 2 : 1, color);
    return;
  }
  if (request.animation === 'sleep' || request.animation === 'dead') {
    canvas.fillRect(cx - 1, cy, 3, 1, color);
    return;
  }
  const happy = request.pet.stats.happiness >= 45 && !request.pet.sick;
  if (happy) {
    // Sonrisa: píxeles hacia arriba en los extremos.
    canvas.plot(cx - Math.ceil(width / 2), cy, color);
    canvas.fillRect(cx - Math.floor(width / 2) + 1, cy + 1, Math.max(1, width - 1), 1, color);
    canvas.plot(cx + Math.ceil(width / 2), cy, color);
  } else {
    canvas.fillRect(cx - Math.floor(width / 2), cy, width, 1, color);
    canvas.plot(cx - Math.ceil(width / 2) - 1, cy + 1, color);
    canvas.plot(cx + Math.ceil(width / 2) + 1, cy + 1, color);
  }
}

function drawEars(canvas: PixelCanvas, request: SpriteFrameRequest, cx: number, top: number, halfWidth: number): void {
  const style = request.species.earStyle;
  const color = request.palette.base;
  const shade = request.palette.shade;
  if (style === 'spikes') {
    for (let i = 0; i < 3; i += 1) {
      const x = cx - halfWidth + i * 2;
      canvas.plot(x, top - 1, color);
      canvas.plot(x, top - 2, color);
      canvas.plot(x, top - 3, shade);
    }
    return;
  }
  if (style === 'fins') {
    canvas.fillRect(cx - halfWidth - 2, top + 2, 2, 2, shade);
    canvas.fillRect(cx + halfWidth, top + 2, 2, 2, shade);
    return;
  }
  if (style === 'antenna') {
    canvas.plot(cx, top - 1, shade);
    canvas.plot(cx, top - 2, shade);
    canvas.plot(cx, top - 3, request.palette.accent);
    return;
  }
  // Sin orejas: dos bultitos para que no parezca una piedra.
  canvas.plot(cx - halfWidth + 1, top, color);
  canvas.plot(cx + halfWidth - 1, top, color);
}

function drawLegs(canvas: PixelCanvas, request: SpriteFrameRequest, cx: number, bottom: number, halfWidth: number): void {
  const color = request.palette.ink;
  const step = request.animation === 'play' ? Math.round(Math.sin(request.gameNow / 220)) : 0;
  canvas.fillRect(cx - halfWidth + 1, bottom, 1, 2 + step, color);
  canvas.fillRect(cx + halfWidth - 2, bottom, 1, 2 - step, color);
}

function drawMutationOverlays(canvas: PixelCanvas, request: SpriteFrameRequest, cx: number, cy: number, size: number): void {
  const mutations = request.pet.mutations;
  const accent = request.palette.accent;
  const ink = request.palette.ink;

  if (mutations.includes('brillo') || mutations.includes('eterno')) {
    // Halo pulsante alrededor del cuerpo.
    const pulse = 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(request.gameNow / 500));
    canvas.fillEllipse(cx, cy, size * 0.62, size * 0.62, accent, pulse);
  }
  if (mutations.includes('pulpo')) {
    for (let i = -1; i <= 1; i += 1) {
      const sway = Math.round(Math.sin(request.gameNow / 600 + i) * 1.5);
      canvas.line(cx + i * 3, cy + Math.round(size * 0.35), cx + i * 3 + sway, cy + Math.round(size * 0.35) + 4, ink);
    }
  }
  if (mutations.includes('alado')) {
    const flap = Math.round(Math.sin(request.gameNow / 300));
    canvas.fillRect(cx - Math.round(size * 0.55), cy - 1 + flap, 3, 2, accent);
    canvas.fillRect(cx + Math.round(size * 0.45), cy - 1 + flap, 3, 2, accent);
  }
  if (mutations.includes('cristal')) {
    canvas.fillEllipse(cx - 2, cy - 2, 1, 1, accent, 0.9);
    canvas.plot(cx + 2, cy + 1, accent);
  }
  if (mutations.includes('toxico')) {
    const bubbles = [
      [cx - 4, cy - 4],
      [cx + 3, cy - 5],
      [cx + 5, cy - 1],
    ] as const;
    for (const [bx, by] of bubbles) {
      const rise = Math.round(Math.sin(request.gameNow / 800 + bx) * 1);
      canvas.plot(bx, by + rise, accent);
    }
  }
  if (mutations.includes('prismatico')) {
    const colors = request.palette.mono ? [accent, ink] : [accent, ink];
    for (let i = 0; i < 6; i += 1) {
      const angle = (request.gameNow / 900 + i / 6) * Math.PI * 2;
      const color = colors[i % colors.length] ?? ink;
      canvas.plot(cx + Math.cos(angle) * (size * 0.6), cy + Math.sin(angle) * (size * 0.6), color, 0.85);
    }
  }
  if (mutations.includes('coloso')) {
    canvas.fillRect(cx - 4, cy + Math.round(size * 0.4), 9, 1, ink);
  }
}

export const PLACEHOLDER_SPRITES: SpriteProvider = {
  id: 'placeholder',
  label: 'Dibujado por código (sin assets)',
  draw(canvas: PixelCanvas, request: SpriteFrameRequest): void {
    const { box, palette, stageOrder, animation } = request;
    const cx = box.x + Math.floor(box.size / 2);
    const floorY = box.y + box.size - 1;
    const base = palette.base;
    const shade = palette.shade;

    // ── Huevo ──────────────────────────────────────────────────────────────
    if (stageOrder === 0) {
      const wobble = Math.sin(request.gameNow / 700);
      const tilt = wobble > 0.8 ? 1 : wobble < -0.8 ? -1 : 0;
      const rx = box.size * 0.28;
      const ry = box.size * 0.34;
      const cy = floorY - Math.round(ry) + 1;
      canvas.fillEllipse(cx + tilt, cy, rx, ry, base);
      canvas.fillEllipse(cx + tilt - 1, cy - 1, rx * 0.45, ry * 0.4, shade, 0.7);
      canvas.plot(cx + 1 + tilt, cy - 2, shade);
      canvas.plot(cx - 2 + tilt, cy + 1, shade);
      canvas.plot(cx + tilt, cy + 3, shade);
      return;
    }

    // ── Cuerpo ─────────────────────────────────────────────────────────────
    // Crece con el estadio, pero el hueco del encuadre es fijo: así se ve la evolución.
    const grow = Math.min(1, 0.5 + stageOrder * 0.11);
    const size = box.size;
    let bodyW = size * 0.3 * (1 + grow);
    let bodyH = size * 0.32 * (1 + grow);
    if (request.species.bodyShape === 'tall') bodyH *= 1.15;
    if (request.species.bodyShape === 'squat') {
      bodyW *= 1.2;
      bodyH *= 0.85;
    }

    // Respiración / saltito: 1 píxel, que en pantalla se nota muchísimo.
    let bob = 0;
    if (animation === 'idle') bob = Math.sin(request.gameNow / 700) > 0 ? 0 : 1;
    if (animation === 'play') bob = Math.sin(request.gameNow / 180) > 0.2 ? -2 : 0;
    if (animation === 'evolve') bob = Math.sin(request.gameNow / 120) > 0 ? -1 : 0;
    if (animation === 'sleep') bob = 1;

    const bodyBottom = floorY - 2 + bob;
    const bodyCy = Math.round(bodyBottom - bodyH / 2);

    // Sombra en el piso: le da peso al sprite.
    canvas.fillEllipse(cx, floorY + 1, bodyW * 0.9, 1, palette.inkDim, 0.35);

    drawMutationOverlays(canvas, request, cx, bodyCy, size);
    canvas.fillEllipse(cx, bodyCy, bodyW, bodyH, base);
    canvas.fillEllipse(cx - bodyW * 0.25, bodyCy - bodyH * 0.3, bodyW * 0.4, bodyH * 0.35, palette.mono ? base : shade, 0.55);
    drawEars(canvas, request, cx, Math.round(bodyCy - bodyH), Math.round(bodyW));

    if (stageOrder >= 2) drawLegs(canvas, request, cx, Math.round(bodyBottom), Math.round(bodyW));

    const eyeSize = stageOrder >= 3 ? 2 : 1;
    const eyeSpacing = Math.max(2, Math.round(bodyW * 0.45));
    // Parpadeo, ojos y boca se apoyan en el mismo "hueco" de la cara.
    drawEyes(canvas, request, cx, Math.round(bodyCy - bodyH * 0.15), eyeSpacing, eyeSize);
    drawMouth(canvas, request, cx, Math.round(bodyCy + bodyH * 0.45), Math.max(2, Math.round(bodyW * 0.5)));

    // Sucia: manchitas. Hambrienta: no hay nada que dibujar, se le nota en la cara.
    if (request.isDirty) {
      canvas.plot(cx - Math.round(bodyW * 0.6), bodyCy + 1, palette.inkDim);
      canvas.plot(cx + Math.round(bodyW * 0.5), bodyCy + Math.round(bodyH * 0.5), palette.inkDim);
      canvas.plot(cx - 1, bodyCy + Math.round(bodyH * 0.7), palette.inkDim);
    }

    // Sudor cuando está mal: un cuadradito que aparece y desaparece.
    if (request.isCritical || request.pet.sick) {
      const blink = Math.sin(request.gameNow / 300) > 0;
      if (blink) {
        canvas.plot(cx + Math.round(bodyW) + 1, Math.round(bodyCy - bodyH * 0.6), palette.ink);
        canvas.plot(cx + Math.round(bodyW) + 1, Math.round(bodyCy - bodyH * 0.6) + 1, palette.accent, 0.8);
        canvas.plot(cx + Math.round(bodyW) + 1, Math.round(bodyCy - bodyH * 0.6) + 2, palette.inkDim, 0.7);
      }
    }
  },
};
