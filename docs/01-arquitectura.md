# Arquitectura

## La idea en una frase

**El juego es un módulo puro de TypeScript; React es solo una de sus pantallas.**

Si mañana querés un modo espectador, un bot, una versión de consola o un worker
que simule mascotas en el servidor, reusás `src/game/` sin tocar nada. Eso no es
"arquitectura por amor al arte": es lo que te permite testear el juego en
milisegundos y validar el score en el servidor más adelante.

## Las 3 capas

```
PRESENTACIÓN   src/components, src/hooks/useGameLoop
   │  ├── lee estado con hooks (React re-renderiza ~4 veces por segundo)
   │  ├── dispara acciones: store.act({ type: 'feed', foodId })
   │  └── dibuja a 60 fps leyendo el store con getState() (sin re-render)
   ▼
ADAPTADOR      src/store/usePetStore.ts  (+ src/lib/*)
   │  ├── reloj REAL  →  reloj de JUEGO   (acá y solo acá)
   │  ├── persistencia en localStorage (version + migrate)
   │  ├── monedas, skins desbloqueadas, memorial
   │  └── catch-up: cuánto tiempo pasó desde lastSeenAt
   ▼
CORE           src/game/**
      ├── engine.ts      loop de paso fijo (no conoce React)
      ├── simulation.ts  avance del tiempo y consecuencias
      ├── pet.ts         acciones del jugador (validadas acá)
      ├── lifecycle.ts   estadios y multiplicadores
      ├── mutations.ts   tiradas deterministas
      ├── scoring.ts     score derivado
      └── renderer/**    buffer de píxeles + composición de escena
```

## El flujo de un tick (lo que pasa 4 veces por segundo)

```
rAF dispara frame(timestamp)
  └─ engine acumula el tiempo real transcurrido
       └─ cada 250 ms llama onTick(250)
            └─ store.advanceBy(250)
                 └─ advance(pet, 250, { config })      ← CORE
                      ├─ simula en pasos (gruesos si el salto es grande)
                      ├─ devuelve { state, events, coinDelta }
                      └─ el store guarda, suma monedas y actualiza lastSeenAt
       └─ onFrame({ alpha })
            └─ presenter.render({ pet, gameNow: updatedAt + alpha*250*speed })
```

**¿Por qué `gameNow` con `alpha`?** Porque el estado se actualiza 4 veces por
segundo pero la pantalla dibuja 60. Interpolando con la fracción del tick, la
animación queda continua (el respirar, el parpadeo, las Z al dormir) sin
necesitar un reloj de animación aparte.

## Los dos relojes (esto es lo que casi nadie hace bien)

| Reloj | Dónde vive | Para qué |
|---|---|---|
| **Real** | `store.lastSeenAt` + `lib/clock.now()` | medir cuánto tiempo pasó de verdad, sincronizar con el servidor |
| **De juego** | `PetState.updatedAt`, `hatchedAt`, `statusUntil` | toda la lógica: edad, decaimiento, evoluciones, score |

Consecuencias prácticas:

- El core **nunca** llama a `Date.now()` → se puede simular "pasaron 3 días" en un
  test que corre en 5 ms.
- El botón **x600** multiplica el tiempo real **antes** de entrar al core
  (`advance` recibe ms reales y aplica `config.speed`). No hay dos caminos de código.
- Cuando Supabase esté, `lib/clock.setServerOffset()` corrige el reloj del cliente
  sin tocar una línea del juego.

## Por qué el core no importa React

1. **Testeo instantáneo.** 56 tests en ~300 ms, sin jsdom, sin browser, sin mocks.
2. **Determinismo.** Sin efectos secundarios (ni DOM, ni red, ni timers) el mismo
   estado + el mismo tiempo = el mismo resultado. Es lo que habilita la
   re-simulación en el servidor para validar el score.
3. **Reuso.** Modo espectador (`composeScene` + `advance` sin React), bot,
   simulador de balance por línea de comandos.
4. **Velocidad de iteración.** Balancear el juego es editar `config.ts` y correr tests.

## Cómo se dibuja

```
composeScene(PixelCanvas, SceneRequest)   ← función PURA
   ├─ fondo (plano / grilla / cuarto) + tinte nocturno
   ├─ decorado según la actividad (plato, pelota, colchoneta, burbujas, lápida)
   ├─ SpriteProvider.draw(...)  ← acá entra tu arte (hoy: procedural)
   └─ HUD del LCD (edad, score, mini-barras) + aviso crítico
CanvasPresenter (único que toca el DOM)
   ├─ buffer 32x24 → ImageData → canvas interno
   ├─ escala ENTERA + imageSmoothingEnabled = false
   └─ efectos de hardware: grilla, ghosting, glow, scanlines
```

Beneficio concreto: `renderer.test.ts` compara frames **byte a byte**. Si un cambio
rompe el dibujo, falla el test, no el jugador.

## Cómo se reusa en la Fase 5 (página pública)

```ts
// sin React, sin store, sin localStorage:
const pet = reconstructPetFromServerRow(row);   // PetState
advance(pet, Date.now() - row.server_updated_at); // catch-up de solo lectura
composeScene(canvas, { pet, gameNow: pet.updatedAt, theme, spriteProvider });
```

Ese es el pago de haber mantenido el core limpio.

## Invariantes que no se negocian

1. `src/game/**` no importa de `src/components/**` ni de `src/store/**`.
2. `PetState` es 100% serializable a JSON (nada de `Map`, `Date`, clases, funciones).
3. Toda regla del juego se valida en el core, aunque la UI ya la filtre.
4. Todo lo aleatorio sale de `rng.ts` con la semilla del huevo.
5. El balance vive en `config.ts`; el contenido en `src/content/`.

> Si alguna vez tenés que romper una de estas para avanzar, anotalo en
> `docs/09-ideas-y-backlog.md` y seguí: mejor un atajo consciente que un sistema
> a medias sin saber por qué.
