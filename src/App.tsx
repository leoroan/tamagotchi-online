import { ActionBar } from '@/components/ActionBar';
import { AuthPanel } from '@/components/AuthPanel';
import { DevPanel } from '@/components/DevPanel';
import { EventLog } from '@/components/EventLog';
import { HUD } from '@/components/HUD';
import { Onboarding } from '@/components/Onboarding';
import { PetScreen } from '@/components/PetScreen';
import { ShellButtons } from '@/components/ShellButtons';
import { ShellFrame } from '@/components/ShellFrame';
import { SkinPicker } from '@/components/SkinPicker';
import { useActivePet } from '@/store/selectors';

/**
 * Layout general.
 *
 * Regla: el aparato (carcasa + pantalla) siempre visible; el detalle en paneles.
 * En el celular los paneles van abajo, y la carcasa primero (como debe ser).
 */
export default function App() {
  const pet = useActivePet();

  return (
    <div className="app">
      <header className="app__header">
        <h1>Tamagotchi Online</h1>
        <p className="muted">
          Mascota virtual con vida, persistencia y escala: huevo, estadios, mutaciones y score por tiempo vivido. Todo
          corre local-first; la nube es un extra, no un requisito.
        </p>
      </header>

      <main className="app__layout">
        <div className="app__device">
          <ShellFrame footer={<ShellButtons />}>
            <PetScreen />
          </ShellFrame>
          {pet && !pet.alive && (
            <p className="warning">
              {pet.name} murió ({pet.causeOfDeath}). Su score quedó congelado: enterrala en el panel “Historia” para
              empezar una vida nueva (queda registrada en tu cementerio).
            </p>
          )}
          {pet && pet.criticalSince !== null && (
            <p className="warning warning--critical">
              ¡Salud en cero! Dale medicina ({'18'} 🪙) antes de que pase la hora de gracia o se muere.
            </p>
          )}
        </div>

        <div className="app__panels">
          {pet ? (
            <>
              <HUD />
              <ActionBar />
              <SkinPicker />
              <EventLog />
              <DevPanel />
              <AuthPanel />
            </>
          ) : (
            <>
              <Onboarding />
              <AuthPanel />
            </>
          )}
        </div>
      </main>

      <footer className="app__footer muted">
        Hecho con Vite + React + TypeScript. El juego vive en <code>src/game/</code> y no depende de React: por eso se
        puede testear y reusar. Roadmap y decisiones en <code>README.md</code> y <code>docs/</code>.
      </footer>
    </div>
  );
}
