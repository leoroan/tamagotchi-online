import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import App from '@/App';
import { HOUR_MS } from '@/game/lifecycle';
import { usePetStore } from '@/store/usePetStore';

/**
 * SMOKE TEST del primer render.
 *
 * Ojo con el alcance: `renderToString` NO puede validar la UI "con mascota".
 * Zustand usa `useSyncExternalStore` y en SSR React pide el *server snapshot*
 * (el estado inicial), así que siempre se ve el onboarding. Para testear la UI
 * interactiva hace falta jsdom + Testing Library (ver docs/03-roadmap.md, Fase 2).
 * Acá verificamos que el árbol renderiza sin explotar (imports, hooks, estilos).
 */
describe('App (smoke)', () => {
  it('renderiza el onboarding cuando no hay partida guardada', () => {
    usePetStore.setState({ pets: {}, activePetId: null });
    const html = renderToString(<App />);
    expect(html).toContain('Elegí tu huevo');
    expect(html).toContain('Carcasa');
    expect(html).toContain('shell-button');
  });
});

/**
 * TEST DE INTEGRACIÓN DEL ADAPTADOR (store).
 * Es el pegamento entre el core puro y el navegador: monedas, persistencia,
 * catch-up y desbloqueo de skins. Si esto se rompe, el juego no se puede jugar
 * aunque el core esté perfecto.
 */
describe('store (integración)', () => {
  it('crea un huevo, lo alimenta y avanza el tiempo de juego', () => {
    usePetStore.getState().resetAll();
    const id = usePetStore.getState().createEgg({ name: 'Pompón', speciesId: 'gelatina' });
    expect(usePetStore.getState().activePetId).toBe(id);

    usePetStore.getState().grantCoins(100);
    const before = usePetStore.getState().pets[id];
    expect(before).toBeDefined();

    // El huevo todavía no come comida de cría: primero tiene que eclosionar.
    expect(usePetStore.getState().act({ type: 'feed', foodId: 'pan' }).ok).toBe(false);
    usePetStore.getState().advanceBy(15 * 60 * 1000);
    expect(usePetStore.getState().pets[id]?.stageId).toBe('baby');

    const walletBefore = usePetStore.getState().wallet;
    const fed = usePetStore.getState().act({ type: 'feed', foodId: 'pan' });
    expect(fed.ok).toBe(true);
    const afterFeed = usePetStore.getState().pets[id];
    expect(afterFeed?.stats.hunger).toBeGreaterThan(before?.stats.hunger ?? 0);
    expect(usePetStore.getState().wallet).toBe(walletBefore - 6);

    // 6 h de juego más: decae y ya es 'child' (2 h de vida, curva en lifecycle.ts)
    usePetStore.getState().advanceBy(6 * HOUR_MS);
    const later = usePetStore.getState().pets[id];
    expect(later?.stageId).toBe('child');
    expect(later?.stats.hunger).toBeLessThan(afterFeed?.stats.hunger ?? 100);
  });

  it('rechaza acciones inválidas sin romper el estado', () => {
    // El elixir es de adulto: el CORE tiene que rechazarlo aunque la UI lo ofrezca.
    const result = usePetStore.getState().act({ type: 'feed', foodId: 'elixir' });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('mas adelante');
  });

  it('desbloquea skins con monedas y avisa cuando no alcanza', () => {
    usePetStore.setState({ wallet: 0, unlockedScreenThemeIds: ['lcd-classic'] });
    const poor = usePetStore.getState().setScreenTheme('crt-amber');
    expect(poor.ok).toBe(false);

    usePetStore.getState().grantCoins(500);
    const rich = usePetStore.getState().setScreenTheme('crt-amber');
    expect(rich.ok).toBe(true);
    expect(usePetStore.getState().preferences.screenThemeId).toBe('crt-amber');
    expect(usePetStore.getState().unlockedScreenThemeIds).toContain('crt-amber');
  });

  it('catchUp simula el tiempo real que pasó desde la última visita', () => {
    const id = usePetStore.getState().activePetId;
    if (!id) throw new Error('falta mascota activa');
    const before = usePetStore.getState().pets[id];
    usePetStore.setState({ lastSeenAt: Date.now() - 4 * HOUR_MS });
    usePetStore.getState().catchUp();
    const after = usePetStore.getState().pets[id];
    expect((after?.updatedAt ?? 0) - (before?.updatedAt ?? 0)).toBeGreaterThan(3 * HOUR_MS);
  });

  it('sepultar guarda el memorial y libera el slot', () => {
    const id = usePetStore.getState().activePetId;
    if (!id) throw new Error('falta mascota activa');
    const pet = usePetStore.getState().pets[id];
    if (!pet) throw new Error('falta la mascota');
    usePetStore.setState({
      pets: { [id]: { ...pet, alive: false, status: 'dead', diedAt: pet.updatedAt, causeOfDeath: 'test' } },
    });
    usePetStore.getState().buryPet();
    const state = usePetStore.getState();
    expect(state.pets[id]).toBeUndefined();
    expect(state.activePetId).toBeNull();
    expect(state.memorials[0]?.causeOfDeath).toBe('test');
  });
});
