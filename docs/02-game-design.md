# Game design

## El pitch

Sos el responsable de una criatura que **vive en tiempo real** aunque no estés
mirando. Nace de un huevo, crece por estadios, muta si la cuidás bien (o si la
cuidás *mal*, de otra forma), y su score final es literalmente **cuánto vivió y qué
tan bien la trataste**. Si la abandonás, se muere — y queda en tu cementerio.

## El loop de juego

| Tiempo | Qué hacés | Qué pasa |
|---|---|---|
| Segundos | alimentar, jugar, bañar, medicar | stats suben, arranca la animación, ganás monedas jugando |
| Minutos | mirar la pantalla | eclosión, primeros cuidados, primeros errores |
| Horas | volver 2-3 veces al día | decaimiento, higiene, sueño, enfermedad |
| Días | decidir con qué comida y cuándo | evoluciones con gate de cuidado, primeras mutaciones |
| Semanas | sostener el cuidado | ancianidad, mutaciones épicas, score alto, ranking |

## Los 4 recursos y su tensión

| Recurso | Sube con | Baja con | Tensión |
|---|---|---|---|
| Saciedad | comida | tiempo | comer de más **enferma** |
| Ánimo | jugar, comida rica | tiempo, bañarse | jugar gasta energía |
| Energía | dormir | estar despierta, jugar | si duerme, no la cuidás |
| Higiene | bañarse | tiempo | bañarse baja el ánimo |
| Salud | cuidado sostenido | cualquier stat en 0 o enfermedad | es la barra de vida |

Ese cuadro es todo el juego: cada acción tiene costo. Si una acción fuera gratis,
el juego sería un botón de "ganar".

## Estadios, gates y multiplicadores

| Estadio | Entra a | Cuidado mínimo | Score x | Monedas |
|---|---|---|---|---|
| Huevo | 0 | 0 | 1 | 0 |
| Cría | 10 min | 0 | 2 | 10 |
| Infante | 2 h | 30 | 5 | 25 |
| Adolescente | 12 h | 45 | 15 | 60 |
| Adulto | 2 días | 60 | 40 | 150 |
| Anciano | 7 días | 70 | 100 | 400 |

- **Gate de cuidado:** sin cuidado suficiente la mascota no evoluciona. Es el castigo
  "blando" preferido: en vez de matarla, le frena el progreso (y el score).
- **`growthModifier` por especie:** "Púas" tarda 15% más; a cambio aguanta mejor el hambre.
- **`Eterno`** detiene el envejecimiento (mutación legendaria de la ancianidad).

## Muerte: reglas explícitas

1. Salud 0 → **estado crítico** + aviso parpadeante en la pantalla.
2. **60 minutos de gracia** para darle medicina (18 monedas).
3. Si pasa la gracia → muere. `diedAt` se fija, el score **se congela** y el tiempo
   de juego se detiene.
4. **Tope de catch-up de 12 h:** si desapareciste 3 días, se simulan 12 h. Morirse
   por una ausencia larga es castigar la vida real, no el juego.
5. **Causa de muerte** guardada: inanición, enfermedad o negligencia. Se muestra en
   el memorial.

**Cadencia objetivo: 2-3 visitas por día.** Con el balance actual, abandono total
≈ 24 h de vida. Si algún día el juego se siente exigente, subí
`maxOfflineCatchUpMs` antes que bajar los decaimientos: es el dial más "justo".

## Mutaciones (el end-game)

Se tiran **al evolucionar** (no al azar de fondo):

```
chance = 18% + careScore/2000 + bond/4000      (tope 25%)
```

- **Acumulables**, multiplican el score y **tiñen el sprite**: son coleccionables
  visibles, no solo un número.
- Rutas alternativas: **`Tóxico`** exige carga tóxica ≥ 45 (alimentación basura
  deliberada); **`Eterno`** exige ancianidad + cuidado ≥ 88 + vínculo ≥ 80.
- `Prismático` requiere **ya tener 2 mutaciones**: cadenas de mutaciones = progresión
  de largo plazo sin contenido nuevo.

| Mutación | Rareza | Score | Requisito |
|---|---|---|---|
| Brillo | común | x1.15 | cuidado ≥ 10 |
| Tentáculos | común | x1.25 | vínculo ≥ 45 |
| Cristalino | rara | x1.45 | cuidado ≥ 55, vínculo ≥ 40 |
| Tóxico | rara | x1.5 | carga tóxica ≥ 45 |
| Alado | épica | x1.8 | cuidado ≥ 65, vínculo ≥ 60 |
| Coloso | épica | x2.0 | cuidado ≥ 60, 40 comidas, especie Púas |
| Prismático | épica | x2.2 | cuidado ≥ 70, 2 mutaciones previas |
| Eterno | legendaria | x3.0 | anciano, cuidado ≥ 88, vínculo ≥ 80, 80 comidas |

## Score

```
score = segundos_vividos × mult_estadio × ∏(mult_mutación) × (0.5 + ratio_de_cuidado)
```

- Derivado, nunca guardado → imposible inyectar puntos en el save.
- `ratio_de_cuidado` = tiempo bien cuidado / tiempo total (el floor 0.5 evita que un
  mal cuidado anule el tiempo vivido).
- Ejemplo: adulto (x40) con 3 mutaciones (x1.15 × 1.45 × 1.8 ≈ x3) y 90% de cuidado
  (x1.4) → **x168** por segundo. Ahí se entiende por qué el end-game es "vivir mucho
  y cuidar bien".

## Economía

| Fuente | Cantidad |
|---|---|
| Inicial | 30 monedas |
| Jugar | +3 por sesión |
| Buen cuidado | +5 por hora de juego (careScore ≥ 70) |
| Evolución | 10 / 25 / 60 / 150 / 400 |
| Medicina | −18 |
| Comidas | gratis (Semillas) a 45 (Elixir, adulto) |
| Skins | 0 (base) / 40 / 60 / 120 / 150 |

Regla: **la comida básica es gratis**. Si el jugador se queda sin monedas, tiene que
poder alimentarla igual. Cualquier economía que permita un "soft-lock" (no poder
cuidar porque no tenés plata) es un bug de diseño.

## Qué falta diseñar (y es tuyo)

1. **Minijuego del botón "jugar":** atrapar bolitas en la pantalla LCD, 10 segundos,
   paga monedas según puntaje. Es la fuente de ingresos activa (hoy es +3 fijo).
2. **Eventos aleatorios:** resfrío, encontró un tesoro, sueño raro, visita de un
   bicho salvaje. Dan variedad sin sistemas nuevos.
3. **Logros:** "primera mutación", "30 días de vida", "nunca sucia una semana".
4. **Diario de vida:** el `log` ya existe; narrarlo con texto lindo es contenido gratis.
5. **Temporadas:** especies o mutaciones limitadas por tiempo (retención alta, pero
   cuidado con la FOMO en un juego infantil).
6. **Social:** visitar mascotas, dejar una caricia, "cuidar la de un amigo" mientras
   viaja (un pet-sitter). Muy potente, requiere Fase 4/5.
7. **Bonus de legado:** cada mascota muerta da un pequeño bonus permanente al próximo
   huevo (convierte la frustración en progresión).
8. **Balance fino del end-game:** ¿qué pasa después de la ancianidad? Opciones:
   prestigio (renacer con bonus), metamorfosis final, o simplemente que el score siga
   creciendo mientras la mantengas viva.
