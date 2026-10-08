# Aprender haciendo: conceptos, orden y glosario

Vas a aprender todo esto **leyendo el código de este repo**, no en abstracto. Cada
concepto dice dónde está aplicado.

## El orden que importa

### 1. Game loop con paso fijo (el concepto más importante)
**Archivo:** `src/game/engine.ts` · **Test:** `engine.test.ts`

La idea: el juego avanza en **pasos iguales** de tiempo, no en "lo que tardó el
frame". Se acumula el tiempo real y se consumen pasos completos:

```
acumulador += tiempoRealTranscurrido
mientras (acumulador >= 250ms):
    simular(250ms)
    acumulador -= 250ms
```

Por qué: si usás el tiempo real entre frames, la simulación cambia según los FPS del
equipo y los tests se vuelven irreproducibles. Si usás `setInterval`, el navegador lo
throttlea en background y el juego se desincroniza.

**Errores típicos:** usar `setInterval`; usar delta variable para la lógica; no recortar
el frame cuando la pestaña estuvo oculta 10 minutos.

### 2. Separar estado de presentación
**Archivos:** `src/game/*` vs `src/components/*`

El core no sabe que existe React. Devuelve estados nuevos (inmutables) y la UI los
muestra. Beneficio medible: 56 tests en 300 ms.

### 3. Estado inmutable y serializable
**Archivo:** `src/game/types.ts`, `src/game/pet.ts`

Cada acción devuelve un objeto nuevo (`{...state, stats}`), nunca muta el anterior. Y
todo es JSON puro (sin `Date`, `Map`, clases) para poder guardarlo y migrarlo.

### 4. Delta time y catch-up offline
**Archivo:** `src/game/simulation.ts`

`advance(state, msReales)` simula lo que pasó mientras no estabas. Con dos detalles
clave: **tope** (12 h máximo por ausencia) y **pasos gruesos** cuando el salto es
grande (simular 12 h en pasos de 250 ms son 172.800 iteraciones al pedo).

### 5. Pixel art en canvas
**Archivos:** `pixelCanvas.ts`, `canvasPresenter.ts`

- Buffer propio del tamaño real de la pantalla (32x24) y **escala entera**.
- `imageSmoothingEnabled = false`.
- Los efectos de hardware se aplican después de escalar.

**Errores típicos:** coordenadas con decimales, escala 2.5x (píxeles deformes),
dibujar texto con `fillText` (se ve "moderno", no LCD).

### 6. Máquinas de estado
**Archivo:** `stateMachine.ts`

La mascota está en `idle`, `eating`, `sleeping`, etc. Hay una tabla de transiciones
válidas. Esto evita el bug clásico: alimentar mientras duerme y que el hambre suba al
infinito.

### 7. RNG determinista
**Archivo:** `rng.ts`

`Math.random()` no se puede reproducir. Con una semilla guardada en el estado
(`eggSeed`) y un cursor (`rngCursor`), el mismo huevo con las mismas decisiones da las
mismas mutaciones. Eso habilita tests estables **y** validación en el servidor.

### 8. Data-driven design
**Archivos:** `src/content/*`, `src/skins/*`

Agregar una especie, comida, mutación, tema o carcasa es agregar un objeto. La lógica
no cambia nunca. Es la diferencia entre un juego que escala y uno que se atasca.

### 9. Persistencia con versión y migración
**Archivo:** `src/store/usePetStore.ts`

`persist({ version, migrate })`: cuando cambies la forma del estado, subís la versión y
escribís la migración. Un save viejo que rompe la app es el peor bug posible en un
juego persistente.

### 10. React sin re-renderizar 60 veces por segundo
**Archivo:** `src/hooks/useGameLoop.ts`

El estado se lee con `usePetStore.getState()` dentro del callback de rAF: dibuja a 60 fps
sin que React re-renderice nada. React solo se ocupa de la UI que cambia (HUD, botones).

### 11. R3F básico (Fase 3)
`<Canvas>`, meshes, luces, `useFrame`, `Environment`. Y el truco: `CanvasTexture` para
usar el canvas 2D como pantalla del aparato 3D.

### 12. RLS de Postgres (Fase 4)
**Archivo:** `supabase/migrations/0002_rls.sql`

"Sin política, no hay acceso." La seguridad no depende de esconder la key. Probá
siempre con dos usuarios distintos.

## Lo que NO necesitás aprender ahora

| Tecnología | Por qué no |
|---|---|
| Phaser / PixiJS | tu render son 300 líneas propias y ya anda |
| Motores físicos | no hay física en un tamagotchi |
| WebGL / shaders a mano | `MeshPhysicalMaterial` alcanza y sobra |
| Redux / MobX | Zustand resuelve esto con 3 KB |
| SSR / Next.js | no hay SEO que ganar y sí mucha complejidad |
| WebSockets / Realtime | la mascota vive local; sync cada 5 s alcanza |
| Docker / K8s | el deploy es un sitio estático |

## Glosario

| Término | Qué significa acá |
|---|---|
| **Core** | `src/game/`: lógica pura, sin React ni DOM |
| **Adaptador** | `src/store/`: traduce el navegador (reloj, localStorage) al core |
| **Tick** | un paso de simulación (250 ms de tiempo de juego por defecto) |
| **Catch-up** | simular el tiempo que pasó mientras no estabas |
| **Paso fijo** | la lógica siempre avanza en pasos iguales (determinismo) |
| **Alpha** | fracción del tick actual, para interpolar el dibujo |
| **Reloj de juego** | tiempo interno de la mascota (`updatedAt`), no el del sistema |
| **Estadio** | etapa de vida (huevo → anciano) |
| **Gate de cuidado** | requisito de cuidado para poder evolucionar |
| **Mutación** | modificador permanente que multiplica score y tiñe el sprite |
| **careScore** | 0..100, calidad de cuidado reciente (media exponencial) |
| **bond (vínculo)** | sube jugando y mimando; influye en mutaciones |
| **junkLoad** | carga de comida chatarra; sube el riesgo de enfermarse |
| **Legado** | mascota muerta que queda en el memorial |
| **Skin** | apariencia: tema de pantalla (juego) o carcasa (aparato) |
| **SpriteProvider** | interfaz que permite cambiar el arte sin tocar el juego |
| **RLS** | Row Level Security: cada usuario solo ve sus filas |
| **Last-write-wins** | estrategia de conflicto: gana el estado más nuevo |

## Cómo estudiar este repo (ruta sugerida, 3 sesiones)

**Sesión 1 — el motor:** `types.ts` → `engine.ts` → `simulation.ts` → correr
`npm test` y romper algo a propósito para ver el test fallar.

**Sesión 2 — el juego:** `config.ts` → `lifecycle.ts` → `pet.ts` → `content/*`.
Cambiá un número de balance, mirá el efecto en el panel Dev a x600, corré los tests.

**Sesión 3 — la presentación:** `useGameLoop.ts` → `scene.ts` → `canvasPresenter.ts` →
`components/*`. Cambiá un tema de pantalla y entendé qué toca y qué no.

Después de esas tres sesiones vas a poder agregar contenido y features sin ayuda.
