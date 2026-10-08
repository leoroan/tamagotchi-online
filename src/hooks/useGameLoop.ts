import { useEffect, useRef, type RefObject } from 'react';
import { DEFAULT_CONFIG } from '@/game/config';
import { createGameLoop } from '@/game/engine';
import { CanvasPresenter, type PresenterFrame } from '@/game/renderer';
import { ACTIVE_SPRITES } from '@/game/renderer/sprites';
import { isNightTime, now as clockNow } from '@/lib/clock';
import { getScreenTheme } from '@/skins/screen';
import { usePetStore } from '@/store/usePetStore';

/**
 * Une el CORE con React. Es el único lugar donde se decide CUÁNDO se simula y
 * CUÁNDO se dibuja:
 *  - simulación: pasos fijos de `tickMs` (por el engine) -> store.advanceBy()
 *  - dibujo: cada frame (rAF), leyendo el estado con `getState()` para NO
 *    re-renderizar React 60 veces por segundo.
 *
 * Detalle importante: `gameNow` para animar = updatedAt + alpha * tickMs * speed.
 * Así la animación queda continua aunque el estado se actualice 4 veces/segundo.
 */
export function useGameLoop(canvasRef: RefObject<HTMLCanvasElement | null>): void {
  const presenterRef = useRef<CanvasPresenter | null>(null);
  const themeId = usePetStore((state) => state.preferences.screenThemeId);

  // 1) Presentador (canvas + tema). Se recrea solo cuando cambia el tema.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const presenter = new CanvasPresenter({ canvas, theme: getScreenTheme(themeId), spriteProvider: ACTIVE_SPRITES });
    presenterRef.current = presenter;

    const onResize = () => presenter.resize();
    window.addEventListener('resize', onResize);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(canvas);
    return () => {
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      presenterRef.current = null;
    };
  }, [canvasRef, themeId]);

  // 2) Loop: simular + dibujar.
  useEffect(() => {
    const loop = createGameLoop({
      tickMs: DEFAULT_CONFIG.tickMs,
      onTick: (stepMs) => usePetStore.getState().advanceBy(stepMs),
      onFrame: ({ alpha }) => {
        const presenter = presenterRef.current;
        if (!presenter) return;
        const state = usePetStore.getState();
        const pet = state.activePetId ? state.pets[state.activePetId] : null;
        if (!pet) return;
        const frame: PresenterFrame = {
          pet,
          gameNow: pet.updatedAt + alpha * DEFAULT_CONFIG.tickMs * state.preferences.timeScale,
          nightMode: isNightTime(),
          hud: state.preferences.hud,
        };
        presenter.render(frame);
      },
    });
    loop.start();
    return () => loop.stop();
  }, []);

  // 3) Ciclo de vida de la pestaña: al volver, recuperar el tiempo perdido.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') usePetStore.getState().catchUp();
    };
    const onHide = () => {
      // Guardamos el instante exacto: el catch-up se mide desde acá.
      usePetStore.setState({ lastSeenAt: clockNow() });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onHide);
    onVisible();
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);
}
