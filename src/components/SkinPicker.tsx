import { useState } from 'react';
import { SCREEN_THEMES } from '@/skins/screen';
import { SHELL_SKINS } from '@/skins/shell';
import { useWallet } from '@/store/selectors';
import { usePetStore } from '@/store/usePetStore';

/**
 * SKINS: dos ejes independientes (pantalla y carcasa) que se combinan libres.
 * Los temas con costo son un sumidero de monedas sano: NO dan ventaja, solo
 * estética (importante si algún día hay ranking).
 */
export function SkinPicker() {
  const wallet = useWallet();
  const preferences = usePetStore((state) => state.preferences);
  const unlockedThemes = usePetStore((state) => state.unlockedScreenThemeIds);
  const unlockedShells = usePetStore((state) => state.unlockedShellSkinIds);
  const setScreenTheme = usePetStore((state) => state.setScreenTheme);
  const setShellSkin = usePetStore((state) => state.setShellSkin);
  const [feedback, setFeedback] = useState('');

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Skins</h2>
        <span className="badge">{wallet} 🪙</span>
      </header>

      <h3 className="subtitle">Pantalla (el juego)</h3>
      <ul className="skins">
        {SCREEN_THEMES.map((theme) => {
          const owned = unlockedThemes.includes(theme.id);
          const active = preferences.screenThemeId === theme.id;
          return (
            <li key={theme.id}>
              <button
                type="button"
                className={`skin ${active ? 'skin--active' : ''}`}
                onClick={() => {
                  const result = setScreenTheme(theme.id);
                  setFeedback(result.ok ? `${theme.label} activado` : result.reason ?? '');
                }}
              >
                <span className="skin__name">
                  {theme.label} {!owned && theme.unlockCost > 0 && <em>({theme.unlockCost} 🪙)</em>}
                </span>
                <span className="skin__meta">
                  {theme.width}x{theme.height} · {theme.monochrome ? 'monocromo' : 'color'}
                </span>
                <span className="skin__desc">{theme.description}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <h3 className="subtitle">Carcasa (el plástico)</h3>
      <ul className="skins">
        {SHELL_SKINS.map((skin) => {
          const owned = unlockedShells.includes(skin.id);
          const active = preferences.shellSkinId === skin.id;
          return (
            <li key={skin.id}>
              <button
                type="button"
                className={`skin ${active ? 'skin--active' : ''}`}
                onClick={() => {
                  const result = setShellSkin(skin.id);
                  setFeedback(result.ok ? `${skin.label} activada` : result.reason ?? '');
                }}
              >
                <span className="skin__swatch" style={{ background: skin.appearance.body }} />
                <span className="skin__name">
                  {skin.label} {!owned && skin.unlockCost > 0 && <em>({skin.unlockCost} 🪙)</em>}
                </span>
                <span className="skin__desc">{skin.description}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {feedback && <p className="feedback">{feedback}</p>}
      <p className="muted">
        En Fase 3 esta carcasa pasa a 3D (React Three Fiber) usando los mismos datos: `material: roughness /
        metalness / clearcoat`.
      </p>
    </section>
  );
}
