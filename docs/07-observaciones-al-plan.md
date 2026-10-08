# Observaciones al plan original (Kimi 3)

El plan inicial está muy bien pensado. Estas son las cosas que cambié, las que
faltaban y las que descubrí al implementarlo. Cada punto dice **qué dice el plan**,
**qué hago acá** y **por qué**.

---

## Resumen ejecutivo

| # | Tema | Veredicto |
|---|---|---|
| 1 | Vercel como deploy | ❌ cambiar a GitHub Pages (vos lo pediste; tiene 3 consecuencias) |
| 2 | "persist te da localStorage gratis" | ⚠️ falta la semántica del tiempo (reloj de juego vs real) |
| 3 | "game loop con delta time" | ⚠️ tiene que ser **paso fijo con acumulador** |
| 4 | "canvas 2D, sin librerías" | ✅ pero con **buffer de píxeles propio** y escala entera |
| 5 | R3F + drei en la carcasa | ⚠️ correcto, pero **no en la Fase 0/1** |
| 6 | Qué pasa si el jugador no entra | ❌ no estaba y es LA decisión de diseño |
| 7 | Score por tiempo | ❌ es falsable; hay que derivarlo y validarlo en servidor |
| 8 | "last write wins" | ⚠️ necesita desempate del servidor y aviso de multi-pestaña |
| 9 | Magic link | ⚠️ fricción en la primera partida; conviene anónimo + upgrade |
| 10 | Estimaciones | ⚠️ optimistas; el core ya está hecho, el arte es lo que se estira |
| 11 | Muerte permanente | ⚠️ necesita "legado" para no frustrar |
| 12 | Monetización | ❌ no estaba; regla: nada que dé ventaja |

---

## 1. Vercel → GitHub Pages

**El plan dice:** deploy en Vercel, "conecta con tu GitHub, deploy por push, gratis".

Es una recomendación razonable en general, pero **vos pediste gh-pages**, y para este
proyecto alcanza. Consecuencias que el plan no menciona y que están resueltas en el repo:

1. **`base` de Vite obligatorio** (`vite.config.ts` lee `VITE_BASE`). Sin esto: página
   en blanco y 404 en los assets.
2. **No hay reescritura de rutas** → `public/404.html` + reinyección en `index.html`.
   Sin esto, la Fase 5 (`/pet/:slug`) no funciona.
3. **No hay funciones propias** → todo lo secreto o validable vive en Supabase
   (RLS + Edge Functions). Esto condiciona el anti-cheat (punto 7).

Si algún día querés previews por PR o funciones propias, migrar a Vercel/Netlify es
cambiar un workflow: el código no depende del hosting.

## 2. El tiempo: lo que faltaba en "persist te da localStorage gratis"

**El plan dice:** Zustand + `persist` te da localStorage gratis, y "con `Date.now()`
calculás cuánto hambre ganó offline".

Cierto, pero falta la parte que rompe los proyectos: **¿qué reloj usa qué cosa?**
Acá se separó explícitamente:

| Reloj | Vive en | Se usa para |
|---|---|---|
| Real | `store.lastSeenAt`, `lib/clock.now()` | medir ausencias, sync, offset del servidor |
| De juego | `PetState.updatedAt` / `hatchedAt` / `statusUntil` | toda la lógica |

Por qué importa: sin esa separación, el botón "x600" (que necesitás para balancear)
rompe el catch-up, y cualquier `Date.now()` escondido en la lógica crea bugs
imposibles de reproducir. Además, el core se vuelve testeable: "pasaron 3 días" es un
test de 5 ms, no una espera de 3 días.

## 3. Delta time: la mitad de la historia

**El plan dice:** usar `requestAnimationFrame` con delta time y nunca `setInterval`.
La segunda parte es 100% correcta. La primera está incompleta:

- **Delta variable** (pasar el tiempo real entre frames a la lógica) hace que la
  simulación dependa de los FPS: con 144 Hz y con 30 Hz el mismo juego avanza distinto.
- **Paso fijo con acumulador**: la lógica avanza en pasos iguales (`tickMs = 250`),
  y el render interpola con `alpha`. Es determinista, testeable y estable.

Está en `engine.ts` y cubierto por `engine.test.ts` (incluye el caso "el frame tardó
60 segundos porque la pestaña estaba en background").

## 4. Canvas 2D: sí, pero con buffer propio

**El plan dice:** canvas 2D a mano, ~200 líneas, sin librerías. Correcto.

El detalle que falta: dibujar directo en el canvas del DOM invita a decimales,
antialiasing y a que se vea borroso. Acá:

- se dibuja en un **buffer RGBA de 32x24** (`PixelCanvas`),
- se escala con **factor entero** y `imageSmoothingEnabled = false`,
- los "defectos" del hardware (grilla, ghosting, glow, scanlines) se aplican **después**
  del escalado, como capa cosmética.

Beneficio inesperado: el render es **puro**, así que los tests comparan frames byte a
byte. Un cambio que rompe el dibujo falla en el CI, no en el celular de un jugador.

## 5. R3F: buen destino, mal punto de partida

**El plan dice:** Fase 3 con R3F, `MeshPhysicalMaterial`, `Environment preset="city"`.
Todo eso es correcto y está anotado como receta en `Shell3D.tsx`.

Lo que agregaría: **`three` + `fiber` + `drei` pesan 500-800 KB**. Ponerlos antes de
que el core sea divertido es la forma más rápida de perder el impulso. Están diferidos
a propósito, con `React.lazy` previsto.

Y el truco que no estaba en el plan y es clave: **usar el canvas 2D como textura**
(`CanvasTexture`) de la pantalla 3D. Así el 3D solo envuelve la misma imagen que ya
generás, sin duplicar el juego ni reescribir el render.

## 6. La decisión de diseño que faltaba

**El plan dice:** stats que decaen, evolución, muerte. No dice **cuánto** ni **qué
pasa si el jugador desaparece una semana**.

Se decidió, implementó y testeó:

| Regla | Valor | Por qué |
|---|---|---|
| Tope de catch-up | 12 h | castigar la desaparición total, no la vida real |
| Gracia en salud 0 | 60 min | sin ventana de rescate, la muerte se siente tramposa |
| Muerte por abandono | ≈24 h | cadencia objetivo: 2-3 visitas/día |
| Decaimiento | 20 h (hambre) a 30 h (higiene) | que una ausencia de trabajo no la mate |

Estos números están en `config.ts` y se pueden cambiar sin tocar lógica. **Son el
dial más importante del juego.**

## 7. El score por tiempo es falsable (el agujero más grande del plan)

**El plan dice:** score por tiempo vivido + mutaciones. Está perfecto como diseño, pero:
con `localStorage` y `Date.now()`, cualquiera cambia la hora de la PC y se hace
millonario. El plan no lo menciona.

Defensas implementadas o preparadas:

1. **El score se deriva**, no se guarda: no hay puntos que inyectar en el save.
2. **Azar determinista** (`eggSeed` + `rngCursor`): mismo estado + mismas acciones =
mismas mutaciones → el servidor puede **re-simular** y validar.
3. **El servidor es la autoridad del tiempo**: `hatched_at` lo escribe el servidor, y
   `report_score` acota `lived_seconds` contra `now() - hatched_at`.
4. **El reloj pasa por `lib/clock.ts`**, con offset de servidor, en vez de `Date.now()`
   disperso.
5. **Separar "verificado" de "no verificado"** en el ranking: no bloquea a nadie, pero
   el ranking serio queda limpio.

## 8. "Last write wins" necesita más detalle

**El plan dice:** last-write-wins, "es una mascota, no un banco". De acuerdo.

Faltaba: (a) comparar con un campo **del servidor** (`server_updated_at`, ya en el
esquema) y no con el reloj del cliente; (b) el caso **dos pestañas**: las dos simulan y
se pisan. Mitigación barata: `BroadcastChannel` para que la segunda pestaña sea de solo
lectura (está en deuda técnica del README).

## 9. Magic link: mucha fricción para un juego

**El plan dice:** auth con magic link (Google/GitHub).

Para una webapp está bien; para un juego casual, mandar al mail antes de ver al bicho
mata la conversión (el primer minuto decide todo). Propuesta: **jugar sin cuenta**
(local) y ofrecer cuenta cuando el jugador quiera llevar la mascota a otro dispositivo
o competir. Supabase permite *anonymous sign-in* y después *upgrade*. La UI ya está
planteada así: `AuthPanel` es informativo, no un muro.

## 10. Estimaciones

**El plan dice:** 6-9 semanas a producción compartible, con ~30% de realismo extra.

El 30% extra es buen reflejo. Pero el reparto cambia: la parte que el plan ponía al
final (arte) es la que más tiempo real lleva, y la que parecía más difícil (core +
persistencia) ya está hecha y testeada. Mi lectura, con evidencia de este repo:

| Bloque | Estimación |
|---|---|
| Core + persistencia + skins + tests | **hecho** |
| Arte real (sprites + sonido) | 3-5 días de ratos |
| Contenido + minijuego (Fase 2) | 1-2 semanas |
| Carcasa 3D | 3-5 días |
| Supabase (con el SQL ya escrito) | 3-5 días |
| Compartir + PWA + pulido | 1 semana |

## 11. La muerte permanente necesita un premio

**El plan dice:** "dependencia de cuidado: la mascota se podría morir". Es tu idea y es
correcta para que el juego tenga stakes. Pero en un juego persistente, morir y perder
todo sin retorno expulsa jugadores nuevos (justo los que más se equivocan).

Propuesta implementada a medias: **muerte con legado**. Ya funciona el memorial
(nombre, estadio, score, horas vividas, causa). En backlog: que cada legado dé un bonus
permanente al próximo huevo. La pérdida alimenta la progresión en vez de ser un callejón.

## 12. Monetización: el plan no la toca

Regla que ordena todo: **nada que dé ventaja competitiva**, porque hay ranking. Se
vende identidad (carcasas, temas, accesorios, sonidos, huevos cosméticos), no poder.
El juego completo debe ser alcanzable gratis. Detalle en el README.

---

## Lo que descubrí al implementarlo (y no era obvio en el plan)

Estos tres bugs los encontraron los tests del core, no la lectura del código:

1. **Sobre-alimentar daba beneficio neto.** La comida sumaba más salud que el castigo
   por sobre-alimentar, así que "spamear comida" era rentable. Se cambió: cuando está
   llena, la comida casi no alimenta, no da energía y **resta** salud.
2. **El gate de comida por estadio vivía solo en la UI.** El core dejaba dar "Elixir"
   (nivel adulto) a una cría. Ahora la regla está en `applyAction` y hay un test que
   la protege: las reglas van en el core, la UI solo filtra.
3. **La energía era imposible de administrar.** Con el balance inicial, la mascota se
   agotaba en 5 h: el jugador tenía que elegir entre dormirla o cuidarla, y en ambos
   casos perdía. Un test de "3 días de juego con un jugador cuidadoso" lo expuso y se
   recalibró todo el decaimiento a la cadencia 2-3 visitas/día.

Moraleja para tu proyecto: **los tests del core no son ceremonia**. En un juego con
tantas reglas que interactúan (stats, energía, enfermedad, evolución), el balance se
testa o se sufre en producción.
