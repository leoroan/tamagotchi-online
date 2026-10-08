import { useState } from 'react';
import { SPECIES } from '@/content/species';
import { usePetStore } from '@/store/usePetStore';
import type { SpeciesId } from '@/game/types';

/**
 * PRIMERA VEZ: elegir el huevo.
 * El huevo es el momento de "enganche": elegís especie y nombre, y a partir de
 * ahí todo lo que pase es consecuencia de tu cuidado (y de una semilla random
 * que define las mutaciones futuras).
 */
export function Onboarding() {
  const createEgg = usePetStore((state) => state.createEgg);
  const [name, setName] = useState('');
  const [speciesId, setSpeciesId] = useState<SpeciesId>(SPECIES[0]?.id ?? 'gelatina');
  const [surprise, setSurprise] = useState(false);

  return (
    <section className="panel panel--onboarding">
      <h2>Elegí tu huevo</h2>
      <p className="muted">
        No hay partida guardada. Elegí una especie (o dejá que el huevo decida) y ponele nombre. La mascota vive en
        tiempo real: si la dejás sola demasiado, se enferma y se muere.
      </p>

      <ul className="species">
        {SPECIES.map((species) => (
          <li key={species.id}>
            <button
              type="button"
              className={`skin ${!surprise && speciesId === species.id ? 'skin--active' : ''}`}
              onClick={() => {
                setSpeciesId(species.id);
                setSurprise(false);
              }}
            >
              <span className="skin__swatch" style={{ background: species.palette.base }} />
              <span className="skin__name">{species.name}</span>
              <span className="skin__desc">{species.description}</span>
              <span className="skin__meta">Rareza del huevo: {species.eggRarity}</span>
            </button>
          </li>
        ))}
      </ul>

      <label className="field">
        <span>Nombre (máx. 14)</span>
        <input value={name} maxLength={14} placeholder="Ej: Pompón" onChange={(event) => setName(event.target.value)} />
      </label>

      <label className="checkbox">
        <input type="checkbox" checked={surprise} onChange={(event) => setSurprise(event.target.checked)} />
        <span>Huevo misterioso (especie al azar según rareza)</span>
      </label>

      <button
        type="button"
        className="btn btn--primary"
        onClick={() => createEgg({ name: name.trim() || 'Pompón', ...(surprise ? {} : { speciesId }) })}
      >
        🥚 Poner el huevo
      </button>
      <p className="muted">Tip: el huevo eclosiona a los 10 minutos de juego (con el panel Dev podés acelerarlo).</p>
    </section>
  );
}
