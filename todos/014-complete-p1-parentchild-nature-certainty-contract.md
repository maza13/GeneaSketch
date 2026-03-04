---
status: complete
priority: p1
issue_id: "014"
tags: [gschema, parentchild, lossless, gedcom]
dependencies: ["013"]
---

# ParentChild Nature + Certainty Contract

## Problem Statement

Aunque `nature` y `certainty` existen en `ParentChild`, faltaba cerrar su obligatoriedad contractual y el mapeo GEDCOM bidireccional para evitar perdida semantica en roundtrip.

## Findings

- `nature` y `certainty` ya existian en `types.ts`.
- Bridge import mapeaba parcialmente `PEDI -> nature`.
- Export GEDCOM no serializaba `FAMC` con `PEDI/QUAY` estructurado (solo warning `GED_PEDI_STRUCT_DROPPED`).

## Proposed Solutions

### Option 1: Contrato cerrado y mapeo explicito (Recommended)
- `nature` obligatorio: `BIO|ADO|FOS|STE|SEAL|UNK`.
- `certainty` obligatorio: `high|medium|low|uncertain`.
- Mapeo `PEDI/QUAY` de ida y vuelta con degradacion explicita para `STE`.

**Effort:** Medio  
**Risk:** Bajo-Medio

### Option 2: Mantener estado previo
- Sin endurecer contrato ni cerrar serializacion GEDCOM estructurada.

**Effort:** Bajo  
**Risk:** Alto

## Recommended Action

Aplicar Option 1 y cubrir con tests de import, export, degradacion y roundtrip.

## Acceptance Criteria

- [x] `nature` y `certainty` definidos como canonicos obligatorios en docs y validacion.
- [x] Mapeo GEDCOM (`PEDI` <-> `nature`, `QUAY` <-> `certainty`) documentado y probado.
- [x] Degradacion explicita para `STE` en export con warning.
- [x] Tests roundtrip pasando para relaciones no biologicas y desconocidas.

## Work Log

### 2026-03-03 - Creacion del TODO fase core

**By:** Codex

**Actions:**
- Definida fase contractual de semantica parent-child.
- Dependencia establecida sobre issue 013.

### 2026-03-03 - Implementacion Fase 014 cerrada

**By:** Codex

**Actions:**
- Bridge (`GedcomBridge`) endurecido con mapeos canonicos:
  - Import: `PEDI -> nature`, `QUAY -> certainty`, default `PEDI` ausente => `BIO`.
  - Export: `nature/certainty -> famcLinks (PEDI/QUAY)`.
- Serializer GEDCOM actualizado para emitir `FAMC` con subestructura `PEDI/QUAY` usando `famcLinks`.
- Parser GEDCOM actualizado con warning `PEDI_UNKNOWN_VALUE_COERCED` para valores PEDI no reconocidos.
- Validacion estructural ampliada con:
  - `PARENT_CHILD_MISSING_NATURE`
  - `PARENT_CHILD_INVALID_NATURE`
  - `PARENT_CHILD_MISSING_CERTAINTY`
  - `PARENT_CHILD_INVALID_CERTAINTY`
- Degradacion explicita de `STE` a `PEDI UNKNOWN` con warning `PEDI_STE_DEGRADED_TO_UNKNOWN`.
- Wiki sincronizada en `03_modelo.md` y `05_interoperabilidad_gedcom.md`.
- Tests agregados/actualizados en `gedcom.test.ts` y `gschema.strict.test.ts`.

