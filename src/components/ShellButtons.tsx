import { useState } from 'react';
import { useActivePet } from '@/store/selectors';
import { usePetStore } from '@/store/usePetStore';

/**
 * BOTONES FÍSICOS de la carcasa.
 *
 * Son los mismos que los de la barra de acciones, pero acá viven EN el plástico:
 * es el detalle que hace que la cosa se sienta un aparato y no una web.
 * En Fase 3 (R3F) estos pasan a ser mallas 3D con raycast, y llaman a las mismas
 * acciones del store. Cero lógica duplicada.
 */
export function ShellButtons() {
  const pet = useActivePet();
  const act = usePetStore((state) => state.act);
  const [last, setLast] = useState('');

  const press = (label: string, action: Parameters<typeof act>[0]) => {
    const result = act(action);
    setLast(result.ok ? label : result.reason ?? 'no');
  };

  return (
    <div className="shell-buttons">
      <button
        type="button"
        className="shell-button shell-button--red"
        title="Alimentar (semillas)"
        disabled={!pet?.alive}
        onClick={() => press('comió', { type: 'feed', foodId: 'semillas' })}
      >
        A
      </button>
      <button
        type="button"
        className="shell-button shell-button--blue"
        title="Jugar"
        disabled={!pet?.alive}
        onClick={() => press('jugó', { type: 'play' })}
      >
        B
      </button>
      <button
        type="button"
        className="shell-button shell-button--yellow"
        title="Dormir / despertar"
        disabled={!pet?.alive}
        onClick={() => press('descansó', pet?.status === 'sleeping' ? { type: 'wake' } : { type: 'sleep' })}
      >
        C
      </button>
      {last && <span className="shell-buttons__hint">{last}</span>}
    </div>
  );
}
