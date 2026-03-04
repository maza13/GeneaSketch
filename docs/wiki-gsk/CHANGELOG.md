# Historial de Cambios (Formato `.gsk` y Wiki Tecnica)

## Alcance de este changelog
Este archivo registra **solo** cambios de contrato del formato `.gsk` y cambios de la wiki tecnica `docs/wiki-gsk/`.
Cambios de app/UI/skills de usuario van a `docs/wiki-software/CHANGELOG.md` o al `CHANGELOG.md` raiz.

## Versiones del formato `.gsk`

### v0.5.0 (Base contractual en 040, activacion operativa en 041)
- Se define `gsk-core 0.5.0` como contrato publico **core-only** (sin `meta/*` como parte del estandar).
- Runtime/import agrega politica por schema y modo:
  - `CORE_META_FORBIDDEN` para `schemaVersion >= 0.5.0` cuando aparece `meta/*`.
  - `LEGACY_META_EXTENSION_DETECTED` para extensiones `meta/*` en `<0.5.0`.
- Import `strict-lossless` / `strict-lossless-audit` rechaza `meta/*` en schema core-only; `compat` lo ignora con warning.
- Se mantiene compatibilidad temporal de `GskImportResult.meta` para schema legacy durante la transicion.
- Wiki tecnica sincronizada en capitulos `01`, `02`, `03`, `04`, `06` y `07`.
- Activacion operativa completada en `041`:
  - export runtime normalizado a `schemaVersion = 0.5.0`;
  - salida core-only sin `meta/*` y sin entradas `integrity.role = "meta"` en archivos nuevos.
- Politica transitoria refinada en `044`:
  - `0.5.x` mantiene compatibilidad minima para legacy `<0.5.0` sin pipeline dedicado de auto-migracion;
  - se declara deprecacion explicita y ruta de corte total sin retrocompatibilidad para `0.6.0` (track diferido).

### 0.4.0 - 2026-03-03 (Integrity & Audit Hardening)
- Canon JSON global RFC8785/JCS para hashing determinista cross-runtime.
- Integridad completa de paquete con `integrity.entries[]` + `integrity.packageHash`.
- Manifest de media estructurado (`mediaEntries`) con hash y bytes por archivo.
- Nuevo modo `strict-lossless-audit` para exigir journal verificable.
- Contrato de seguridad explicito (`security.mode=none` en 0.4.0; reservado/no-op).
- Reparaciones `compat` auditables con operaciones `REPAIR_*`.
- Defaults GEDCOM conservadores (`PEDI` ausente => `UNK`, `QUAY` ausente => `uncertain`) con traza de asuncion.
- Chunking GEDCOM normativo por bytes UTF-8 (`GEDCOM_CHUNK_MAX_BYTES=180`).
- Catalogo normativo central de errores (`07_error_catalog.md`).

### 0.3.1 - 2026-03-03 (Hardened)
- Normalizacion documental del contrato canonico (`graph.json` como snapshot autoritativo).
- Politica de recovery explicitada con fast-forward incremental y replay completo.
- Cierre normativo de timestamps (`createdAt` ISO-8601, `timestamp` epoch seconds).
- Alineacion de nombres canonicos de operaciones (`SET_PREF_CLAIM`, `RETRACT_CLAIM`).
- Glosario ampliado con `Fast-forward`, `Replay completo`, `SJP/Golden`, `GSK_CONFLICT|v1`.

### 0.3.0 - 2026-03-02 (Operational Hardening)
- Endurecimiento de carga estricta y validaciones de integridad.
- Consolidacion de reglas de journal gap-less y paridad snapshot-journal.

### 0.2.3 - 2026-03-02
- Baseline de tests de regresion y validacion SJP.
- Matriz de recovery documentada y validada.

### 0.2.2 - 2026-03-02
- `strict-lossless` y verificaciones fuertes de importacion.
- Protocolo `GSK_CONFLICT|v1` integrado en interoperabilidad.

### 0.2.1 - 2026-03-02
- Congelacion de contrato tecnico de archivos criticos.
- Reglas de inmutabilidad de identidad de operaciones (`opId`).

### 0.2.0 - 2026-03-02
- Consolidacion menor de la serie `0.1.x`.

### 0.1.5 - 2026-03-02
- `graphHash`, `signature`, `encryption` en manifest.
- Base para merge incremental de journals.

### 0.1.4 - 2026-03-02
- `ClaimCitation` y `evidenceGate` first-class.
- Mapeo `SOUR <-> citations[]` en import/export GEDCOM.

### 0.1.3 - 2026-03-02
- Quarantine AST lossless.
- Export de conflictos GEDCOM (`_GSK_CONFLICT`, `_GSK_ALT`).

### 0.1.2 - 2026-03-02
- Migracion de `status` a `quality + lifecycle`.

### 0.1.1 - 2026-03-02
- Consistencia snapshot-journal con `graphDerivedFromOpSeq`, `journalHeadOpSeq`, `journalHash`.

### 0.1.0 - 2026-03-02
- Introduccion inicial de formato `.gsk`.

## Versiones de la wiki tecnica

### 1.8 - 2026-03-04
- Cierre documental contractual de `046` para `gsk-core 0.5.0`.
- Eliminadas referencias transicionales de activacion (`040 -> 041`) en `01_paradigma`.
- Alineada gobernanza de tareas al master activo `039`.

### 1.7 - 2026-03-04
- Se formaliza la **Regla de síntesis mandatoria de nombres** (Fase 4 de Bug 019) para garantizar datos de nombre de pila atómicos.
- Soporte para **Metadatos de Nombres** (Issue 020): `NPFX`, `NSFX`, `TITL` vía `person.name.prefix`, `person.name.suffix`, `person.name.title`.
- Documentada la inferencia heurística de metadatos honoríficos y académicos desde cadenas `NAME` crudas.

### 1.6 - 2026-03-03
- Cierre de huecos de consistencia wiki-runtime post `0.4.0` sin bump de schema.
- `07_error_catalog` ampliado a cobertura total (GSK import/validacion + GED parser/serializer).
- `02_formato` ahora explicita matriz por modo para `JOURNAL_HASH_MISMATCH` y precedencia de validacion.
- `03_modelo` delega catalogo de operaciones a fuente unica `04_operaciones`.
- Se formaliza gate anti-drift con tests de paridad docs-runtime.

### 1.5 - 2026-03-03
- Nuevo capitulo `07_error_catalog`.
- Actualizacion de contrato a schema `0.4.0`.
- Sincronizacion docs con integridad completa, modo audit y defaults GEDCOM conservadores.

### 1.4 - 2026-03-03
- Enlaces internos normalizados a rutas relativas.
- Separacion estricta de alcance de changelogs.
- Alineacion contrato wiki <-> engine para recovery incremental.

### 1.3 - 2026-03-02
- Estructura de renderer GFM consolidada.

## Navegacion
[<- Anterior: 06_versionado_y_migraciones](./06_versionado_y_migraciones.md) | [Siguiente: glosario ->](./glosario.md)
