# Roadmap detallado

Cada fase tiene: **objetivo**, **tareas**, **criterio de terminado** y **estimación
realista** para ~1-2 h por día después del trabajo. La regla del proyecto es no
empezar una fase sin cerrar la anterior: la deuda se acumula más rápido de lo que
se paga.

---

## Fase 0 — Setup ✅ (terminada)

**Objetivo:** pipeline completo: escribir código → ver el deploy.

- [x] Vite + React 19 + TS `strict` (+ `noUncheckedIndexedAccess`)
- [x] Vitest con alias `@/`, sin jsdom (rápido)
- [x] `base` de Vite por env para GitHub Pages
- [x] Workflows de CI y deploy (en `ci/`, listos para copiar)
- [x] `404.html` para rutas SPA en Pages

**Terminado =** `npm run build` verde y el deploy es automático en un push a main.
**Estimación:** 2-3 días.

---

## Fase 1 — Core jugable ✅ (terminada)

**Objetivo:** que la mascota viva de verdad, sin backend.

- [x] `engine.ts`: paso fijo, acumulador, recorte de frames largos, alpha
- [x] `simulation.ts`: decaimiento, sueño, enfermedad, muerte con gracia, evolución
- [x] `pet.ts`: acciones validadas en el core, sobre-alimentación, chatarra, medicina
- [x] `lifecycle.ts` + `config.ts`: curva de vida y balance data-driven
- [x] `mutations.ts` + `scoring.ts`: end-game y score derivado
- [x] Persistencia (`persist` + versión + migrate) y catch-up con tope
- [x] Render: buffer de píxeles, 4 temas, 3 carcasas, sprites por código, HUD
- [x] Panel Dev con x1/x10/x60/x600 y saltos de tiempo
- [x] 56 tests (core, render, store)

**Terminado =** cerrás la pestaña 8 h, volvés, y la mascota siguió viviendo
(hambre abajo, higiene abajo, quizás enferma) sin que se rompa nada.
**Estimación:** 1-2 semanas. **Ya está hecho y testeado.**

---

## Fase 1.5 — Arte y sonido (recomendado como próximo paso) ⬜

**Objetivo:** que se vea y suene a TU juego. Es el paso con mejor relación
satisfacción/esfuerzo.

- [ ] Dibujar en Piskel: `gelatina_baby_idle`, `_child_idle`, `_teen_idle`, `_adult_idle`
- [ ] Implementar `sheetSprites.ts` (`SpriteProvider`) y cambiar `ACTIVE_SPRITES`
- [ ] `npm i howler` + 4 sonidos de jsfxr (comer, jugar, evolucionar, morir) + mute
- [ ] Un `DevPanel` con "forzar estadio" para ver todos los sprites sin esperar días

**Terminado =** el juego se ve con tu dibujo y suena. **Estimación:** 3-5 días.

---

## Fase 2 — Personalidad y contenido ⬜

**Objetivo:** que cada partida se sienta distinta sin agregar sistemas nuevos.

- [ ] 2-3 especies más y 1-2 estadios más (crisálida, forma alternativa)
- [ ] Eventos aleatorios con el RNG determinista (resfrío, tesoro, sueño raro)
- [ ] Logros + notificaciones; diario de vida narrado desde `log`
- [ ] Minijuego en la pantalla LCD (atrapar bolitas) que pague monedas
- [ ] Tests de UI con jsdom + Testing Library (flujo: crear → alimentar → avanzar)
- [ ] Pantalla "tumba/cementerio" con el historial (ya hay datos, falta UI linda)

**Terminado =** dos jugadores comparan sus mascotas y tienen historias distintas.
**Estimación:** 1-2 semanas.

---

## Fase 3 — Carcasa 3D ⬜

**Objetivo:** el "wow" visual sin tocar el juego.

- [ ] `npm i three @react-three/fiber @react-three/drei`
- [ ] Cápsula con `MeshPhysicalMaterial` desde `ShellSkin.material`
- [ ] `<CanvasTexture>` del canvas 2D como pantalla del aparato
- [ ] Luces + `<Environment preset="city">` + rotación suave con el mouse
- [ ] Botones 3D con raycast → **las mismas acciones del store**
- [ ] `React.lazy` + `<Suspense>` para que el 2D cargue primero

**Cuidado:** no dupliques lógica. Los botones 3D llaman a `store.act()`; la pantalla
3D muestra la textura del canvas 2D. Si te encontrás copiando reglas al 3D, pará.
**Terminado =** podés girar el aparato y apretar botones de verdad, y el juego es
el mismo de antes. **Estimación:** 3-5 días (una vez entendido R3F).

---

## Fase 4 — Supabase ⬜

**Objetivo:** la mascota viaja entre dispositivos.

- [ ] Crear el proyecto y correr `supabase/migrations/0001..0003`
- [ ] `npm i @supabase/supabase-js`; completar `src/lib/supabase.ts`
- [ ] Auth **anónimo** por defecto + upgrade a cuenta (magic link o GitHub) sin
      perder la mascota (migrar `user_id` del anónimo)
- [ ] Adaptador de sync en `src/lib/sync.ts`: debounce 5 s + `pagehide`/`visibilitychange`
- [ ] Resolución de conflictos: comparar `server_updated_at` (no el reloj del cliente)
- [ ] `report_score` al morir / al evolucionar; marcar `verified` aparte
- [ ] (Después) Edge Function que re-simula la semilla y valida el score

**Terminado =** entrás desde el celular y tu mascota está ahí, sin pasos manuales.
**Estimación:** 3-5 días. **El SQL y las políticas ya están escritos.**

---

## Fase 5 — Compartir ⬜

**Objetivo:** que el juego se pueda mostrar (y crezca solo).

- [ ] `/pet/:slug` público usando la vista `public_pets` y `composeScene` sin React
- [ ] "Compartir" que copia la URL + un PNG generado del canvas (`toDataURL`)
- [ ] Ranking con `leaderboard`, separando verificado / no verificado
- [ ] Visitar mascotas de amigos y dejar una caricia (contador simple)

**Terminado =** un amigo abre un link y ve tu mascota viva (sin cuenta).
**Estimación:** 3-4 días.

---

## Fase 6 — Pulido y crecimiento ⬜

- [ ] PWA: `vite-plugin-pwa`, manifest, iconos, "agregar a inicio", recordatorio
- [ ] Temporadas/eventos; especies limitadas
- [ ] Monetización cosmética (ver README)
- [ ] Analítica mínima de retención (¿vuelven al día 2? ¿al día 7?)
- [ ] Balance con datos reales (¿la gente deja morir la mascota en el día 1?)

---

## Lo que NO hay que hacer (por ahora)

| Tentación | Por qué no |
|---|---|
| Phaser / motor 2D completo | el render ya está resuelto en 300 líneas propias |
| Redux / estado global complejo | Zustand hace el trabajo con 3 KB |
| Realtime de Supabase | la mascota vive local; el sync cada 5 s alcanza |
| Multijugador en vivo | requiere backend autoritativo; primero que sea divertido de a uno |
| PWA antes de tener retención | instalar algo que no engancha no cambia nada |
| Shaders propios | con `MeshPhysicalMaterial` y buen arte ya se ve excelente |

## Orden recomendado si tenés poco tiempo

1. **Fase 1.5** (arte): es lo que más cambia la percepción del juego.
2. **Fase 2** (contenido + minijuego): es lo que hace que la gente vuelva.
3. **Fase 4** (Supabase): es lo que evita perder jugadores por "se me borró".
4. **Fase 3** (3D): es el marketing interno (capturas, video, asombro).
5. **Fase 5 y 6**: crecimiento.
