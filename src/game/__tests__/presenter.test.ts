import { beforeAll, describe, expect, it } from 'vitest';
import { CanvasPresenter } from '../renderer/canvasPresenter';
import { PLACEHOLDER_SPRITES } from '../renderer/sprites/placeholderSprites';
import { getScreenTheme } from '@/skins/screen';
import { makeGrownPet } from './helpers';

/**
 * El presentador es la ÚNICA pieza que toca el DOM, así que no se puede testear
 * con el core puro. Acá le damos un canvas falso: valida la lógica que más se
 * rompe en silencio (escala entera, offsets, ghosting, cambio de tema) sin
 * necesitar jsdom ni un browser.
 */
class FakeContext {
  calls: string[] = [];
  imageSmoothingEnabled = true;
  fillStyle = '';
  shadowColor = '';
  shadowBlur = 0;
  globalAlpha = 1;

  clearRect(): void {
    this.calls.push('clearRect');
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push(`fillRect:${x},${y},${w},${h}`);
  }

  drawImage(_image: unknown, x: number, y: number, w: number, h: number): void {
    this.calls.push(`drawImage:${x},${y},${w},${h}`);
  }

  putImageData(): void {
    this.calls.push('putImageData');
  }

  save(): void {}
  restore(): void {}
}

class FakeCanvas {
  width = 0;
  height = 0;
  clientWidth: number;
  clientHeight: number;
  readonly ctx = new FakeContext();

  constructor(clientWidth = 320, clientHeight = 240) {
    this.clientWidth = clientWidth;
    this.clientHeight = clientHeight;
  }

  getContext(): FakeContext {
    return this.ctx;
  }
}

/** Canvas que devuelve `document.createElement('canvas')` (el interno del presentador). */
const createdCanvases: FakeCanvas[] = [];

beforeAll(() => {
  class FakeImageData {
    constructor(
      readonly data: Uint8ClampedArray,
      readonly width: number,
      readonly height: number,
    ) {}
  }
  Object.defineProperty(globalThis, 'ImageData', { value: FakeImageData, writable: true, configurable: true });
  Object.defineProperty(globalThis, 'document', {
    value: {
      createElement: () => {
        const canvas = new FakeCanvas(32, 24);
        createdCanvases.push(canvas);
        return canvas;
      },
    },
    writable: true,
    configurable: true,
  });
});

function makePresenter(clientWidth: number, clientHeight: number, themeId = 'lcd-classic') {
  const canvas = new FakeCanvas(clientWidth, clientHeight);
  const presenter = new CanvasPresenter({
    canvas: canvas as unknown as HTMLCanvasElement,
    theme: getScreenTheme(themeId),
    spriteProvider: PLACEHOLDER_SPRITES,
  });
  return { canvas, presenter };
}

describe('CanvasPresenter', () => {
  it('escala con factor ENTERO y centra la imagen', () => {
    const { canvas, presenter } = makePresenter(320, 240); // 32x24 x10 exacto
    expect(presenter.scale()).toBe(10);
    presenter.render({ pet: makeGrownPet(), gameNow: 1_700_000_000_000 });
    expect(canvas.ctx.calls).toContain('drawImage:0,0,320,240');
  });

  it('con tamaño no exacto usa el mayor factor entero posible y deja margen', () => {
    const { canvas, presenter } = makePresenter(300, 200); // 300/32=9.3 y 200/24=8.3
    expect(presenter.scale()).toBe(8);
    presenter.render({ pet: makeGrownPet(), gameNow: 1_700_000_000_000 });
    // 32*8=256 y 24*8=192, centrado en 300x200 => offsets 22 y 4
    expect(canvas.ctx.calls).toContain('drawImage:22,4,256,192');
  });

  it('nunca baja de 1 (pantallas chicas)', () => {
    const { presenter } = makePresenter(20, 15);
    expect(presenter.scale()).toBe(1);
  });

  it('dibuja el frame en el canvas interno antes de escalarlo', () => {
    const { canvas, presenter } = makePresenter(320, 240);
    presenter.render({ pet: makeGrownPet(), gameNow: 1_700_000_000_000 });
    // El buffer se vuelca en el canvas INTERNO (offscreen) y de ahí se escala.
    // Ojo: el presentador también crea un canvas "fantasma" para la estela, así que
    // buscamos el que recibió el volcado del buffer.
    const internal = createdCanvases.find((fake) => fake.ctx.calls.includes('putImageData'));
    expect(internal?.width).toBe(32);
    expect(internal?.height).toBe(24);
    expect(internal?.ctx.imageSmoothingEnabled).toBe(false);
    expect(canvas.ctx.calls).toContain('clearRect');
  });

  it('en el segundo frame agrega la estela (ghosting) del LCD clásico', () => {
    const { canvas, presenter } = makePresenter(320, 240);
    const pet = makeGrownPet();
    presenter.render({ pet, gameNow: 1_700_000_000_000 });
    const afterFirst = canvas.ctx.calls.filter((call) => call.startsWith('drawImage')).length;
    presenter.render({ pet, gameNow: 1_700_000_001_000 });
    const afterSecond = canvas.ctx.calls.filter((call) => call.startsWith('drawImage')).length;
    expect(afterFirst).toBe(1);
    expect(afterSecond).toBeGreaterThan(afterFirst); // la estela suma un drawImage
  });

  it('cambiar de tema reajusta el canvas interno y la escala', () => {
    const { canvas, presenter } = makePresenter(480, 360);
    expect(presenter.scale()).toBe(15); // 32x24 x15
    presenter.setTheme(getScreenTheme('gameboy-green')); // 48x32
    expect(presenter.scale()).toBe(10); // 480/48 = 10
    presenter.render({ pet: makeGrownPet(), gameNow: 1_700_000_000_000, hud: 'full' });
    // 48x32 x10 = 480x320, centrado verticalmente en 360 => offset y = 20
    expect(canvas.ctx.calls).toContain('drawImage:0,20,480,320');
  });

  it('respeta el tamaño del canvas real al redimensionar', () => {
    const { canvas, presenter } = makePresenter(320, 240);
    canvas.clientWidth = 640;
    canvas.clientHeight = 480;
    presenter.resize();
    expect(canvas.width).toBe(640);
    expect(presenter.scale()).toBe(20);
  });
});
