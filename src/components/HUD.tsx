import { STAT_KEYS, type StatKey } from '@/game/types';
import { formatAge, getMood } from '@/game/pet';
import { getStage } from '@/game/lifecycle';
import { formatScore } from '@/game/scoring';
import { getSpecies } from '@/content/species';
import { getMutationDefinitions } from '@/content/mutations';
import { useActivePet, useScore, useStageProgress, useWallet } from '@/store/selectors';

const STAT_LABELS: Record<StatKey, string> = {
  hunger: 'Saciedad',
  happiness: 'Ánimo',
  energy: 'Energía',
  hygiene: 'Higiene',
  health: 'Salud',
};

/**
 * HUD del DOM (no de la pantalla LCD).
 * La pantalla chica muestra lo mínimo (estilo hardware viejo); acá va todo el
 * detalle que necesita un jugador de verdad: stats, edad, score desglosado,
 * progreso de evolución y mutaciones.
 */
export function HUD() {
  const pet = useActivePet();
  const score = useScore();
  const progress = useStageProgress();
  const wallet = useWallet();

  if (!pet) return null;
  const species = getSpecies(pet.speciesId);
  const stage = getStage(pet.stageId);
  const ageMs = pet.updatedAt - pet.hatchedAt;

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>{pet.name}</h2>
        <span className={`badge badge--${pet.alive ? 'alive' : 'dead'}`}>{pet.alive ? getMood(pet) : 'muerta'}</span>
      </header>

      <dl className="facts">
        <div>
          <dt>Especie</dt>
          <dd>{species.name}</dd>
        </div>
        <div>
          <dt>Estadio</dt>
          <dd>{stage.label}</dd>
        </div>
        <div>
          <dt>Edad</dt>
          <dd>{formatAge(ageMs)}</dd>
        </div>
        <div>
          <dt>Score</dt>
          <dd>{formatScore(score?.score ?? 0)}</dd>
        </div>
        <div>
          <dt>Monedas</dt>
          <dd>{wallet}</dd>
        </div>
        <div>
          <dt>Cuidado</dt>
          <dd>{Math.round(pet.traits.careScore)} / 100</dd>
        </div>
      </dl>

      <ul className="stats">
        {STAT_KEYS.map((key) => (
          <li key={key} className={pet.stats[key] < 20 ? 'stats__row stats__row--low' : 'stats__row'}>
            <span className="stats__label">{STAT_LABELS[key]}</span>
            <span className="stats__bar">
              <span className="stats__fill" style={{ width: `${Math.round(pet.stats[key])}%` }} />
            </span>
            <span className="stats__value">{Math.round(pet.stats[key])}</span>
          </li>
        ))}
      </ul>

      {progress?.next && (
        <div className="progress">
          <div className="progress__label">
            Próxima evolución: <strong>{progress.next.label}</strong> (cuidado ≥ {progress.next.minCareScore})
          </div>
          <span className="stats__bar">
            <span className="stats__fill stats__fill--accent" style={{ width: `${Math.round(progress.progress * 100)}%` }} />
          </span>
        </div>
      )}

      {score && (
        <p className="breakdown">
          score = {score.ageSeconds}s x{score.stageMultiplier} (estadio) x{score.mutationMultiplier} (mutaciones) x
          {score.careFactor} (cuidado {Math.round(score.careRatio * 100)}%)
        </p>
      )}

      <div className="mutations">
        <span className="mutations__title">Mutaciones ({pet.mutations.length})</span>
        {pet.mutations.length === 0 ? (
          <span className="muted">Ninguna todavía: se tiran al evolucionar, y cuidar bien sube la chance.</span>
        ) : (
          <ul>
            {getMutationDefinitions(pet.mutations).map((mutation) => (
              <li key={mutation.id}>
                <strong>{mutation.name}</strong> <em>({mutation.rarity}, x{mutation.scoreMultiplier})</em>
                <br />
                <span className="muted">{mutation.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
