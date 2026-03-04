---
status: complete
priority: p1
issue_id: "032"
tags: [gschema, migration, schema-040, fixtures]
dependencies: ["024", "025", "026", "027", "028", "029", "030", "031"]
---

# Migracion a `schemaVersion 0.4.0` + Fixtures Canonicos

## Problem Statement

Las mejoras 019-028 alteran contrato de manifest/integridad/modos; se requiere migracion formal sin ruptura para `0.3.x`.

## Findings

- `schemaVersion` actual es `0.3.1`.
- Hay fixtures y ejemplos canonicos que deben regenerarse y mantenerse deterministas.

## Proposed Solutions

### Option 1: migrador explicito `0.3.x -> 0.4.0` (Recommended)

**Approach:** version bump + lectura legacy + export nuevo contrato + fixtures actualizados.

**Effort:** Medio-Alto  
**Risk:** Medio

## Recommended Action

Actualizar version de schema, implementar migracion de manifest/integridad y regenerar ejemplos canonicos.

## Technical Details

**Affected files:**
- `src/core/gschema/GSchemaGraph.ts`
- `src/core/gschema/GskPackage.ts`
- `src/core/gschema/LegacyMigrator.ts`
- `docs/wiki-gsk/ejemplos/*`
- `src/tests/gschema.migration-040.test.ts` (nuevo)

## Acceptance Criteria

- [x] Paquetes 0.3.x cargan via migracion controlada.
- [x] Export nuevo emite contrato 0.4.0.
- [x] Fixtures canonicos se regeneran deterministicamente.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Se definio esta fase como consolidacion tecnica de compatibilidad.

**Learnings:**
- Este issue debe ejecutarse despues de cerrar todas las piezas contractuales previas.



### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- Schema 0.4.0 y ruta de compatibilidad 0.3.x cubiertas con tests/fixtures.
- Se actualizaron codigo, pruebas y documentacion asociada al issue.
- Se ejecuto validacion tecnica con vitest y checks de enlaces wiki.

**Results:**
- Acceptance criteria completados y verificados en esta iteracion.
- Estado del issue actualizado a complete.

**Learnings:**
- La trazabilidad por tarea reduce drift entre contrato wiki y runtime.


