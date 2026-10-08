# Tamagotchi Online

> Mascota virtual con **vida, persistencia y escala**: nace de un huevo, crece por
> estadios, muta, se enferma, se puede morir, y deja un score según cuánto vivió y
> cómo la cuidaste. La **carcasa** (el aparato) y el **juego** (la pantalla) son
> dos cosas separadas, y las dos se pueden cambiar por skins.

Este repo no es solo un juego: es un **esqueleto de proyecto escalable** con el
core separado de la UI, contenido data-driven, tests del motor, deploy estático y
camino claro a multijugador/backend. La idea es que puedas seguir agregando
contenido durante meses sin reescribir nada.

---

## Índice

- [Estado actual](#estado-actual) — qué funciona HOY
- [Arrancar en 2 minutos](#arrancar-en-2-minutos)
- [Stack y por qué](#stack-y-por-qué)
- [Observaciones al plan original (Kimi 3)](#observaciones-al-plan-original-kimi-3) ← **leer esto**
- [Arquitectura en 3 capas](#arquitectura-en-3-capas)
- [Estructura de carpetas](#estructura-de-carpetas)
- [El juego: diseño y balance](#el-juego-diseño-y-balance)
- [Roadmap por fases](#roadmap-por-fases)
- [Cómo agregar contenido](#cómo-agregar-contenido-recetas)
- [Tests y calidad](#tests-y-calidad)
- [Deploy en GitHub Pages](#deploy-en-github-pages)
- [Monetización: reglas que no se rompen](#monetización-reglas-que-no-se-rompen)
- [Qué aprender (y en qué orden)](#qué-aprender-y-en-qué-orden)
- [Deuda técnica conocida](#deuda-técnica-conocida)
- [Documentación ampliada](#documentación-ampliada)

---

## Estado actual

Leyenda: ✅ hecho y testeado · 🟡 hecho a medias / placeholder · ⬜ pendiente

| Fase | Qué incluye | Estado |
|---|---|---|
| **0. Setup** | Vite + React 19 + TypeScript strict, Vitest, alias `@/`, `base` configurable para Pages, workflows listos en `ci/` | ✅ |
| **1. Core jugable** | Game loop de paso fijo, decaimiento de stats, acciones (comer/jugar/dormir/bañar/medicina), persistencia en localStorage, catch-up offline, muerte con gracia, evolución por estadios, mutaciones, score, monedas | ✅ |
| **1b. Pantalla** | Render propio de píxeles (32x24 LCD), 4 temas de pantalla, 3 carcasas, sprites dibujados por código, HUD, panel Dev con x600 | ✅ |
| **1c. Contenido** | 3 especies, 9 comidas, 8 mutaciones, 6 estadios de vida | 🟡 (funciona, falta más variedad) |
| **2. Personalidad** | Sonido (Howler), animaciones más ricas, eventos aleatorios, logros, minijuego, tests de UI con jsdom | ⬜ |
| **3. Carcasa 3D** | React Three Fiber + drei, materiales, botones 3D con raycast, canvas 2D como textura | ⬜ (stub + receta lista en `src/components/Shell3D.tsx`) |
| **4. Supabase** | Proyecto, auth (magic link o anónimo), sync con debounce, RLS, validación de score en servidor | ⬜ (migraciones SQL + RLS + RPC ya escritos en `supabase/migrations/`) |
| **5. Compartir** | `/pet/:slug` público, visitar mascotas de amigos, ranking | ⬜ (vista SQL `public_pets` y `leaderboard` ya escritas) |
| **6. Pulido** | Minijuegos, PWA instalable, temporadas/eventos, monetización cosmética | ⬜ |

**Lo que podés hacer ahora mismo, sin escribir código:**
poner un huevo, criarlo en tiempo real, acelerar el tiempo x600 con el panel Dev,
verlo evolucionar y mutar, dejarlo morir de hambre, cambiarle la pantalla y la
carcasa, y ver la mascota seguir viva cuando cerrás y volvés a abrir la pestaña.

---

## Arrancar en 2 minutos

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 49 tests del motor, el render y el store
npm run typecheck  # TypeScript strict, sin errores
npm run build      # bundle de producción (≈90 KB gzip hoy)
```

**El primer paso dentro del juego:** poné un huevo (elegís especie y nombre),
esperá 10 minutos de juego a que eclosione… o abrí el panel **Dev / tiempo** y
poné **600x** para ver un día entero en 2,4 minutos. Ese panel es tu mejor amigo
mientras balanceás.

### Dónde tocar qué (mapa mental rápido)

| Quiero… | Archivo |
|---|---|
| cambiar el balance (hambre, muerte, mutaciones, monedas) | `src/game/config.ts` |
| cambiar la curva de vida (estadios, edades, multiplicadores) | `src/game/lifecycle.ts` |
| agregar una especie / comida / mutación | `src/content/*.ts` |
| cambiar el look de la pantalla o la carcasa | `src/skins/**` |
| tocar la animación de la mascota | `src/game/renderer/sprites/placeholderSprites.ts` |
| tocar la lógica del juego | `src/game/simulation.ts`, `src/game/pet.ts` |
| tocar la UI | `src/components/**` |

---

## Stack y por qué

| Capa | Herramienta | Por qué esta y no otra |
|---|---|---|
| Base | **Vite + React 19 + TypeScript** | Arranque instantáneo y, sobre todo, **tipos**: el estado de un juego se vuelve spaghetti sin ellos. `strict` + `noUncheckedIndexedAccess` están activados a propósito. |
| Estado | **Zustand + persist** | 3 KB, sin providers, y `persist` te da localStorage con versión y migración. Ideal para "un objeto de estado que se guarda entero". |
| Render del juego | **Canvas 2D con buffer de píxeles propio** | Control total del pixel-art y del look LCD. Cero dependencias. Además el buffer es **puro** → se testea en Node. |
| Motor | **Game loop propio con paso fijo** | 60 líneas. Es el concepto más importante del proyecto y conviene entenderlo, no importarlo. |
| Carcasa 3D | **React Three Fiber + drei** (Fase 3) | Declarativo, y `drei` te da luces/entorno casi gratis. **Diferido a propósito** (ver observaciones). |
| Sonido | **Howler.js** (Fase 2) | Beeps 8-bit con volumen y mute. |
| Backend | **Supabase** (Fase 4) | Postgres + Auth + RLS. Realtime no lo necesitás (la mascota vive local). |
| Deploy | **GitHub Pages** | Vos lo pediste y alcanza: sitio estático + backend externo. Sin servidor que mantener. |
| Arte | **Piskel** (sprites) + **jsfxr** (sonidos) | Gratis, web, sin instalar nada. |

---

## Observaciones al plan original (Kimi 3)

El plan que te pasaron está **muy bien**: la decisión "local-first, cloud-sync"
es correcta y la separación `game/` sin React es la clave de la escalabilidad.
Lo tomé casi entero. Pero hay **una recomendación equivocada para tu caso y
diez cosas importantes que faltaban**. Las listo con la evidencia de este repo,
porque varias ya están resueltas en el código.

### 1. ❌ Vercel → ✅ GitHub Pages (vos pediste Pages y tiene consecuencias)

`gh-pages` sirve perfecto para este juego: es 100% estático y el backend es
Supabase (externo). Pero cambia tres cosas concretas:

- **`base` de Vite obligatorio.** Pages sirve el sitio en `/<repo>/`. Si el `base`
  no coincide, la página queda en blanco con 404 en los assets. Ya está resuelto:
  `vite.config.ts` lee `VITE_BASE` y el workflow lo setea.
- **No hay reescritura de rutas.** Una URL como `/pet/abc` da 404. Se arregla con
  el truco `public/404.html` + reinyección en `index.html` (ya incluido).
- **No hay funciones propias.** Todo lo que sea "secreto" o "validación" tiene que
  ir en Supabase (RLS o Edge Functions), nunca en el front. Esto **condiciona el
  anti-cheat** (ver punto 7).

### 2. ⚠️ "Zustand con persist te da localStorage gratis" — incompleto

El persist no alcanza: para que la mascota "siga viva" hay que guardar **cuándo
fue la última simulación** y decidir la **semántica del tiempo**. Acá se separó:

- **Reloj de juego** (`PetState.updatedAt`, `hatchedAt`, `statusUntil`): vive
  dentro de la mascota. El core **nunca** lee `Date.now()`.
- **Reloj real** (`store.lastSeenAt`): lo administra el adaptador.

Esa separación es la que permite el botón **x600** sin romper el catch-up, y la que
hace que "pasaron 8 horas" sea un test de 1 ms. Ver `src/lib/clock.ts` y
`src/game/simulation.ts`.

### 3. ⚠️ "Game loop con delta time" — la mitad de la historia

Delta variable (usar el tiempo real entre frames) **despeina la simulación** y hace
que los tests sean irreproducibles. Lo correcto es **paso fijo con acumulador**:
la lógica avanza en pasos iguales (`tickMs = 250`), y si un frame tardó mucho se
recorta y el tiempo perdido lo resuelve el catch-up. Está en `src/game/engine.ts`
y testeado en `engine.test.ts`.

### 4. ⚠️ "Canvas 2D, no uses librerías" — sí, pero con buffer propio

Dibujar directo en el canvas del DOM invita a usar coordenadas con decimales y a
que se vea borroso. Acá se dibuja en un **buffer de 32x24** (`PixelCanvas`) y se
escala con **factor entero** y `imageSmoothingEnabled = false`. Beneficio extra:
el render es **puro y testeable** (`renderer.test.ts` compara frames byte a byte).

### 5. ⚠️ R3F: coincido en el "wow", pero no en la Fase 0/1

`@react-three/fiber` + `drei` + `three` son **~500-800 KB**. Poner eso antes de que
el core sea divertido es la forma más rápida de perder las ganas. Queda como stub
con receta (`src/components/Shell3D.tsx`) y el truco clave anotado: **usar el
canvas 2D como textura (`CanvasTexture`) de la pantalla 3D**, así el juego y el
aparato siguen desacoplados.

### 6. ⚠️ Faltaba la decisión de diseño más importante: *¿qué pasa si no entrás?*

En una mascota virtual persistente, esto define todo. Se decidió y se implementó:

- **Tope de catch-up: 12 h.** Si te fuiste 3 días, se simulan 12 h (no te mata por
  ausencia larga; castiga la desaparición total, no la vida real).
- **Gracia de 60 min** cuando la salud llega a 0: te avisa y podés salvarla con
  medicina. Sin esta ventana, la muerte se siente injusta.
- **Muerte ≈ 24 h de abandono total.** Cadencia objetivo: **2 o 3 visitas por día**.

Todo configurable en `src/game/config.ts` y cubierto por tests.

### 7. ❌ El score por tiempo es trivialmente falsable (y el plan no lo menciona)

Con `localStorage` + `Date.now()`, el jugador cambia la hora de la PC y se hace
millonario. Consecuencias que ya están incorporadas al diseño:

- **El score no se guarda, se deriva** del estado (`computeBreakdown`). Nadie puede
  inyectar puntos en el JSON.
- **Todo el azar es determinista** (semilla del huevo + cursor): la misma semilla +
  las mismas decisiones = las mismas mutaciones. Eso permite, en Fase 4,
  **re-simular en el servidor** para validar el score.
- **`hatched_at` lo escribe el servidor** (ver `0001_init.sql`) y la RPC
  `report_score` acota `lived_seconds` contra ese valor.
- **El reloj pasa por `src/lib/clock.ts`** con offset de servidor, en vez de
  `Date.now()` suelto por todos lados.

### 8. ⚠️ "Last write wins" necesita un desempate y una advertencia

LWW está bien para una mascota, pero: (a) hay que comparar con un campo **del
servidor** (`server_updated_at`, ya en el esquema) y no con el reloj del cliente;
(b) si abrís **dos pestañas**, las dos simulan y se pisan. Mitigación barata para
después: `BroadcastChannel` para que la segunda pestaña sea de solo lectura (está
en deuda técnica).

### 9. ⚠️ Magic link es fricción en la primera partida

Para un juego casual, obligar a ir al mail antes de ver al bicho mata la
conversión. Propuesta: **jugar sin cuenta** (local) y ofrecer cuenta recién cuando
el jugador quiere llevar la mascota a otro dispositivo (o competir en el ranking).
Supabase tiene *anonymous sign-in* + *upgrade* a cuenta real. La UI ya está
planteada así: `AuthPanel` es un stub visible, no un muro de entrada.

### 10. ⚠️ Las estimaciones del plan eran optimistas (y qué cambió)

"6-9 semanas a producción compartible" asumiendo que además aprendés R3F y RLS es
optimista. Pero la parte que importa está mejor de lo previsto: **el core jugable
+ persistencia + skins + tests ya existe en este repo**. Mi lectura realista del
camino que queda:

- sprites reales (Piskel) + sonido + pulido de contenido: **1-2 semanas** de ratos libres;
- carcasa 3D: **3-5 días** (una vez que entendés R3F básico);
- Supabase: **3-5 días** (el SQL y las políticas ya están escritos);
- compartir/ranking + PWA: **2-3 días**.

### 11. ⚠️ La muerte permanente es un arma de doble filo

Retiene… y frustra. Propuesta (implementada a medias): **muerte con legado**. El
memorial guarda nombre, estadio, score y horas vividas (ya funciona: panel
“Historia”), y en el backlog está que cada legado dé un **bonus permanente** al
próximo huevo (por ejemplo +2% de score por legado, o desbloqueo de especie).
Así la pérdida alimenta la progresión en vez de ser solo un castigo.

### 12. ⚠️ La monetización no estaba en el plan

Está desarrollada abajo, pero el principio que ordena todo: **nada que dé ventaja
competitiva**, porque hay ranking. Cosméticos (carcasas, temas, accesorios),
huevos especiales, y PWA. Si algún día va a móvil, Apple/Google exigen IAP para
moneda virtual.

### Lo que además aprendí al escribir el código (no era obvio en el plan)

Tres cosas que aparecieron **solo porque hay tests del core**:

1. **Sobre-alimentar daba beneficio neto** (la comida sumaba más salud de la que
   restaba el castigo). Era un agujero de balance explotable: se arregló
   (`src/game/pet.ts`).
2. **El desbloqueo de comida por estadio estaba solo en la UI.** El core dejaba
   dar "Elixir" a una cría. Las reglas van en el core: la UI se saltea con
   devtools (`pet.test.ts` lo verifica ahora).
3. **La energía era imposible de administrar**: se agotaba en 5 h y el jugador
   tenía que elegir entre dormirla o cuidarla. Se recalibró el balance completo a
   la cadencia "2-3 visitas por día".

Moraleja: los tests del core no son ceremonia, son la red que atrapa estos bugs
antes que tus jugadores.

---

## Arquitectura en 3 capas

```
┌─────────────────────────────────────────────────────────────────────┐
│  3) PRESENTACIÓN (React)          src/components/, src/hooks/       │
│     - carcasa en CSS, HUD, botones, paneles, onboarding            │
│     - NO sabe reglas del juego: pide y muestra                      │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ acciones / estado
┌───────────────────────────▼─────────────────────────────────────────┐
│  2) ADAPTADOR (Zustand)           src/store/usePetStore.ts          │
│     - traduce reloj REAL → reloj de JUEGO                           │
│     - guarda en localStorage (persist) y cobra/paga monedas         │
│     - el catch-up offline se calcula acá                            │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ estado puro + ms transcurridos
┌───────────────────────────▼─────────────────────────────────────────┐
│  1) CORE (TypeScript puro)        src/game/                          │
│     engine (loop) · simulation · pet (acciones) · lifecycle          │
│     mutations · scoring · renderer (buffer de píxeles)               │
│     - CERO React, CERO DOM, CERO red, CERO Date.now()                │
│     - determinista: misma entrada → misma salida                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Las 4 invariantes (si las rompés, el proyecto se desarma)

1. **`src/game/**` no importa React ni toca el DOM.** Es lógica pura. Por eso se
   testea en Node en milisegundos y por eso se puede reusar en una página pública,
   en un bot de Discord o en un worker.
2. **El core no conoce el reloj real.** Recibe milisegundos. Toda la traducción
   vive en el store. Esto habilita el modo x600 y los tests de "pasaron 3 días".
3. **El contenido es data, no código.** Especies, comidas, mutaciones, temas y
   carcasas son arrays de objetos. Agregar contenido no toca la lógica.
4. **Todo lo aleatorio es determinista y vive en el `PetState`** (`eggSeed` +
   `rngCursor`). Eso da tests estables hoy y validación server-side mañana.

### Cómo se dibuja (y por qué así)

```
PetState ──► composeScene()  ──► PixelCanvas (32x24, RGBA) ──► CanvasPresenter ──► <canvas>
   │              │                     puro/testeable              │
   │         fondo + decorado                              escala entera, grilla,
   │         por estado + HUD LCD                          ghosting, glow, scanlines
   └── SpriteProvider.draw()  ← acá se enchufa tu arte de Piskel
```

`composeScene` es una función **pura**: mismo estado → mismo frame. Los tests
comparan frames byte a byte, así que si un día "se rompe" el dibujo, te enterás
en el CI y no en el celular de un jugador.

---

## Estructura de carpetas

```
tamagotchi-online/
├── src/
│   ├── game/                     ← EL CORE (no importa React)
│   │   ├── engine.ts             ← game loop: paso fijo + acumulador
│   │   ├── simulation.ts         ← decaimiento, enfermedad, muerte, evolución
│   │   ├── pet.ts                ← creación del huevo, acciones, getters, formato
│   │   ├── stateMachine.ts       ← transiciones de actividad (idle/comiendo/...)
│   │   ├── lifecycle.ts          ← estadios de vida y multiplicadores de score
│   │   ├── mutations.ts          ← elegibilidad y tirada determinista
│   │   ├── scoring.ts            ← score derivado (tiempo x estadio x mutación x cuidado)
│   │   ├── config.ts             ← TODO el balance en un archivo
│   │   ├── rng.ts                ← PRNG determinista (mulberry32)
│   │   ├── types.ts              ← PetState y compañía (100% serializable)
│   │   ├── renderer/
│   │   │   ├── pixelCanvas.ts    ← buffer RGBA propio (testeable en Node)
│   │   │   ├── pixelFont.ts      ← fuente 3x5 en código
│   │   │   ├── scene.ts          ← compositor de escena (fondo, decorado, HUD)
│   │   │   ├── canvasPresenter.ts← único punto que habla con el DOM
│   │   │   └── sprites/          ← proveedores de sprites (+ README de arte)
│   │   └── __tests__/            ← 49 tests: sim, acciones, score, engine, render
│   ├── content/                  ← DATOS: especies, comidas, mutaciones
│   ├── skins/
│   │   ├── screen/               ← temas de PANTALLA (el juego)
│   │   └── shell/                ← skins de CARCASA (el aparato)
│   ├── store/                    ← Zustand: adaptador + persistencia + selectores
│   ├── components/               ← UI React (carcasa, HUD, acciones, paneles)
│   ├── hooks/useGameLoop.ts      ← une engine + presenter + ciclo de pestaña
│   ├── lib/                      ← clock (offset servidor), env, sync, supabase
│   ├── types/                    ← tipos compartidos (color RGB)
│   └── test/setup.ts             ← localStorage en memoria para los tests
├── ci/                           ← workflows listos para copiar a .github/workflows/
├── docs/                         ← documentación ampliada (ver índice al final)
├── public/                       ← favicon y el truco 404.html para Pages
├── supabase/migrations/          ← SQL: esquema, RLS, vistas públicas, RPC de score
└── README.md
```

---

## El juego: diseño y balance

### El loop

```
ponés un huevo ──► eclosiona ──► cuidás (comer/jugar/bañar/dormir)
     ▲                                        │
     │                                        ▼
  memorial ◄── muere ◄── se enferma ◄── descuidás
     │                     │
     └── legado            └── evoluciona ──► MUTA (end-game)
                                                │
                                                ▼
                                    score = tiempo x estadio x mutación x cuidado
```

### Estadios de vida (`src/game/lifecycle.ts`)

| Estadio | Entra a | Cuidado mínimo | Multiplica score | Monedas |
|---|---|---|---|---|
| Huevo | 0 | 0 | x1 | 0 |
| Cría | 10 min | 0 | x2 | 10 |
| Infante | 2 h | 30 | x5 | 25 |
| Adolescente | 12 h | 45 | x15 | 60 |
| Adulto | 2 días | 60 | x40 | 150 |
| Anciano | 7 días | 70 | x100 | 400 |

El **gate de cuidado** es la mecánica clave: si descuidás, la mascota **se queda
atascada** en el estadio anterior aunque tenga la edad. El score deja de crecer y
se nota.

### Stats y decaimiento (`src/game/config.ts`)

| Stat | Decae | De 100 a 0 | Castigo si llega a 0 |
|---|---|---|---|
| Saciedad (hambre) | 0.083/min | ~20 h | −0.35 salud/min |
| Ánimo | 0.06/min | ~28 h | −0.20 salud/min |
| Energía | 0.12/min | ~14 h despierta | no puede jugar |
| Higiene | 0.055/min | ~30 h | −0.25 salud/min |
| Salud | — | — | a 0: **gracia de 60 min** y después muere |

Durmiendo: **+2,5 energía/min**, el hambre baja a la mitad, se despierta sola a las
4 h. Con todo sano: **+0,3 salud/min**. Abandono total: **~24 h de vida**.

### Score

```
score = segundos_vividos × multiplicador_estadio × ∏(multiplicador_mutación) × (0.5 + ratio_de_cuidado)
```

- Se **deriva** del estado, no se guarda (nadie puede inyectarlo).
- Al morir **se congela** (testeado).
- `ratio_de_cuidado` = tiempo bien cuidado / tiempo total.

### Mutaciones (el end-game)

Se tiran **al evolucionar**, con chance `18% + cuidado/2000 + vínculo/4000` (máx 25%).
Son acumulables, multiplican el score y **tiñen el sprite** (se ven, no son solo un
número). El catálogo tiene rutas alternativas: la **ruta tóxica** (`Tóxico` solo
sale si la alimentaste mal) y la **ruta perfecta** (`Eterno`, x3, solo en la
ancianidad con cuidado ≥ 88). Ver `src/content/mutations.ts`.

### Economía

30 monedas iniciales · +3 por jugar · +5/hora si la cuidás bien · recompensas por
evolución (10/25/60/150/400) · medicina 18 · comidas desde gratis (Semillas, para
que **nunca** te quedes sin poder alimentarla) hasta 45 (Elixir, de adulto).

### Muerte con legado

Al morir, el score se congela y la mascota va al **cementerio** con nombre, estadio,
score, horas vividas y causa. Empezás una vida nueva. *(Pendiente en backlog: que
cada legado dé un bonus permanente al próximo huevo.)*

---

## Roadmap por fases

Cada fase tiene **criterio de terminado**: si no lo cumple, no está terminada.

### Fase 0 — Setup ✅
- [x] Vite + React + TS strict, alias `@/`, Vitest con alias
- [x] `base` de Vite configurable por env (GitHub Pages)
- [x] Workflows de CI y deploy escritos (en `ci/`, ver `ci/README.md`)
- [x] Fallback SPA `404.html`
- **Terminado =** `npm run build` verde y deploy automático posible.

### Fase 1 — Core jugable ✅
- [x] Game loop con paso fijo + acumulador, y recorte de frames gigantes
- [x] Stats que decaen, sueño, higiene, enfermedad probabilística determinista
- [x] Acciones validadas en el core (comer/jugar/dormir/despertar/bañar/medicina)
- [x] Persistencia local + catch-up offline con tope de 12 h
- [x] Muerte con gracia y causa de muerte
- [x] Evolución por edad + gate de cuidado, mutaciones, score, monedas
- [x] Pantalla LCD con 4 temas, carcasa 2D con 3 skins, sprites por código
- [x] Panel Dev con velocidad x1/x10/x60/x600 y saltos de tiempo
- **Terminado =** cerrás la pestaña 8 h, volvés, y la mascota siguió viviendo.

### Fase 1.5 — Tu turno: arte (recomendado como próximo paso) ⬜
- [ ] 3-4 sprites por estadio en Piskel (16x16), exportados como PNG
- [ ] `sheetSprites.ts` implementando `SpriteProvider` y cambiar `ACTIVE_SPRITES`
- [ ] Sonido con Howler (comer, jugar, evolucionar, morir) + botón de mute
- **Terminado =** el juego se ve con TU dibujo y suena. Es el paso con más
  "satisfacción por hora invertida".

### Fase 2 — Personalidad y contenido ⬜
- [ ] Más estadios (crisálida, formas alternativas) y más especies
- [ ] Eventos aleatorios (resfrío, encontró un tesoro, sueño raro)
- [ ] Logros + notificaciones; diario de vida (ya hay `log`, falta narrarlo)
- [ ] Minijuego simple en la pantalla LCD (atrapar bolitas) que pague monedas
- [ ] Tests de UI con jsdom + Testing Library
- **Terminado =** cada partida se siente distinta sin agregar sistemas nuevos.

### Fase 3 — Carcasa 3D ⬜
- [ ] `npm i three @react-three/fiber @react-three/drei`
- [ ] Cápsula con `MeshPhysicalMaterial` usando `ShellSkin.material` (ya está en la data)
- [ ] `CanvasTexture` del canvas 2D como pantalla del aparato
- [ ] Botones 3D con raycast → mismas acciones del store
- [ ] `lazy()` para que el 2D arranque primero
- **Terminado =** podés girar el aparato con el mouse y apretar botones de verdad.

### Fase 4 — Supabase ⬜
- [ ] Crear proyecto, correr `supabase/migrations/*.sql`
- [ ] `npm i @supabase/supabase-js`, completar `src/lib/supabase.ts`
- [ ] Auth anónimo + upgrade a cuenta (magic link) — sin muro de entrada
- [ ] Adaptador de sync en `src/lib/sync.ts` (debounce 5 s + `pagehide`)
- [ ] `report_score` desde el cliente y (después) Edge Function que re-simula
- **Terminado =** entrás desde el celular y tu mascota está ahí.

### Fase 5 — Compartir ⬜
- [ ] `/pet/:slug` de solo lectura usando `public_pets` y `composeScene`
- [ ] Ranking con `leaderboard` (separando verificado / no verificado)
- [ ] "Visitar" la mascota de un amigo y dejarle una caricia

### Fase 6 — Pulido y crecimiento ⬜
- [ ] PWA (instalable, icono en la home, recordatorio de cuidado)
- [ ] Temporadas/eventos con especies limitadas
- [ ] Monetización cosmética
- [ ] Analítica de retención (¿cuántos vuelven al día 2?)

---

## Cómo agregar contenido (recetas)

### Agregar una especie
```ts
// src/content/species.ts
{ id: 'fantasma', name: 'Fantasma', description: '…',
  bodyShape: 'tall', earStyle: 'antenna',
  palette: { base: '#c9b6ff', shade: '#7a5fd0', accent: '#f0e8ff' },
  decayModifiers: { happiness: -0.2 },   // decae 20% más rápido
  favoriteFoodIds: ['pastel'], eggRarity: 3, growthModifier: 1.3,
  mutationPool: ['brillo', 'cristal', 'eterno'] }
```
Nada más: aparece en el onboarding, tiene su silueta (placeholder o tu sprite), su
curva de crecimiento y sus mutaciones.

### Agregar una comida
Una línea en `src/content/foods.ts`. `tier` = calidad, `unlockStageOrder` = cuándo
se desbloquea, `junk: true` = sube la carga tóxica (riesgo de enfermarse).

### Agregar una mutación
Una entrada en `src/content/mutations.ts` con `requirements` (cuidado, vínculo,
carga tóxica, mutaciones previas, comidas, especie) y su `visual.tint`.

### Agregar un estadio de vida
Una entrada en `LIFE_STAGES` (`src/game/lifecycle.ts`). El score, los gates y las
evoluciones se recalculan solos. **Ojo:** los tests de largo plazo usan la curva;
si la cambiás mucho, revisá `simulation.test.ts`.

### Agregar un tema de pantalla o una carcasa
Un archivo en `src/skins/screen/` o `src/skins/shell/` y sumarlo al registro.
Los temas se combinan libres con las carcasas (4 x 3 = 12 looks con 7 archivos).

---

## Tests y calidad

```bash
npm test
```

| Archivo | Qué cubre |
|---|---|
| `simulation.test.ts` | decaimiento por delta time, tope de catch-up, sueño, eclosión, gate de cuidado, muerte, congelado del score al morir, determinismo, consistencia entre pasos finos y gruesos |
| `pet.test.ts` | cada acción: comer (favorita, sin monedas, gate de estadio), sobre-alimentación, chatarra, medicina, jugar sin energía, dormir/despertar, mascota muerta |
| `scoring.test.ts` | crecimiento por tiempo, multiplicadores de estadio y mutación, peso del cuidado, recién nacida = 0 |
| `engine.test.ts` | pasos fijos, recorte de frames largos, alpha de interpolación |
| `renderer.test.ts` | buffer de píxeles, fuente, composición en los 4 temas (día/noche, huevo/muerta), determinismo de frame |
| `app.test.tsx` | smoke de render + integración del store (crear, alimentar, avanzar, skins, catch-up, sepultar) |

**49 tests, sin jsdom, en ~300 ms.** El objetivo no es "cobertura": es que puedas
cambiar el balance y el contenido sin miedo.

Un test del que estoy especialmente contento es **"una mascota bien cuidada llega a
adulta"**: simula 3 días de juego con un jugador que come/juega/baña/duerme. Ese
test encontró tres bugs de diseño reales (ver observaciones 1-3 al final de la
sección anterior).

---

## Deploy en GitHub Pages

### Una sola vez
1. **Settings → Pages → Source: GitHub Actions**.
2. Copiar los workflows (ver [`ci/README.md`](ci/README.md)):
   ```bash
   mkdir -p .github/workflows
   cp ci/deploy-pages.yml .github/workflows/deploy.yml
   cp ci/ci.yml .github/workflows/ci.yml
   git add .github/workflows && git commit -m "chore: activar CI y deploy" && git push
   ```
3. El sitio queda en `https://<usuario>.github.io/<repo>/`.

### Los 3 detalles que rompen Pages (y ya están resueltos)

| Síntoma | Causa | Solución aplicada |
|---|---|---|
| Página en blanco, 404 en los assets | `base` de Vite distinto a `/<repo>/` | `vite.config.ts` lee `VITE_BASE`; el workflow lo setea |
| Entrar a una ruta da 404 | Pages no reescribe rutas SPA | `public/404.html` + reinyección en `index.html` |
| Build "funciona local" y falla en CI | versión de Node / `npm ci` sin lockfile | workflow con Node 22 y `npm ci` |

### Variables de entorno
- `VITE_BASE`: solo para el build de Pages (lo setea el workflow).
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`: Fase 4, van como **Secrets** del
  repo y se inyectan en el build. La anon key es pública por diseño (RLS protege);
  la `service_role` **jamás** va al front.

---

## Monetización: reglas que no se rompen

1. **Nada que dé ventaja competitiva.** Hay ranking; si vendés ventaja, el ranking
   muere y con él la razón para cuidar la mascota.
2. **El juego completo es gratis.** Se puede llegar a anciano y mutar sin pagar
   (las monedas se ganan cuidando bien y jugando).
3. **Se vende identidad, no poder:** carcasas, temas de pantalla, accesorios,
   sonidos, huevos especiales **cosméticos**, y "apoyar el proyecto".
4. **Nada de loot boxes** (y menos si el público es menor de edad). Si hay huevos
   aleatorios, que sean gratis o con pity.
5. **Sin moneda virtual comprable** hasta tener claro el marco legal y, si va a
   móvil, IAP obligatorio por parte de Apple/Google.

Ideas concretas de ingreso, en orden de esfuerzo: skins (ya está el sistema) →
PWA con "tema premium" → temporadas con especies limitadas → patrocinio/merch.

---

## Qué aprender (y en qué orden)

Está todo **usado y comentado en este repo**, así que podés leer el código y ver el
concepto aplicado. En orden de importancia:

1. **Game loop con paso fijo y acumulador** → `src/game/engine.ts` (+ su test).
2. **Separar estado de presentación** → `src/game/*` vs `src/components/*`.
3. **Estado inmutable y serializable** → `src/game/types.ts`, `pet.ts`.
4. **Delta time y catch-up offline** → `src/game/simulation.ts`.
5. **Pixel art en canvas: buffer, escala entera, `imageSmoothingEnabled = false`** →
   `pixelCanvas.ts`, `canvasPresenter.ts`.
6. **Máquinas de estado** → `stateMachine.ts`.
7. **RNG determinista** → `rng.ts` (y por qué te salva el score).
8. **Data-driven design** → `src/content/*`, `src/skins/*`.
9. **Persistencia con versión y migración** → `usePetStore.ts` (clave `version` y
   `migrate`).
10. **R3F básico** (Fase 3) → `<Canvas>`, meshes, luces, `useFrame`.
11. **RLS de Postgres** (Fase 4) → `supabase/migrations/0002_rls.sql`.

**Lo que NO necesitás aprender ahora:** Phaser, motores físicos, WebGL a mano,
shaders, Redux, SSR. Ninguno resuelve un problema que tengas hoy.

---

## Deuda técnica conocida

Cosas que funcionan pero que conviene mejorar cuando molesten (no antes):

| Tema | Riesgo | Arreglo propuesto |
|---|---|---|
| `persist` escribe en cada `set()` (4/s) | escrituras de más en localStorage | throttle del guardado (1/s) o `partialize` más agresivo |
| Dos pestañas juegan la misma mascota | una pisa a la otra | `BroadcastChannel`: la segunda pestaña en modo lectura |
| Score calculado en el cliente | ranking falsificable | re-simulación determinista en Edge Function (la base ya está) |
| Sprites procedurales | no es "tu" arte todavía | Fase 1.5 con Piskel |
| Sin tests de UI interactiva | un bug de interacción no lo agarra el CI | jsdom + Testing Library |
| Sin sonido | falta 30% del feel | Howler en Fase 2 |
| Un solo `PetState` activo a la vez | no hay "colección" de mascotas | el store ya es `Record<id, PetState>`: la UI es la que muestra una |

---

## Documentación ampliada

| Documento | Contenido |
|---|---|
| [`docs/01-arquitectura.md`](docs/01-arquitectura.md) | Las 3 capas en detalle, flujo de datos, por qué el core no usa React, cómo se testea, cómo se reusa para el modo espectador |
| [`docs/02-game-design.md`](docs/02-game-design.md) | Diseño completo: loop, curva de vida, balance con números, muerte, mutaciones, economía, y qué falta diseñar |
| [`docs/03-roadmap.md`](docs/03-roadmap.md) | Roadmap detallado por fases con criterios de aceptación y estimaciones honestas |
| [`docs/04-modelo-de-datos.md`](docs/04-modelo-de-datos.md) | `PetState` campo por campo, SQL, RLS, sync con debounce, conflictos y anti-cheat |
| [`docs/05-arte-y-skins.md`](docs/05-arte-y-skins.md) | Temas, carcasas, pipeline de sprites (Piskel), reglas de pixel art y materiales 3D |
| [`docs/06-hosting-gh-pages.md`](docs/06-hosting-gh-pages.md) | Pages a fondo: base, 404, env vars, dominio propio, PWA, caché |
| [`docs/07-observaciones-al-plan.md`](docs/07-observaciones-al-plan.md) | La crítica completa al plan original de Kimi 3, con evidencia del código |
| [`docs/08-aprendizaje-y-glosario.md`](docs/08-aprendizaje-y-glosario.md) | Conceptos explicados de cero, glosario y errores típicos |
| [`docs/09-ideas-y-backlog.md`](docs/09-ideas-y-backlog.md) | Todas las ideas (tuyas y mías) ordenadas por esfuerzo e impacto |
| [`src/game/renderer/sprites/README.md`](src/game/renderer/sprites/README.md) | Cómo enchufar tu arte sin tocar el juego |
| [`ci/README.md`](ci/README.md) | Activar CI y deploy |

---

## Licencia

MIT (ver [`LICENSE`](LICENSE)): podés usarlo, modificarlo y comercializarlo. El
proyecto nació con asistencia de Kimi 3 (plan inicial) y de Cline (implementación,
revisión crítica y tests).
