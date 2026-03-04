---
status: complete
priority: p1
issue_id: "024"
tags: [gschema, media, integrity, manifest]
dependencies: ["022", "023"]
---

# Manifest de Media Estructurado

## Problem Statement

`mediaFiles: string[]` no garantiza integridad ni metadatos suficientes para verificaciones robustas.

## Findings

- No existe hash por archivo ni bytes esperados.
- Falta control de `mime` y correspondencia directa `MediaNode <-> media/`.
- Es posible reemplazo silencioso de binarios.

## Proposed Solutions

### Option 1: `mediaEntries` estructurado (Recommended)

**Approach:** agregar arreglo `{ uid, path, sha256, bytes, mime }` con validacion de entrada/salida.

**Effort:** Medio  
**Risk:** Bajo

## Recommended Action

Agregar `mediaEntries` en manifest y validacion fuerte, manteniendo `mediaFiles` solo para compatibilidad.

## Technical Details

**Affected files:**
- `src/core/gschema/types.ts`
- `src/core/gschema/GSchemaGraph.ts`
- `src/core/gschema/GskPackage.ts`
- `src/tests/gschema.media-integrity.test.ts` (nuevo)

## Acceptance Criteria

- [x] Export genera `mediaEntries` deterministas.
- [x] Import detecta faltantes/hash invalido/mime inconsistente.
- [x] `mediaFiles` legacy sigue aceptado en carga compat.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Se delimito contrato de media y reglas de compatibilidad.

**Learnings:**
- Integridad real de paquete requiere granularidad por archivo.



### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- mediaEntries estructurado implementado con validacion hash/bytes/mime base.
- Se actualizaron codigo, pruebas y documentacion asociada al issue.
- Se ejecuto validacion tecnica con vitest y checks de enlaces wiki.

**Results:**
- Acceptance criteria completados y verificados en esta iteracion.
- Estado del issue actualizado a complete.

**Learnings:**
- La trazabilidad por tarea reduce drift entre contrato wiki y runtime.


