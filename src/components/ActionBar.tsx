import { useState } from 'react';
import { FOODS, foodsForStageOrder } from '@/content/foods';
import { getStage } from '@/game/lifecycle';
import type { PetAction } from '@/game/types';
import { useActivePet, useWallet } from '@/store/selectors';
import { usePetStore } from '@/store/usePetStore';

/**
 * BOTONES. Todos disparan acciones del CORE (`store.act`), que es el que valida.
 * La UI nunca decide si una acción es válida: solo muestra el motivo si falla.
 * Esa separación es la que hace que el juego sea testeable y consistente.
 */
export function ActionBar() {
  const pet = useActivePet();
  const wallet = useWallet();
  const act = usePetStore((state) => state.act);
  const [feedback, setFeedback] = useState<string>('');

  if (!pet) return null;

  const stageOrder = getStage(pet.stageId).order;
  const available = foodsForStageOrder(stageOrder);
  const locked = FOODS.filter((food) => food.unlockStageOrder > stageOrder);
  const busy = pet.status !== 'idle';
  const sleeping = pet.status === 'sleeping';

  const run = (action: PetAction, label: string) => {
    const result = act(action);
    setFeedback(result.ok ? `${label}: listo` : `${label}: ${result.reason ?? 'no se pudo'}`);
  };

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Acciones</h2>
        {pet.status !== 'idle' && <span className="badge">{pet.status}</span>}
      </header>

      <div className="actions">
        <button type="button" className="btn" disabled={!pet.alive} onClick={() => run({ type: 'play' }, 'Jugar')}>
          🎮 Jugar <span className="btn__hint">+ánimo, −energía</span>
        </button>
        <button type="button" className="btn" disabled={!pet.alive} onClick={() => run({ type: 'bath' }, 'Bañar')}>
          🧼 Bañar <span className="btn__hint">+higiene, −ánimo</span>
        </button>
        {sleeping ? (
          <button type="button" className="btn" onClick={() => run({ type: 'wake' }, 'Despertar')}>
            ⏰ Despertar
          </button>
        ) : (
          <button type="button" className="btn" disabled={!pet.alive} onClick={() => run({ type: 'sleep' }, 'Dormir')}>
            😴 Dormir <span className="btn__hint">+energía</span>
          </button>
        )}
        <button
          type="button"
          className="btn btn--alert"
          disabled={!pet.alive}
          onClick={() => run({ type: 'medicine' }, 'Medicina')}
        >
          💊 Medicina <span className="btn__hint">18 monedas</span>
        </button>
      </div>

      <h3 className="subtitle">Comida</h3>
      <ul className="foods">
        {available.map((food) => (
          <li key={food.id}>
            <button
              type="button"
              className="food"
              disabled={!pet.alive || busy || food.cost > wallet}
              onClick={() => run({ type: 'feed', foodId: food.id }, `Comer ${food.name}`)}
            >
              <span className="food__name">
                {food.name} {food.junk && <em className="food__junk">chatarra</em>}
              </span>
              <span className="food__cost">{food.cost === 0 ? 'gratis' : `${food.cost} 🪙`}</span>
              <span className="food__desc">{food.description}</span>
            </button>
          </li>
        ))}
      </ul>
      {locked.length > 0 && (
        <p className="muted">
          Se desbloquean al crecer: {locked.map((food) => food.name).join(', ')}
        </p>
      )}

      {feedback && <p className="feedback">{feedback}</p>}
      {sleeping && <p className="muted">Está durmiendo: despertala si querés interactuar (el sueño es sagrado).</p>}
    </section>
  );
}
