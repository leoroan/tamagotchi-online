import { describe, expect, it } from 'vitest';
import { SCREEN_THEMES, getScreenTheme } from '@/skins/screen';
import { PixelCanvas } from '../renderer/pixelCanvas';
import { composeScene, countVisiblePixels } from '../renderer/scene';
import { PLACEHOLDER_SPRITES } from '../renderer/sprites/placeholderSprites';
import { drawText } from '../renderer/text';
import { DEFAULT_SCREEN_THEME_ID } from '@/skins/screen';
import { makeGrownPet, makePet } from './helpers';

const theme = getScreenTheme(DEFAULT_SCREEN_THEME_ID);

function renderToCanvas(pet = makeGrownPet(), overrides: { nightMode?: boolean } = {}) {
  const scene = new PixelCanvas(theme.width, theme.height);
  composeScene(scene, {
    pet,
    gameNow: pet.updatedAt + 60_000,
    frame: 1,
    theme,
    spriteProvider: PLACEHOLDER_SPRITES,
    nightMode: overrides.nightMode,
  });
  return scene;
}

describe('PixelCanvas', () => {
  it('recorta lo que queda fuera del buffer', () => {
    const canvas = new PixelCanvas(8, 8);
    canvas.plot(-1, 3, { r: 255, g: 0, b: 0 });
    canvas.plot(3, 99, { r: 255, g: 0, b: 0 });
    expect(countVisiblePixels(canvas, { r: 0, g: 0, b: 0 })).toBe(0);
  });

  it('pinta y lee píxeles con alpha', () => {
    const canvas = new PixelCanvas(4, 4);
    canvas.plot(1, 1, { r: 10, g: 20, b: 30 }, 0.5);
    const color = canvas.readAt(1, 1);
    expect(color).not.toBeNull();
    expect(color?.g).toBeGreaterThan(0);
    expect(canvas.readAt(3, 3)).toBeNull();
  });

  it('dibuja texto de la fuente 3x5', () => {
    const canvas = new PixelCanvas(32, 8);
    drawText(canvas, 0, 0, '12:30', { r: 0, g: 0, b: 0 });
    expect(countVisiblePixels(canvas, { r: 255, g: 255, b: 255 })).toBeGreaterThan(20);
  });
});

describe('composeScene', () => {
  it('dibuja la mascota (hay píxeles que no son fondo)', () => {
    const scene = renderToCanvas();
    expect(countVisiblePixels(scene, theme.palette.background)).toBeGreaterThan(20);
  });

  it('funciona en los 4 temas, mono y color, de día y de noche', () => {
    for (const screenTheme of SCREEN_THEMES) {
      for (const nightMode of [false, true]) {
        const scene = new PixelCanvas(screenTheme.width, screenTheme.height);
        composeScene(scene, {
          pet: makeGrownPet(),
          gameNow: 1_700_000_500_000,
          frame: 3,
          theme: screenTheme,
          spriteProvider: PLACEHOLDER_SPRITES,
          nightMode,
          hud: 'full',
        });
        expect(countVisiblePixels(scene, screenTheme.palette.background)).toBeGreaterThan(10);
      }
    }
  });

  it('dibuja el huevo sin explotar', () => {
    const egg = makePet({ stageId: 'egg', reachedStageIds: ['egg'] });
    expect(countVisiblePixels(renderToCanvas(egg), theme.palette.background)).toBeGreaterThan(10);
  });

  it('dibuja el estado muerto (lápida) sin explotar', () => {
    const dead = makeGrownPet({ alive: false, status: 'dead', diedAt: 1_700_000_000_000 });
    expect(countVisiblePixels(renderToCanvas(dead), theme.palette.background)).toBeGreaterThan(10);
  });

  it('es determinista para el mismo instante de juego', () => {
    const a = renderToCanvas();
    const b = renderToCanvas();
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
  });
});
