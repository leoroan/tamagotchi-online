import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../config';
import { DAY_MS, HOUR_MS, getStageIndex } from '../lifecycle';
import { advance, tick } from '../simulation';
import { computeScore } from '../scoring';
import { T0, makeGrownPet, makePet, simulateWithCare } from './helpers';

describe('simulation.advance', () => {
  it('hace decaer el hambre con el tiempo (delta time, no timers)', () => {
    const pet = makeGrownPet();
    const { state } = advance(pet, HOUR_MS);
    expect(state.stats.hunger).toBeLessThan(pet.stats.hunger);
    // 1 hora de decaimiento: ~0.083/min * 60 = ~5 puntos
    const delta = pet.stats.hunger - state.stats.hunger;
    expect(delta).toBeGreaterThan(4);
    expect(delta).toBeLessThan(6);
  });

  it('el reloj de juego avanza con el tiempo transcurrido', () => {
    const pet = makeGrownPet();
    const { state } = advance(pet, HOUR_MS);
    expect(state.updatedAt).toBe(T0 + HOUR_MS);
  });

  it('respeta el tope de catch-up offline (no te mata por 3 días ausente)', () => {
    const pet = makeGrownPet();
    const { state } = advance(pet, 3 * DAY_MS);
    // Nunca simula más que el tope, y muere antes si el abandono la mata.
    expect(state.updatedAt - pet.updatedAt).toBeLessThanOrEqual(DEFAULT_CONFIG.maxOfflineCatchUpMs);
  });

  it('abandono total = muerte en ~24 h (el juego tiene stakes)', () => {
    const pet = makeGrownPet();
    const { state, events } = advance(pet, 30 * HOUR_MS, { maxCatchUpMs: 48 * HOUR_MS });
    expect(state.alive).toBe(false);
    expect(state.causeOfDeath).toBeTruthy();
    expect(events.some((event) => event.type === 'died')).toBe(true);
    expect(events.some((event) => event.type === 'critical')).toBe(true);
  });

  it('mientras duerme gana energía y el hambre baja más lento', () => {
    const pet = makeGrownPet({ status: 'sleeping', stats: { energy: 20, hunger: 50 } });
    const { state } = advance(pet, HOUR_MS);
    expect(state.stats.energy).toBeGreaterThan(20);
    const awake = makeGrownPet({ stats: { energy: 20, hunger: 50 } });
    const { state: awakeState } = advance(awake, HOUR_MS);
    expect(50 - state.stats.hunger).toBeLessThan(50 - awakeState.stats.hunger);
  });

  it('eclosiona el huevo pasado el tiempo de cría', () => {
    const egg = makePet({ stageId: 'egg', reachedStageIds: ['egg'] });
    const { state } = advance(egg, 11 * 60 * 1000);
    expect(state.stageId).toBe('baby');
    expect(state.reachedStageIds).toContain('baby');
  });

  it('una mascota bien cuidada llega a adulta (test de largo plazo)', () => {
    const pet = makeGrownPet({ stageId: 'teen', reachedStageIds: ['egg', 'baby', 'child', 'teen'] });
    const { state, coins, events } = simulateWithCare(pet, 3 * DAY_MS, 2 * HOUR_MS, {
      maxCatchUpMs: 3 * DAY_MS,
    });
    expect(state.alive).toBe(true);
    expect(getStageIndex(state.stageId)).toBeGreaterThanOrEqual(4); // adult o más
    expect(state.counters.meals).toBeGreaterThan(8);
    expect(coins).toBeGreaterThan(0);
    expect(events.some((event) => event.type === 'evolved')).toBe(true);
  });

  it('NO evoluciona si el cuidado no alcanza el umbral (gate de cuidado)', () => {
    const pet = makeGrownPet({
      stageId: 'baby',
      reachedStageIds: ['egg', 'baby'],
      traits: { careScore: 5, bond: 0, junkLoad: 0, goodCareMs: 0, neglectMs: 5 * HOUR_MS },
      stats: { hunger: 20, happiness: 20, hygiene: 20, health: 60, energy: 60 },
    });
    const { state } = advance(pet, 6 * HOUR_MS);
    expect(state.stageId).toBe('baby');
    expect(state.counters.careMistakes).toBeGreaterThan(0);
  });

  it('muere si se la deja en salud cero más allá de la gracia', () => {
    const pet = makeGrownPet({ stats: { hunger: 0, hygiene: 0, health: 0, happiness: 0 } });
    const { state, events } = advance(pet, 3 * HOUR_MS);
    expect(state.alive).toBe(false);
    expect(state.status).toBe('dead');
    expect(state.diedAt).not.toBeNull();
    expect(events.some((event) => event.type === 'died')).toBe(true);
  });

  it('el score se congela al morir (el tiempo de juego se detiene)', () => {
    const pet = makeGrownPet({ stats: { hunger: 0, hygiene: 0, health: 0, happiness: 0 } });
    const { state } = advance(pet, 3 * HOUR_MS);
    expect(state.alive).toBe(false);
    const deadScore = computeScore(state);
    const { state: later } = advance(state, 5 * HOUR_MS);
    expect(computeScore(later)).toBe(deadScore);
    expect(later.updatedAt).toBe(state.updatedAt);
  });

  it('es determinista: misma semilla + mismo tiempo = mismo estado', () => {
    const a = advance(makeGrownPet(), 4 * HOUR_MS).state;
    const b = advance(makeGrownPet(), 4 * HOUR_MS).state;
    expect(a).toEqual(b);
  });

  it('el catch-up por pasos gruesos no cambia el resultado de forma grosera', () => {
    const pet = makeGrownPet();
    const oneShot = advance(pet, 3 * HOUR_MS).state;
    // Simular en dos mitades (como si el jugador hubiera vuelto a mitad de camino)
    const half = advance(pet, 1.5 * HOUR_MS).state;
    const twoShots = advance(half, 1.5 * HOUR_MS).state;
    expect(Math.abs(oneShot.stats.hunger - twoShots.stats.hunger)).toBeLessThan(1.5);
  });

  it('tick() con dt <= 0 no hace nada (guardia contra loops infinitos)', () => {
    const pet = makeGrownPet();
    expect(tick(pet, 0).state).toBe(pet);
  });
});
