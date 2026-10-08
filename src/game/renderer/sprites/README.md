# Sprites: cómo pasar de placeholder a arte real

Hoy la mascota la dibuja `placeholderSprites.ts`: **código, cero archivos**.
Eso permite jugar la Fase 1 sin depender de que tengas arte.

## Cuando tengas sprites (Piskel)

1. Piskel → lienzo de 16x16 (o 24x24 si querés más detalle), fondo transparente.
2. Exportar PNG. Nombrar por convención:
   `especie_estadio_estado.png` → `gelatina_adult_idle.png`
3. Escribir `sheetSprites.ts` con un `SpriteProvider` que:
   - precargue los PNG (`new Image()`),
   - recorte el frame con `drawImage`,
   - escriba en el `PixelCanvas` con `plot()` píxel por píxel.
4. En `src/game/renderer/sprites/index.ts` cambiar:
   `export const ACTIVE_SPRITES = SHEET_SPRITES;`

Nada más. El compositor de escena y el juego **no se enteran** del cambio:
pide un `SpriteProvider`, no un placeholder.

## Reglas de oro del pixel art

- Escala entera SIEMPRE (2x, 3x, 4x…). Nunca 2.5x: deforma los píxeles.
- `imageSmoothingEnabled = false` (ya está hecho en `canvasPresenter.ts`).
- 1 píxel de respiración se nota. 2 ya es un salto.
- Paleta corta: 4 colores como máximo. En temas monocromos se ignora y se
  usa la rampa de la pantalla (`theme.monochrome`).
- Animaciones mínimas: idle (respirar), comer, dormir, jugar. Con eso ya "vive".

## Estados que conviene animar (por estadio)

| Estado     | Frames sugeridos | Nota                                        |
|------------|------------------|---------------------------------------------|
| egg        | 2                | Se mueve cada ~700 ms                        |
| idle       | 2                | Respirar; cada ~4 s un parpadeo              |
| eat        | 3                | Masticar                                     |
| play       | 4                | Saltito                                      |
| sleep      | 2                | Ojos cerrados + Z flotando                   |
| evolve     | 4                | Destello y silueta nueva                     |
| sick/dead  | 1                | Marcarlo claro (sudor / X en los ojos)       |
