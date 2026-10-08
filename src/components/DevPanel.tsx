import { HOUR_MS } from '@/game/lifecycle';
import { describeSync } from '@/lib/sync';
import { useActivePet } from '@/store/selectors';
import { usePetStore } from '@/store/usePetStore';

const SPEEDS = [1, 10, 60, 600];

/**
 * PANEL DE DESARROLLO (temporal, se puede ocultar con un flag).
 * Sin esto, probar una mascota que vive 7 días es imposible: acá acelerás el
 * tiempo x60 o avanzás "1 día" de un clic. También sirve para balancear:
 * mirá cómo se comportan las stats al acelerar y ajustá `src/game/config.ts`.
 */
export function DevPanel() {
  const pet = useActivePet();
  const preferences = usePetStore((state) => state.preferences);
  const setTimeScale = usePetStore((state) => state.setTimeScale);
  const setHud = usePetStore((state) => state.setHud);
  const grantCoins = usePetStore((state) => state.grantCoins);
  const advanceBy = usePetStore((state) => state.advanceBy);
  const resetAll = usePetStore((state) => state.resetAll);

  return (
    <section className="panel panel--dev">
      <header className="panel__header">
        <h2>Dev / tiempo</h2>
        <span className="badge">{preferences.timeScale}x</span>
      </header>

      <div className="row">
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            className={`btn btn--small ${preferences.timeScale === speed ? 'btn--active' : ''}`}
            onClick={() => setTimeScale(speed)}
          >
            {speed}x
          </button>
        ))}
      </div>

      <div className="row">
        <button type="button" className="btn btn--small" onClick={() => advanceBy(HOUR_MS)}>
          +1 h de juego
        </button>
        <button type="button" className="btn btn--small" onClick={() => advanceBy(24 * HOUR_MS)}>
          +1 día
        </button>
        <button type="button" className="btn btn--small" onClick={() => advanceBy(7 * 24 * HOUR_MS)}>
          +1 semana
        </button>
      </div>

      <div className="row">
        <button type="button" className="btn btn--small" onClick={() => grantCoins(100)}>
          +100 🪙
        </button>
        <button type="button" className="btn btn--small" onClick={() => setHud(preferences.hud === 'off' ? 'minimal' : preferences.hud === 'minimal' ? 'full' : 'off')}>
          HUD LCD: {preferences.hud}
        </button>
      </div>

      <details>
        <summary>Estado crudo (JSON)</summary>
        <pre className="json">{JSON.stringify(pet, null, 2)}</pre>
      </details>

      <p className="muted">Persistencia: {describeSync()}</p>
      <button
        type="button"
        className="btn btn--small btn--alert"
        onClick={() => {
          if (confirm('¿Borrar todo el progreso guardado? No se puede deshacer.')) resetAll();
        }}
      >
        Reset total
      </button>
    </section>
  );
}
