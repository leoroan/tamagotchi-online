import { useActivePet } from '@/store/selectors';
import { usePetStore } from '@/store/usePetStore';

const ICONS: Record<string, string> = {
  hatched: '🥚',
  fed: '🍽️',
  played: '🎮',
  slept: '😴',
  woke: '⏰',
  bathed: '🧼',
  sick: '🤒',
  cured: '💊',
  evolved: '✨',
  mutated: '🧬',
  critical: '🚨',
  care_mistake: '⚠️',
  died: '💀',
};

/** Bitácora de la vida de la mascota: sale del propio `PetState.log` (anillo). */
export function EventLog() {
  const pet = useActivePet();
  const buryPet = usePetStore((state) => state.buryPet);
  const memorials = usePetStore((state) => state.memorials);
  if (!pet) return null;

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Historia</h2>
        {!pet.alive && (
          <button type="button" className="btn btn--alert" onClick={buryPet}>
            Sepultar y empezar de nuevo
          </button>
        )}
      </header>

      <ul className="log">
        {[...pet.log].reverse().map((event, index) => (
          <li key={`${event.at}-${index}`}>
            <span className="log__icon">{ICONS[event.type] ?? '•'}</span>
            <span className="log__detail">{event.detail ?? event.type}</span>
          </li>
        ))}
      </ul>

      {memorials.length > 0 && (
        <>
          <h3 className="subtitle">Cementerio (tu historial)</h3>
          <ul className="log log--memorial">
            {memorials.map((entry) => (
              <li key={entry.diedAt}>
                <span className="log__detail">
                  <strong>{entry.name}</strong> · {entry.stageLabel} · score {entry.score.toLocaleString('es-AR')} ·{' '}
                  {Math.round(entry.livedMs / 3_600_000)} h vividas · {entry.causeOfDeath ?? 'causa desconocida'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
