# 05. Interoperabilidad con GEDCOM (Importación / Exportación)

## Fuentes de verdad (código)
- Puente bidireccional: `src/core/gschema/GedcomBridge.ts`
- Serializador GEDCOM: `src/core/gedcom/serializer.ts`

## Estado de confianza
- **Estado:** Hardened (Schema 0.4.0)

## Propósito
Definir cómo GeneaSketch proyecta datos entre GSchema y GEDCOM minimizando pérdida de información y preservando casos no mapeados.

## Conceptos clave
- **GedcomBridge:** traduce `GeneaDocument <-> GSchemaGraph`.
- **Quarantine AST:** tags no mapeados se almacenan como árbol (`QuarantineAstNode`) con niveles GEDCOM.
- **Targets de exportación:** `GEDCOM 5.5.1` y `GEDCOM 7.0.x`.
- **Conflictos de claims:** se exporta una claim preferida en campo estándar y las no preferidas activas en proyección extendida.
- **ClaimCitation:** representación estructurada de evidencia por claim.

## Mapeo SOUR -> ClaimCitation
- Import:
  - `SOUR @S...@` se mapea a `ClaimCitation.sourceUid` (vía `xrefMap`).
  - `PAGE` se mapea a `ClaimCitation.page`.
  - `TEXT/NOTE` se mapea a `ClaimCitation.transcription`.
  - `QUAY` se normaliza a `ClaimCitation.confidence`.
- Export:
  - `ClaimCitation.sourceUid` se proyecta como pointer `SOUR @S...@`.
  - `page` se exporta como `PAGE`.
  - `transcription` se exporta como `TEXT`.
  - `confidence` se proyecta a `QUAY`.

## Matriz Preserva / Transforma / Pierde
| Tipo de dato | Resultado | Nota |
| :--- | :---: | :--- |
| Nodos core (`INDI`, `FAM`) | **Preserva** | Proyección a `Person/Union` con `xref` estable. |
| Eventos estándar (`BIRT`, `MARR`, etc.) | **Preserva** | Mapeo directo a predicados `*.event.*`. |
| Tags propietarios (`_TAG`) | **Preserva** | Van a cuarentena AST. |
| Estructura jerárquica desconocida | **Preserva** | Conserva `level/tag/value/children/sourceLines`. |
| Claims activas no preferidas | **Transforma sin pérdida** | `5.5.1` -> `NOTE _GSK_CONFLICT`; `7.0.x` -> `_GSK_ALT`. |
| Binarios (`OBJE`) | **Preserva** | El contenedor `.gsk` guarda archivos en `media/`. |

## Reglas no negociables
1. Todo tag GEDCOM sin mapeo directo debe entrar en cuarentena AST.
2. El `xref` original se conserva como referencia informativa en nodos.
3. En export GEDCOM, conflictos activos no preferidos no se eliminan; deben proyectarse como `_GSK_CONFLICT` o `_GSK_ALT` según target.
4. Si el target no soporta representación completa, se degrada a extensión/nota, nunca a borrado silencioso.

## Estado actual (implementado)
- Import de tags desconocidos a `QuarantineAstNode`.
- Export de conflictos:
  - `GEDCOM 5.5.1`: `NOTE _GSK_CONFLICT: <predicate>=<value>`
  - `GEDCOM 7.0.x`: tag de extensión `_GSK_ALT`.
- Migración de cuarentena plana legacy (`rawTag/rawValue`) a AST durante carga de paquetes antiguos.

## Ejemplos / Snippets
```txt
1 NOTE _GSK_CONFLICT: person.event.birth.date={"raw":"ABT 1908"}
1 _GSK_ALT person.event.birth.date={"raw":"ABT 1908"}
```

## Gestión de conflictos (`GSK_CONFLICT|v1`)

Para mantener GeneaSketch como **lossless**, las claims no preferidas no se descartan y se proyectan como metadatos estructurados.

### Formato del payload
`GSK_CONFLICT|v1|<predicate>|<json_payload>`

- `<predicate>`: path GSchema (ej: `person.event.birth.date`).
- `<json_payload>`: claim serializada en JSON compacto.

### Reglas de chunking (fragmentación)
Para evitar límites de longitud de línea GEDCOM (parsers legacy):

1. Si el JSON excede el umbral operativo, debe fragmentarse.
   - Umbral normativo actual: `GEDCOM_CHUNK_MAX_BYTES = 180` (bytes UTF-8).
2. La primera parte va en el tag de extensión (`NOTE` o `_GSK_ALT` según target).
3. Las partes siguientes usan `CONC`.
4. El orden de fragmentos debe preservar exactamente el JSON original.

### Ejemplo de export (GEDCOM 5.5.1, reconstruible)
```txt
1 BIRT
2 DATE 10 JAN 1900
2 NOTE GSK_CONFLICT|v1|person.event.birth.date|{"value":{"raw":"JAN 1900"},"quality":"verified","lifecycle":"active","isPreferred":false}
```

### Ejemplo ilustrativo de chunking (pseudocode)
```txt
2 NOTE GSK_CONFLICT|v1|person.event.birth.date|<json_part_1>
3 CONC <json_part_2>
3 CONC <json_part_3>
```
Regla: `json_part_1 + json_part_2 + json_part_3` debe reconstruir exactamente el JSON original.

## Regla canonica child-union (Fase 1)

- En datos GSK canonicos, toda arista `ParentChild` debe traer `unionUid`.
- `unionUid` debe referenciar una `Union` valida para mantener reconstruccion familiar determinista y export GEDCOM consistente (`FAM/CHIL/FAMC`).

Politica por modo de carga:
- `strict-lossless`: si falta `unionUid`, la carga falla con error estructural (`PARENT_CHILD_MISSING_UNION`).
- `compat`: se crea una `Union` sintetica (`unionType: "UNM"`), se enlazan miembros faltantes y se relinkean las aristas `ParentChild`.

Referencia de politicas strict/compat relacionadas (import `.gsk`):
- Aristas con tipo desconocido: `EDGE_TYPE_UNKNOWN` / `EDGE_TYPE_UNKNOWN_IN_JOURNAL` (detallado en `03_modelo` y `04_operaciones`).
- Paridad de cuarentena (`graph.json.quarantine` vs `quarantine.json`): `QUARANTINE_MIRROR_MISSING` / `QUARANTINE_MIRROR_MISMATCH` (detallado en `02_formato` y `03_modelo`).

## Mapeo `PEDI` <-> `nature` y `QUAY` <-> `certainty`

Import GEDCOM -> GSK:

| GEDCOM | GSK |
| :--- | :--- |
| `PEDI BIRTH` | `nature = "BIO"` |
| `PEDI ADOPTED` | `nature = "ADO"` |
| `PEDI FOSTER` | `nature = "FOS"` |
| `PEDI SEALING` | `nature = "SEAL"` |
| `PEDI UNKNOWN` | `nature = "UNK"` |
| `PEDI` ausente | `nature = "UNK"` (default conservador canonico) |
| `PEDI` no reconocido | `nature = "UNK"` + warning `PEDI_UNKNOWN_VALUE_COERCED` |

| GEDCOM `QUAY` | GSK `certainty` |
| :---: | :--- |
| `3` | `high` |
| `2` | `medium` |
| `1` | `low` |
| `0` | `uncertain` |
| ausente | `uncertain` (default conservador) |

Politica configurable de defaults en import bridge:
- `conservative` (default): `PEDI` ausente => `UNK`, `QUAY` ausente => `uncertain`.
- `legacy-aggressive`: `PEDI` ausente => `BIO`, `QUAY` ausente => `high`.
- Toda asuncion de default se registra en `ParentChild.gedcomAssumptions` y warning de import.

Export GSK -> GEDCOM:

| GSK `nature` | GEDCOM `PEDI` |
| :--- | :--- |
| `BIO` | `BIRTH` |
| `ADO` | `ADOPTED` |
| `FOS` | `FOSTER` |
| `SEAL` | `SEALING` |
| `UNK` | `UNKNOWN` |
| `STE` | `UNKNOWN` + warning `PEDI_STE_DEGRADED_TO_UNKNOWN` |

| GSK `certainty` | GEDCOM `QUAY` |
| :--- | :---: |
| `high` | `3` |
| `medium` | `2` |
| `low` | `1` |
| `uncertain` | `0` |

## Regla de síntesis mandatoria de nombres (Fase 1)

Para garantizar la integridad semántica de GSchema, el importador debe asegurar que toda persona tenga afirmaciones atómicas de nombre.

- **Regla:** Si un registro GEDCOM contiene una línea `1 NAME` con delimitadores de apellidos (`/ /`) pero carece de etiquetas explícitas `2 GIVN` o `2 SURN`, el importador **debe sintetizar** estas partes algorítmicamente.
- **Acción del Puente (Bridge):**
  - El motor debe buscar coincidencias con el patrón `^(.*?)\/(.*?)\/(.*)$`.
  - La parte capturada como nombre de pila (before slashes + after slashes) debe registrarse obligatoriamente como `PersonPredicates.NAME_GIVEN`.
  - La parte capturada entre barras debe registrarse como `PersonPredicates.NAME_SURNAME`.
- **Propósito:** Prevenir que la UI degrade el campo "Nombre(s)" mostrando el nombre completo por falta de datos atómicos en el grafo.
| Entrada GEDCOM | GSchema Predicate | Nota |
| :--- | :--- | :--- |
| `INDI.NAME /.../` | `person.name.full` | Original preservado. |
| `INDI.NAME.GIVN` | `person.name.given` | Nombre de pila explícito. |
| `INDI.NAME.SURN` | `person.name.surname` | Apellido explícito. |

## 15. Soporte de Metadatos de Nombres (NPFX, NSFX, TITL)

GeneaSketch extrae metadatos estructurales y honoríficos para enriquecer la búsqueda y visualización, manteniendo la limpieza de los nombres de pila principales.

### Mapeo de Etiquetas Explícitas

| GEDCOM Tag | GSchema Predicate | Propósito |
| :--- | :--- | :--- |
| `INDI.NAME.NPFX` | `person.name.prefix` | Prefijos (Dr., Sr., Don). |
| `INDI.NAME.NSFX` | `person.name.suffix` | Sufijos (Jr., III, Esq). |
| `INDI.TITL` | `person.name.title` | Títulos nobiliarios o académicos. |

### Inferencia Heurística (Metadata)

Cuando los metadatos están presentes en la cadena `NAME` pero carecen de sub-etiquetas explícitas, el puente los extrae durante la fase de importación:

1. **Prefixes:** Se buscan al inicio de la cadena `GIVN` o de la parte inicial de `NAME`.
   - Patrones soportados: `Dr.`, `Dra.`, `Sr.`, `Sra.`, `Don`, `Doña`, `Sir`, `Lady`, `Fr.`, `Mtr.`, `Mtro.`.
2. **Suffixes:** Se buscan al final de la cadena `NAME` o tras los apellidos.
   - Patrones soportados: `Jr`, `Sr`, `II`, `III`, `IV`, `V`.

### Reglas de Precedencia (TITL)

- Si existe un tag `1 TITL` a nivel de individuo, este se vincula con la variante de nombre primaria (`isPreferred: true`) del nodo persona.
- Si existe un tag `2 TITL` bajo un `1 NAME`, se vincula específicamente a esa variante.


## 16. Coerción robusta de Fechas y Lugares (GSK-021)

#### Fechas Informales
Si el motor no puede extraer una fecha numérica válida (año/mes/día), se preserva la cadena original en el campo `raw` y se marca el objeto con `isInformal: true`. Esto evita la pérdida de información en cadenas como "Aprox. invienro de 1890".

#### Lugares y Jerarquía
Para campos `PLAC`, el motor intentará separar componentes mediante comas (`,`) para poblar el array `parts` del objeto `GeoRef`, facilitando la normalización geográfica posterior sin perder la cadena `placeRaw` original.


---
**Navegación:**  
[← Anterior: 04_operaciones](./04_operaciones.md) | [Siguiente: 06_versionado_y_migraciones →](./06_versionado_y_migraciones.md)
