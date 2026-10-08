import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../config';
import { applyAction, createEggState, getCareRatio, getMood } from '../pet';
import { T0, makeGrownPet } from './helpers';

describe('pet.applyAction', () => {
  it('alimentar sube el hambre y cobra monedas', () => {
    const pet = makeGrownPet({ stats: { hunger: 40 } });
    const result = applyAction(pet, { type: 'feed', foodId: 'pan' }, { now: pet.updatedAt, coins: 100 });
    expect(result.ok).toBe(true);
    expect(result.state.stats.hunger).toBeGreaterThan(40);
    expect(result.coinDelta).toBe(-6);
    expect(result.state.counters.meals).toBe(1);
    expect(result.state.status).toBe('eating');
  });

  it('rechaza alimentar si no hay monedas', () => {
    const pet = makeGrownPet();
    const result = applyAction(pet, { type: 'feed', foodId: 'sushi' }, { now: pet.updatedAt, coins: 1 });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Sin monedas');
    expect(result.state).toBe(pet);
  });

  it('no se puede alimentar mientras duerme (la clásica trampa del tamagotchi casero)', () => {
    const pet = makeGrownPet({ status: 'sleeping' });
    const result = applyAction(pet, { type: 'feed', foodId: 'semillas' }, { now: pet.updatedAt });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('durmiendo');
  });

  it('la comida favorita de la especie da más felicidad', () => {
    const base = makeGrownPet({ stats: { hunger: 40, happiness: 40 } });
    const favourite = applyAction(base, { type: 'feed', foodId: 'frutilla' }, { now: base.updatedAt, coins: 100 });
    const neutral = applyAction(base, { type: 'feed', foodId: 'alga' }, { now: base.updatedAt, coins: 100 });
    expect(favourite.state.stats.happiness).toBeGreaterThan(neutral.state.stats.happiness);
  });

  it('sobrealimentar castiga: es un límite de diseño, no un bug', () => {
    const pet = makeGrownPet({ stats: { hunger: 99, health: 90 } });
    const result = applyAction(pet, { type: 'feed', foodId: 'carne' }, { now: pet.updatedAt, coins: 100 });
    expect(result.state.counters.overfeeds).toBe(1);
    expect(result.state.stats.health).toBeLessThan(90);
    expect(result.state.counters.careMistakes).toBe(1);
  });

  it('la comida chatarra carga junkLoad (riesgo de enfermarse)', () => {
    const pet = makeGrownPet();
    const result = applyAction(pet, { type: 'feed', foodId: 'pastel' }, { now: pet.updatedAt, coins: 100 });
    expect(result.state.traits.junkLoad).toBeGreaterThan(0);
    expect(result.state.counters.junkMeals).toBe(1);
  });

  it('la medicina cura, limpia la carga tóxica y saca el estado crítico', () => {
    const pet = makeGrownPet({
      sick: true,
      criticalSince: T0 - 1000,
      stats: { health: 10 },
      traits: { careScore: 50, bond: 50, junkLoad: 80, goodCareMs: 0, neglectMs: 0 },
    });
    const result = applyAction(pet, { type: 'medicine' }, { now: pet.updatedAt, coins: 100 });
    expect(result.ok).toBe(true);
    expect(result.state.stats.health).toBeGreaterThan(10);
    expect(result.state.sick).toBe(false);
    expect(result.state.criticalSince).toBeNull();
    expect(result.state.traits.junkLoad).toBeLessThan(80);
  });

  it('jugar gasta energía y da monedas; sin energía se rechaza', () => {
    const pet = makeGrownPet({ stats: { energy: 80, happiness: 50 } });
    const played = applyAction(pet, { type: 'play' }, { now: pet.updatedAt });
    expect(played.ok).toBe(true);
    expect(played.coinDelta).toBe(DEFAULT_CONFIG.economy.playCoinReward);
    expect(played.state.stats.energy).toBeLessThan(80);

    const tired = makeGrownPet({ stats: { energy: 2 } });
    const rejected = applyAction(tired, { type: 'play' }, { now: tired.updatedAt });
    expect(rejected.ok).toBe(false);
  });

  it('dormir y despertar cambia el estado correctamente', () => {
    const pet = makeGrownPet();
    const asleep = applyAction(pet, { type: 'sleep' }, { now: pet.updatedAt });
    expect(asleep.state.status).toBe('sleeping');
    expect(asleep.state.statusUntil).toBe(pet.updatedAt + DEFAULT_CONFIG.sleep.autoWakeAfterMs);
    const awake = applyAction(asleep.state, { type: 'wake' }, { now: pet.updatedAt + 1000 });
    expect(awake.state.status).toBe('idle');
    expect(awake.state.statusUntil).toBeNull();
  });

  it('una mascota muerta no acepta acciones', () => {
    const pet = makeGrownPet({ alive: false, status: 'dead', diedAt: T0 });
    const result = applyAction(pet, { type: 'feed', foodId: 'semillas' }, { now: pet.updatedAt });
    expect(result.ok).toBe(false);
  });

  it('el huevo nace con valores coherentes', () => {
    const egg = createEggState({ now: T0 });
    expect(egg.alive).toBe(true);
    expect(egg.stageId).toBe('egg');
    expect(egg.reachedStageIds).toEqual(['egg']);
    expect(getCareRatio(egg)).toBeGreaterThan(0);
    expect(['feliz', 'tranqui', 'triste', 'hambrienta', 'agotada', 'sucia', 'enferma', 'muerta']).toContain(getMood(egg));
  });
});
