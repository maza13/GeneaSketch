# Diccionario de Parentesco (GeneaSketch) - Especificación Detallada

Este documento es la referencia técnica y lingüística final para el sistema de parentesco. Su objetivo es eliminar cualquier ambigüedad en la denominación de familiares, desde la línea directa hasta las ramas colaterales más lejanas.

---

## 1. Reglas de Visualización (UI/UX)

| Rango de Grado | Comportamiento en Interfaz |
| :--- | :--- |
| **Grado 1 - 2** | Se muestra solo el **Nombre Estándar**. (Ej: *Abuelo*) |
| **Grado 3 - 10** | Se muestra el **Nombre Estándar** y, en formato discreto, el **Nombre Técnico**. (Ej: *Tatarabuelo (Abuelo 3°)*) |
| **Grado 11+** | Solo se muestra el **Nombre Técnico**. El estándar se oculta por ser arcaico. (Ej: *Abuelo 11°*) |

---

## 2. Línea Directa (Tablas de Referencia)

### ⬆️ Ancestros (Ascendentes)
| Grado | Nombre Estándar | Nombre Técnico | Distancia GEDCOM |
| :---: | :--- | :--- | :---: |
| 1 | Padre / Madre | — | -1 |
| 2 | Abuelo / a | **Abuelo 1°** | -2 |
| 3 | Bisabuelo / a | **Abuelo 2°** | -3 |
| 4 | Tatarabuelo / a | **Abuelo 3°** | -4 |
| 5 | Trastatarabuelo / a | **Abuelo 4°** | -5 |
| 6 | Pentabuelo / a | **Abuelo 5°** | -6 |
| 7 | Hexabuelo / a | **Abuelo 6°** | -7 |
| 8 | Heptabuelo / a | **Abuelo 7°** | -8 |
| 9 | Octabuelo / a | **Abuelo 8°** | -9 |
| 10 | **Decabuelo / a** | **Abuelo 9°** | -10 |
| 11 | — (Límite) | **Abuelo 10°** | -11 |
| 12 | — | **Abuelo 11°** | -12 |

### ⬇️ Descendientes (Descendientes)
| Grado | Nombre Estándar | Nombre Técnico | Distancia GEDCOM |
| :---: | :--- | :--- | :---: |
| 1 | Hijo / a | — | +1 |
| 2 | Nieto / a | **Nieto 1°** | +2 |
| 3 | Bisnieto / a | **Nieto 2°** | +3 |
| 4 | Tataranieto / a | **Nieto 3°** | +4 |
| 5 | Chozno / a | **Nieto 4°** | +5 |
| 6 | Bichozno / a | **Nieto 5°** | +6 |
| 7 | Trichozno / a | **Nieto 6°** | +7 |
| 8 | Tetrachozno / a | **Nieto 7°** | +8 |
| 9 | Pentachozno / a | **Nieto 8°** | +9 |
| 10 | Hexachozno / a | **Nieto 9°** | +10 |
| 11 | **Heptachozno / a** | **Nieto 10°** | +11 |
| 12 | — (Límite) | **Nieto 11°** | +12 |

---

## 3. Colaterales Superiores (Tíos)

La regla es: **Tío + [Nombre del Ancestros Directo del mismo grado]**.

| Relación | Nombre Resultante | Explicación |
| :--- | :--- | :--- |
| Hermano del Padre | **Tío** | Rama del Grado 1 |
| Hermano del Abuelo | **Tío abuelo** | Rama del Grado 2 |
| Hermano del Bisabuelo | **Tío bisabuelo** | Rama del Grado 3 |
| Hermano del Tatarabuelo | **Tío tatarabuelo** | Rama del Grado 4 |
| ... | ... | ... |
| Hermano del Decabuelo | **Tío decabuelo** | Rama del Grado 10 |
| Hermano del Abuelo 15° | **Tío (Abuelo 15°)** | Aplicación técnica pura |

---

## 4. Colaterales de Misma Generación (Primos)

El grado del primo se determina por el ancestro común más cercano.

| Ancestros Comunes | Relación | Grado |
| :--- | :--- | :---: |
| Padres | **Hermano / a** | — |
| Abuelos | **Primo hermano** | 1° |
| Bisabuelos | **Primo segundo** | 2° |
| Tatarabuelos | **Primo tercero** | 3° |
| ... | ... | ... |
| Decabuelos | **Primo décimo** | 10° |

---

## 5. Colaterales Inferiores (Sobrinos)

Basado en la descendencia de tus hermanos o primos.

| Padre de la persona | Relación contigo |
| :--- | :--- |
| Tu hermano | **Sobrino / a** |
| Tu primo hermano | **Sobrino segundo** |
| Tu primo segundo | **Sobrino tercero** |
| Tu primo décimo | **Sobrino undécimo** |

---

## 6. Casos Especiales de Rama Lejana

Cuando la conexión no es con un hermano de tu ancestro, sino con un primo.

| Relación | Nombre |
| :--- | :--- |
| Primo de tu Padre | **Tío segundo** |
| Primo de tu Abuelo | **Tío abuelo segundo** |
| Primo de tu Bisabuelo | **Tío bisabuelo segundo** |
| Hijo de tu tío abuelo | **Tío segundo** (mismo que arriba, por generación) |

---

## 7. Notas Técnicas Finales
- **Afinidad:** Los términos mantienen la lógica (ej. *Tío político*) añadiendo el sufijo descriptivo.
- **Grados de Sangre:** La distancia técnica es la que manda en el motor interno para evitar ambigüedades en familias con múltiples matrimonios.

---

## 8. Canonicalizacion Runtime (Implementada)

Desde esta migracion, la nomenclatura se resuelve en una capa central unica:
- `src/core/kinship/nomenclature.ts`
- Tipos: `src/types/kinship.ts`

Reglas aplicadas:
- Las relaciones de `kinship.ts` y `statistics.ts` usan el mismo resolvedor.
- Se mantiene compatibilidad con `relationshipText` para UI y codigo legado.
- La visualizacion usa `primary` + `secondary` (cuando aplica tecnico discreto).
- Para grados fuera del rango estandar, se usa etiqueta tecnica como principal.

Notas:
- El atlas JSON se usa como base de datos linguistica.
- Cuando hay discrepancias puntuales historicas, se aplica la tabla canonica runtime definida en el resolvedor para mantener coherencia en todo el proyecto.
