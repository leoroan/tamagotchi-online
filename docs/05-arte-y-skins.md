# Arte, skins y sprites

## Los dos ejes de skins (independientes)

```
   PANTALLA (el juego)                CARCASA (el aparato)
   src/skins/screen/*                 src/skins/shell/*
   ├─ lcd-classic   32x24 monocromo   ├─ plastico-clasico  (gris, gratis)
   ├─ lcd-color     32x24 color       ├─ neon-arcade       (40 monedas)
   ├─ gameboy-green 48x32 verde       └─ madera-retro      (150 monedas)
   └─ crt-amber     48x36 ámbar con scanlines
```

4 pantallas × 3 carcasas = **12 combinaciones con 7 archivos de datos**. Agregar una
más es copiar un archivo y sumarlo al registro (`src/skins/screen/index.ts`).

### Qué define un tema de pantalla

| Campo | Efecto |
|---|---|
| `width` / `height` | resolución interna en píxeles REALES (el juego no cambia, solo el lienzo) |
| `monochrome` | si es `true`, la mascota se pinta con la tinta del LCD (no con los colores de la especie) |
| `palette` | fondo, tinta, tinta apagada, acento |
| `pixelGrid` | dibuja la grilla entre píxeles (muy LCD) |
| `ghosting` | 0..1, estela del frame anterior (el "smearing" del cristal líquido) |
| `glow` | radio de brillo del backlight (CRT) |
| `scanlines` | líneas horizontales cada 2 px |
| `scaleMode` | `integer` (píxeles perfectos) o `fit` |
| `backgroundStyle` | `plain`, `grid` o `room` (con piso) |
| `unlockCost` | costo en monedas (0 = gratis) |

### Qué define una carcasa

| Campo | Uso hoy (CSS) | Uso futuro (R3F) |
|---|---|---|
| `appearance.body/bodyShadow/bezel/button/buttonText/screenTint` | variables CSS de la carcasa 2D | color base de la malla |
| `material.roughness/metalness/clearcoat` | (no se usa) | `MeshPhysicalMaterial` |
| `unlockCost` | desbloqueo con monedas | ídem |

> Detalle lindo: la carcasa 2D y la 3D comparten datos. Cuando pases a R3F no vas a
> re-diseñar nada: ya tenés los materiales definidos.

## Pipeline de sprites (de placeholder a tu arte)

Hoy: `placeholderSprites.ts` dibuja la mascota **por código** (cero archivos). Sirve
para jugar ya, y para tener una referencia de tamaño/posición de cada parte.

### Paso a paso con Piskel

1. `piskelapp.com` → nuevo sprite → **16x16** (o 24x24 si querés más detalle),
   fondo transparente.
2. Dibujar la silueta por estadio. Paleta de 4 colores máximo.
3. Exportar PNG con la convención `especie_estadio_estado.png`:
   `gelatina_adult_idle.png`, `gelatina_adult_eat.png`, `gelatina_adult_sleep.png`.
4. Escribir `src/game/renderer/sprites/sheetSprites.ts`:
   ```ts
   export const SHEET_SPRITES: SpriteProvider = {
     id: 'sheet',
     label: 'Sprites PNG (Piskel)',
     draw(canvas, request) {
       const frame = pickFrame(request);            // especie + estadio + animación + frame
       blit(canvas, frame, request.box, request.palette); // plot() píxel por píxel
     },
   };
   ```
5. En `src/game/renderer/sprites/index.ts`:
   ```ts
   export const ACTIVE_SPRITES: SpriteProvider = SHEET_SPRITES;
   ```

El juego **no se entera**: pide un `SpriteProvider`, no un placeholder. Podés tener
los dos y cambiar con una constante (útil para comparar).

### Tabla mínima de sprites a dibujar (para arrancar)

| Estado | Frames | Notas |
|---|---|---|
| egg | 2 | se mueve cada ~700 ms |
| idle | 2 | respirar; parpadeo cada ~4 s |
| eat | 3 | masticar |
| play | 4 | saltito |
| sleep | 2 | ojos cerrados + Z |
| evolve | 4 | destello y silueta nueva |
| sick / dead | 1 cada uno | que se entienda de un vistazo |

× 6 estadios × 3 especies = mucho. **Atajo inteligente:** dibujá 1 especie completa
(6 estadios × 4 estados ≈ 20 sprites) y las otras dos especies solo cambian la
oreja/detalle. El `SpriteProvider` puede componer capas (cuerpo + oreja + mutación).

### Reglas de oro del pixel art

1. **Escala entera siempre.** Nunca 2.5x: deforma los píxeles. Ya está garantizado.
2. `imageSmoothingEnabled = false` (hecho en `canvasPresenter.ts`).
3. **1 píxel de respiración se nota.** 2 ya es un salto.
4. Paleta corta (4 colores). En temas monocromos se ignora: se usa la rampa del LCD.
5. Animaciones mínimas: idle, comer, dormir, jugar. Con eso ya "vive".
6. Las **mutaciones se tiñen por código** (`spritePalette()` mezcla el tinte), así que
   no necesitás un sprite por mutación: dibujá una base limpia.

## Mutaciones visibles

En `scene.ts` / `placeholderSprites.ts` cada mutación tiene su marca:

| Mutación | Marca visual |
|---|---|
| Brillo / Eterno | halo pulsante alrededor del cuerpo |
| Tentáculos | apéndices que se mueven |
| Cristalino | destellos translúcidos |
| Tóxico | burbujas ascendentes |
| Alado | alas que baten |
| Prismático | píxeles orbitando |
| Coloso | sombra ancha y cuerpo más grande |

Cuando tengas tus sprites, podés mantener estas marcas encima (se dibujan antes y
después del sprite) o reemplazarlas por capas propias.

## Sonido (Fase 1.5/2)

- **jsfxr** (web, gratis) para generar beeps 8-bit.
- 4 sonidos: comer, jugar, evolucionar, morir. Con eso ya cambia el feel.
- `Howler` con volumen y mute persistido en `preferences.soundEnabled` (el campo ya existe).
- Truco de autenticidad: el beep debe ser **corto** (< 120 ms) y con un solo canal.

## Paleta y coherencia visual

- El look "LCD clásico" es la identidad del proyecto: verde-gris, 32x24, grilla visible.
- Los temas a color existen para que la gente pueda ver las especies y mutaciones.
- **No mezcles estilos**: si un tema es monocromo, no le metas un degradado.
- El HUD del DOM (paneles) puede ser moderno; la pantalla del aparato, no. Esa
  diferencia es la que hace que se sienta "un aparato" y no "una web".
