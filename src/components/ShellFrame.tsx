import type { ReactNode } from 'react';
import { getShellSkin } from '@/skins/shell';
import { usePetStore } from '@/store/usePetStore';

/**
 * LA CARCASA (Fase 1, 2D en CSS).
 *
 * Toda la apariencia sale de la skin activa (`ShellSkin.appearance`), así que
 * agregar una carcasa nueva es agregar un objeto en `src/skins/shell/`.
 * En Fase 3 este componente pasa a ser `Shell3D` con R3F, y los mismos datos
 * (`material: { roughness, metalness, clearcoat }`) alimentan MeshPhysicalMaterial.
 */
export function ShellFrame({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const shellSkinId = usePetStore((state) => state.preferences.shellSkinId);
  const skin = getShellSkin(shellSkinId);
  const { appearance } = skin;

  return (
    <div
      className="shell"
      data-skin={skin.id}
      style={
        {
          '--shell-body': appearance.body,
          '--shell-body-shadow': appearance.bodyShadow,
          '--shell-bezel': appearance.bezel,
          '--shell-button': appearance.button,
          '--shell-button-shadow': appearance.buttonShadow,
          '--shell-button-text': appearance.buttonText,
          '--shell-screen-tint': appearance.screenTint,
        } as React.CSSProperties
      }
    >
      <div className="shell__bezel">
        <div className="shell__screen-tint" />
        {children}
      </div>
      {footer && <div className="shell__footer">{footer}</div>}
      <p className="shell__caption">
        Carcasa: <strong>{skin.label}</strong> · {skin.description}
      </p>
    </div>
  );
}
