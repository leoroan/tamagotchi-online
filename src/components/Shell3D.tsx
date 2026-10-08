import { Suspense, lazy } from 'react';

/**
 * CARCASA 3D — STUB DE FASE 3 (React Three Fiber).
 *
 * Por qué queda como stub y no como dependencia instalada:
 *   - @react-three/fiber + drei pesan bastante y todavía no aportan al MVP.
 *   - Cuando llegue el momento se cargan con `lazy()` para que la pantalla 2D
 *     arranque rápido y el 3D llegue después (nadie espera 800 KB para ver un bicho).
 *
 * Receta de la Fase 3 (ver docs/03-roadmap.md):
 *   npm i three @react-three/fiber @react-three/drei
 *   y reemplazar este archivo por:
 *
 *   export default function Shell3D({ skin }: { skin: ShellSkin }) {
 *     return (
 *       <Canvas camera={{ position: [0, 0, 6], fov: 35 }}>
 *         <ambientLight intensity={0.6} />
 *         <directionalLight position={[3, 5, 4]} intensity={1.2} />
 *         <Environment preset="city" />
 *         <mesh>
 *           <capsuleGeometry args={[1.6, 2.2, 12, 32]} />
 *           <meshPhysicalMaterial
 *             color={skin.appearance.body}
 *             roughness={skin.material.roughness}
 *             metalness={skin.material.metalness}
 *             clearcoat={skin.material.clearcoat}
 *           />
 *         </mesh>
 *         <mesh position={[0, 0, 1.62]}>  {/* la pantalla, con la textura del canvas 2D *\/}
 *           <planeGeometry args={[2.2, 1.7]} />
 *           <meshBasicMaterial map={screenTexture} />
 *         </mesh>
 *       </Canvas>
 *     );
 *   }
 *
 * Truco clave: el canvas 2D del juego se usa como TEXTURA de la pantalla 3D
 * (CanvasTexture). Así el "juego" y la "carcasa" siguen desacoplados: el 3D
 * solo envuelve la misma imagen que ya generás en 2D.
 */
const Placeholder = lazy(async () => ({
  default: () => (
    <div className="shell3d-stub">
      <strong>Carcasa 3D: Fase 3</strong>
      <span>
        Instalá <code>three</code>, <code>@react-three/fiber</code> y <code>@react-three/drei</code> y reemplazá este
        archivo (la receta está en el propio archivo y en docs/03-roadmap.md).
      </span>
    </div>
  ),
}));

export function Shell3D() {
  return (
    <Suspense fallback={null}>
      <Placeholder />
    </Suspense>
  );
}
