import { describe, expect, it } from 'vitest';
import { HOUR_MS } from '../lifecycle';
import { computeBreakdown, formatScore } from '../scoring';
import { T0, makeGrownPet } from './helpers';

describe('scoring', () => {
  it('el score crece con el tiempo vivido', () => {
    const base = makeGrownPet();
    const later = { ...base, updatedAt: base.updatedAt + 6 * HOUR_MS };
    expect(computeBreakdown(later).score).toBeGreaterThan(computeBreakdown(base).score);
  });

  it('el estadio multiplica (vivir de adulto vale 40x)', () => {
    const child = makeGrownPet({ stageId: 'child', reachedStageIds: ['egg', 'baby', 'child'] });
    const adult = { ...child, stageId: 'adult', reachedStageIds: ['egg', 'baby', 'child', 'adult'] };
    expect(computeBreakdown(adult).stageMultiplier).toBeGreaterThan(computeBreakdown(child).stageMultiplier);
    expect(computeBreakdown(adult).score).toBeGreaterThan(computeBreakdown(child).score * 5);
  });

  it('las mutaciones multiplican y se reflejan en el detalle', () => {
    const plain = makeGrownPet();
    const mutated = { ...plain, mutations: ['brillo', 'cristal'] };
    const breakdown = computeBreakdown(mutated);
    expect(breakdown.mutationMultiplier).toBeGreaterThan(1.5);
    expect(breakdown.mutations).toEqual(['brillo', 'cristal']);
    expect(breakdown.score).toBeGreaterThan(computeBreakdown(plain).score);
  });

  it('el cuidado pesa: mejor cuidado = más score por el mismo tiempo', () => {
    const good = makeGrownPet({
      traits: { careScore: 95, bond: 90, junkLoad: 0, goodCareMs: 10 * HOUR_MS, neglectMs: 0 },
    });
    const bad = { ...good, traits: { ...good.traits, goodCareMs: 0, neglectMs: 10 * HOUR_MS } };
    expect(computeBreakdown(good).score).toBeGreaterThan(computeBreakdown(bad).score);
  });

  it('una mascota recién nacida vale 0 (no se puede farmear score sin vivir)', () => {
    const newborn = makeGrownPet({ hatchedAt: T0, updatedAt: T0 });
    expect(computeBreakdown(newborn).score).toBe(0);
  });

  it('formatea números grandes para el HUD', () => {
    expect(formatScore(999)).toBe('999');
    expect(formatScore(1500)).toBe('1.5k');
    expect(formatScore(2_500_000)).toBe('2.50M');
  });
});
