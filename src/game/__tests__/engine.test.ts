import { describe, expect, it } from 'vitest';
import { createGameLoop } from '../engine';

const silentScheduler = { request: () => 0, cancel: () => {} };

describe('engine.createGameLoop', () => {
  it('usa pasos lógicos fijos (accumulator), no el delta crudo', () => {
    const ticks: number[] = [];
    const loop = createGameLoop({ tickMs: 250, onTick: (step) => ticks.push(step), scheduler: silentScheduler });
    loop.pump(1000);
    expect(ticks).toEqual([250, 250, 250, 250]);
    loop.pump(100); // no alcanza para un paso
    expect(ticks.length).toBe(4);
    loop.pump(150);
    expect(ticks.length).toBe(5);
  });

  it('recorta frames gigantes (pestaña en background) para no simular de golpe', () => {
    const ticks: number[] = [];
    const loop = createGameLoop({ tickMs: 250, onTick: (step) => ticks.push(step), maxFrameMs: 1000, scheduler: silentScheduler });
    loop.pump(60_000); // "volviste después de 1 minuto sin frames"
    expect(ticks.length).toBe(4); // solo 1000 ms; el resto lo resuelve el catch-up offline
  });

  it('informa alpha de interpolación para el render', () => {
    const alphas: number[] = [];
    const loop = createGameLoop({
      tickMs: 100,
      onTick: () => {},
      onFrame: (info) => alphas.push(info.alpha),
      scheduler: silentScheduler,
    });
    loop.pump(50);
    expect(alphas[0]).toBeCloseTo(0.5, 5);
  });

  it('start/stop no rompen con el scheduler inyectado', () => {
    const loop = createGameLoop({ tickMs: 250, onTick: () => {}, scheduler: silentScheduler });
    expect(loop.isRunning()).toBe(false);
    loop.start();
    expect(loop.isRunning()).toBe(true);
    loop.stop();
    expect(loop.isRunning()).toBe(false);
  });
});
