# Ideas y backlog

Tus ideas, ordenadas por **esfuerzo** (bajo/medio/alto) e **impacto** (en retención,
fascinación o ingresos). Al final, las mías.

## Tus ideas (todas anotadas)

| Idea | Estado | Esfuerzo | Impacto | Nota |
|---|---|---|---|---|
| Mascota virtual con vida y persistencia | ✅ hecho | — | alto | es la base |
| Carcasa para dar personalidad (clásica/moderna) | ✅ hecho (2D) | medio (3D) | alto | Fase 3 para el 3D |
| Que se mueva y brille | 🟡 | bajo | medio | ya hay animaciones; el "brillo" = glow por tema |
| Que la carcasa se pueda cambiar | ✅ hecho | — | alto | 3 skins, sistema listo para N |
| Escalable y actualizable | ✅ hecho | — | alto | contenido data-driven |
| Diferentes mascotas a partir de huevos | ✅ hecho | — | alto | 3 especies + huevo misterioso |
| Muchos estadios de vida | 🟡 (6) | bajo | alto | agregar entradas en `LIFE_STAGES` |
| Mutaciones (end-game) | ✅ hecho | — | muy alto | 8 mutaciones con requisitos |
| Score por tiempo vivido + mutación | ✅ hecho | — | muy alto | derivado y congelado al morir |
| Alimentos, más y mejores | 🟡 (9) | bajo | medio | receta en el README |
| Dependencia de cuidado (se puede morir) | ✅ hecho | — | muy alto | con gracia de 60 min |
| Cambiar el estilo gráfico del juego | ✅ hecho | bajo | alto | 4 temas de pantalla |
| Empezar con el look clásico (cuadraditos, gris) | ✅ hecho | — | alto | es el tema por defecto |
| Comercializable / gratis / compras in-game | ⬜ | medio | alto | reglas en el README |

## Lo que falta y yo priorizaría

### Prioridad 1 — retención (hacerlo primero)

| Idea | Esfuerzo | Por qué |
|---|---|---|
| **Minijuego del botón jugar** | medio | hoy "jugar" es un botón; con minijuego es una razón para volver |
| **Sonido (Howler)** | bajo | 30% del feel, se hace en una tarde |
| **Tus sprites (Piskel)** | medio | es lo que hace que sea TU juego |
| **Notificaciones de estado (PWA)** | medio | "tu mascota tiene hambre" es el mayor recuperador de jugadores |
| **Bonus de legado** | bajo | convierte la muerte en progresión |
| **Logros** | bajo | objetivos de corto plazo sin contenido nuevo |

### Prioridad 2 — profundidad

| Idea | Esfuerzo | Por qué |
|---|---|---|
| **Eventos aleatorios** (resfrío, tesoro, visita) | medio | variedad sin sistemas nuevos |
| **Diario de vida narrado** | bajo | el `log` ya existe: es contenido casi gratis |
| **Árbol de mutaciones visible** | medio | coleccionismo: "me falta Eterno" |
| **Accesorios** (gorro, moño) que se compran | medio | monetización cosmética natural |
| **Comida favorita por individuo** (no solo por especie) | bajo | hace única a cada mascota |
| **Estadios alternativos** según cuidado (bueno/malo) | medio | dos ramas de evolución = rejugabilidad |

### Prioridad 3 — social y crecimiento

| Idea | Esfuerzo | Por qué |
|---|---|---|
| **Página pública `/pet/:slug`** | medio | compartir es el motor de crecimiento |
| **Ranking** (verificado / no verificado) | medio | el score necesita destino |
| **Visitar y acariciar** la mascota de un amigo | medio | retención social |
| **Pet-sitter**: un amigo la cuida mientras viajás | alto | mecánica social muy fuerte |
| **Compartir como imagen PNG** | bajo | se comparte solo por WhatsApp/Instagram |
| **Temporadas** (especie/mutación limitada) | medio | picos de actividad (cuidado con la FOMO) |

### Prioridad 4 — ideas grandes (cuando el juego ya enganche)

| Idea | Esfuerzo | Comentario |
|---|---|---|
| **Cruce de mascotas** (dos adultos → huevo nuevo) | alto | genética: mezcla paletas y pools de mutaciones |
| **Mundo/escenario** (la mascota sale a explorar) | alto | casi otro juego; mejor después |
| **Modo "guardería"** (varias mascotas a la vez) | medio | el store ya soporta `Record<id, PetState>` |
| **Recompensas por constancia** (días seguidos cuidando) | bajo | retención diaria clásica |
| **Editor de temas** para jugadores (compartir skins) | alto | comunidad, pero requiere moderación |
| **Localización** (es/en/pt) | bajo | solo si el juego trasciende |

## Ideas que descartaría (o dejaría para muy adelante)

| Idea | Por qué no |
|---|---|
| Combate / PvP | rompe el tono y necesita backend autoritativo |
| Moneda comprable con ventaja | mata el ranking y complica lo legal |
| Chat entre jugadores | moderación: es un costo permanente, no una feature |
| NFT / blockchain | cero beneficio para el jugador, muchísimo costo |
| Loot boxes | riesgo legal y ético, sobre todo con menores |
| 3D completo del mundo | mucho esfuerzo, poco retorno frente al pixel art |

## Cómo decidir qué hacer (regla simple)

Antes de empezar algo, preguntate:

1. **¿Hace que vuelva mañana?** (retención)
2. **¿Hace que se lo muestre a un amigo?** (crecimiento)
3. **¿Hace que se entienda en 10 segundos?** (claridad)
4. **¿Se puede hacer en una sesión de 2 horas?** (si no, partilo en pedazos)

Si la respuesta a las tres primeras es "no", no lo hagas todavía. Es más valioso
pulir el loop que agregar sistemas.
