import { useRef } from 'react';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useActivePet } from '@/store/selectors';

/**
 * LA PANTALLA. Es un canvas sin React adentro: todo el dibujo lo hace el core
 * (`CanvasPresenter`). React solo le presta el elemento y el ciclo de vida.
 */
export function PetScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useGameLoop(canvasRef);
  const pet = useActivePet();

  return (
    <div className="pet-screen">
      <canvas ref={canvasRef} className="pet-screen__canvas" aria-label="Pantalla de la mascota" />
      {!pet && <div className="pet-screen__empty">Sin señal</div>}
    </div>
  );
}
