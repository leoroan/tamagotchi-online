import { getSpecies } from '@/content/species';
import { getMutationDefinitions } from '@/content/mutations';
import type { ScreenTheme } from '@/skins/types';
import { darken, hexToRgb, mix, type RGB } from '@/types/color';
import { getStage } from '../lifecycle';
import { formatAgeCompact } from '../pet';
import { computeScore, formatScore } from '../scoring';
import type { PetState } from '../types';
import { PixelCanvas } from './pixelCanvas';
import { animationFor, type SpritePalette } from './sprites';
import type { SpriteProvider } from './sprites/types';
import { drawText } from './text';

/**
 * COMPOSITOR DE ESCENA: arma un frame completo en el buffer de píxeles.
 *
 * Función PURA: mismas entradas => mismo frame. Por eso se puede testear
 * ("¿el frame tiene píxeles?"), y por eso el "modo espectador" de la Fase 5
 * puede reusar exactamente este código sin traer React ni el canvas del DOM.
 */
export interface SceneRequest {
  pet: PetState;
  /** Reloj de juego en ms (el core nunca usa el reloj real). */
  gameNow: number;
  frame: number;
  theme: ScreenTheme;
  spriteProvider: SpriteProvider;
  /** Se activa de noche (hora local real) para el look de "cuarto oscuro". */
  nightMode?: boolean;
  hud?: 'off' | 'minimal' | 'full';
}

/** En temas mono, la mascota se pinta con la tinta de la pantalla (look LCD). */
function spritePalette(theme: ScreenTheme, pet: PetState): SpritePalette {
  const species = getSpecies(pet.speciesId);
  if (theme.monochrome) {
    return {
      base: theme.palette.ink,
      shade: theme.palette.inkDim,
      accent: theme.palette.accent,
      ink: theme.palette.ink,
      inkDim: theme.palette.inkDim,
      mono: true,
    };
  }
  let base = hexToRgb(species.palette.base);
  let shade = hexToRgb(species.palette.shade);
  const accent = hexToRgb(species.palette.accent);
  // Las mutaciones tiñen: son coleccionables VISIBLES, no solo un multiplicador.
  for (const mutation of getMutationDefinitions(pet.mutations)) {
    base = mix(base, hexToRgb(mutation.visual.tint), 0.35);
    shade = mix(shade, hexToRgb(mutation.visual.tint), 0.2);
  }
  return { base, shade, accent, ink: darken(base, 0.6), inkDim: darken(shade, 0.25), mono: false };
}

function drawBackground(scene: PixelCanvas, request: SceneRequest, fieldTop: number, fieldBottom: number): void {
  const { theme } = request;
  const bg = request.nightMode ? mix(theme.palette.background, { r: 0, g: 0, b: 0 }, 0.35) : theme.palette.background;
  scene.clear(bg);

  if (theme.backgroundStyle === 'grid') {
    for (let x = 2; x < scene.width; x += 4) {
      for (let y = fieldTop + 1; y < fieldBottom; y += 4) scene.plot(x, y, theme.palette.inkDim, 0.35);
    }
  }
  if (theme.backgroundStyle === 'room') {
    // Piso: una franja y una línea. Suficiente para que la mascota "pise" algo.
    for (let y = fieldBottom; y <= fieldBottom + 1 && y < scene.height; y += 1) {
      for (let x = 0; x < scene.width; x += 1) scene.plot(x, y, theme.palette.inkDim, 0.22);
    }
    for (let x = 0; x < scene.width; x += 1) scene.plot(x, fieldBottom, theme.palette.inkDim, 0.5);
  }

  if (request.nightMode) {
    // Luna + estrellas: el "afuera" del cuarto.
    scene.fillEllipse(3, fieldTop + 2, 2, 2, theme.palette.inkDim, 0.9);
    scene.fillEllipse(4, fieldTop + 1, 1.5, 1.5, mix(theme.palette.background, { r: 0, g: 0, b: 0 }, 0.35), 1);
    scene.plot(10, fieldTop + 1, theme.palette.inkDim, 0.8);
    scene.plot(18, fieldTop + 3, theme.palette.inkDim, 0.6);
  }
}

function drawDecor(
  scene: PixelCanvas,
  request: SceneRequest,
  geometry: { cx: number; floorY: number; fieldTop: number; fieldBottom: number; size: number },
): void {
  const { cx, floorY, size } = geometry;
  const ink = request.theme.palette.ink;
  const dim = request.theme.palette.inkDim;
  const accent = request.theme.palette.accent;
  const animation = animationFor(request.pet);

  if (animation === 'eat') {
    // Plato con la comida adelante. (Que la comida se vaya "achicando" mordida a
    // mordida necesita saber el progreso del estado; queda para la Fase 2.)
    scene.fillRect(cx + Math.round(size * 0.35), floorY - 1, 4, 1, dim);
    scene.fillRect(cx + Math.round(size * 0.35) + 1, floorY - 2, 2, 1, ink);
  }
  if (animation === 'play') {
    const bounce = Math.abs(Math.sin(request.gameNow / 260)) * (size * 0.55);
    scene.fillEllipse(cx + Math.round(size * 0.5), Math.round(floorY - bounce), 1.5, 1.5, ink);
  }
  if (animation === 'sleep') {
    // Colchoneta + Z que suben y se desvanecen.
    scene.fillRect(cx - Math.round(size * 0.45), floorY, Math.round(size * 0.9), 1, dim);
    for (let i = 0; i < 3; i += 1) {
      const t = ((request.gameNow / 1200) + i / 3) % 1;
      const alpha = 1 - t;
      drawText(scene, Math.round(cx + size * 0.3) + Math.round(t * 4), Math.round(floorY - size * 0.7 - t * 5), 'Z', ink, { alpha });
    }
  }
  if (animation === 'bath') {
    for (let i = 0; i < 5; i += 1) {
      const t = ((request.gameNow / 900) + i / 5) % 1;
      scene.plot(cx - 3 + i * 2, Math.round(floorY - t * (size * 0.8)), accent, 1 - t);
    }
  }
  if (animation === 'heal') {
    const pulse = Math.sin(request.gameNow / 200) > 0;
    if (pulse) {
      drawText(scene, cx + Math.round(size * 0.45), Math.round(floorY - size * 0.7), '+', accent);
    }
  }
  if (animation === 'evolve') {
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2 + request.gameNow / 700;
      scene.plot(cx + Math.cos(angle) * size * 0.55, floorY - size * 0.5 + Math.sin(angle) * size * 0.45, accent, 0.9);
    }
  }
  if (animation === 'dead') {
    // Lápida simple: dos líneas y una cruz.
    scene.fillRect(cx - 3, floorY - 8, 7, 8, dim);
    scene.fillRect(cx, floorY - 7, 1, 4, request.theme.palette.background);
    scene.fillRect(cx - 1, floorY - 6, 3, 1, request.theme.palette.background);
  }
}

function drawHud(scene: PixelCanvas, request: SceneRequest, fieldTop: number, fieldBottom: number): void {
  const { pet, theme } = request;
  const ink = theme.palette.ink;
  const dim = theme.palette.inkDim;
  const stage = getStage(pet.stageId);
  const compact = scene.width < 40;

  // Línea superior: edad (izq) y score (der).
  drawText(scene, 1, 1, formatAgeCompact(pet.updatedAt - pet.hatchedAt), ink, { letterSpacing: 0 });
  const scoreText = formatScore(computeScore(pet));
  const scoreWidth = scoreText.length * 4 - 1;
  drawText(scene, Math.max(1, scene.width - scoreWidth - 1), 1, scoreText, ink, { letterSpacing: 0 });

  if (request.hud === 'full' && !compact) {
    drawText(scene, 1, 7, stage.label.toUpperCase(), dim, { letterSpacing: 0 });
  }

  // Barra de stats: 5 mini-barras al pie (el detalle se ve en el HUD del DOM).
  const keys = ['hunger', 'happiness', 'energy', 'hygiene', 'health'] as const;
  const barWidth = Math.max(3, Math.floor((scene.width - 4) / keys.length));
  const barHeight = 3;
  const totalWidth = keys.length * barWidth + (keys.length - 1);
  const startX = Math.floor((scene.width - totalWidth) / 2);
  const y = fieldBottom + 2;
  keys.forEach((key, index) => {
    const x = startX + index * (barWidth + 1);
    if (y + barHeight > scene.height) return;
    const value = pet.stats[key];
    scene.strokeRect(x, y, barWidth, barHeight, dim, 0.9);
    const inner = Math.max(0, Math.round((barWidth - 2) * (value / 100)));
    if (inner > 0) scene.fillRect(x + 1, y + 1, inner, barHeight - 2, pet.sick && key === 'health' ? dim : ink);
  });
  void fieldTop;
}

/** Dibuja un frame completo. Es la única función que necesita llamar el presentador. */
export function composeScene(scene: PixelCanvas, request: SceneRequest): void {
  const { pet, theme, spriteProvider } = request;
  const hudMode = request.hud ?? 'minimal';
  const hudHeight = hudMode === 'off' ? 0 : 6;
  const barsHeight = hudMode === 'off' ? 0 : 6;
  const fieldTop = hudHeight;
  const fieldBottom = Math.max(fieldTop + 4, scene.height - barsHeight - 1);

  drawBackground(scene, request, fieldTop, fieldBottom);

  const size = Math.max(6, Math.min(Math.floor(scene.width * 0.45), fieldBottom - fieldTop));
  const cx = Math.floor(scene.width / 2);
  const box = {
    x: Math.floor((scene.width - size) / 2),
    y: fieldBottom - size,
    size,
  };

  drawDecor(scene, request, { cx, floorY: fieldBottom - 1, fieldTop, fieldBottom, size });

  spriteProvider.draw(scene, {
    pet,
    gameNow: request.gameNow,
    frame: request.frame,
    box,
    palette: spritePalette(theme, pet),
    species: getSpecies(pet.speciesId),
    stageOrder: getStage(pet.stageId).order,
    animation: animationFor(pet),
    isDirty: pet.stats.hygiene < 40,
    isCritical: pet.criticalSince !== null,
  });

  if (hudMode !== 'off') drawHud(scene, request, fieldTop, fieldBottom);

  // Aviso crítico parpadeante: información, no decoración.
  if (pet.alive && pet.criticalSince !== null && Math.sin(request.gameNow / 320) > 0) {
    drawText(scene, scene.width - 5, fieldTop + 1, '!', theme.palette.ink, { letterSpacing: 0 });
  }
}

/** Utilidad para tests/telemetría: cuántos píxeles no son del color de fondo. */
export function countVisiblePixels(scene: PixelCanvas, background: RGB): number {
  let count = 0;
  for (let i = 0; i < scene.data.length; i += 4) {
    const alpha = scene.data[i + 3] ?? 0;
    if (alpha === 0) continue;
    if ((scene.data[i] ?? 0) !== background.r || (scene.data[i + 1] ?? 0) !== background.g || (scene.data[i + 2] ?? 0) !== background.b) {
      count += 1;
    }
  }
  return count;
}
