---
status: complete
priority: p3
issue_id: "031"
tags: [gedcom, chunking, utf8, compatibility]
dependencies: ["023"]
---

# Chunking GEDCOM Normativo (Umbral Explicito)

## Problem Statement

La wiki indica chunking por umbral operativo, pero sin fijar claramente criterio de bytes UTF-8 y contrato normativo.

## Findings

- Serializer usa limite fijo en caracteres (`MAX_LEN`), no bytes UTF-8.
- Riesgo con texto multibyte y parsers legacy.

## Proposed Solutions

### Option 1: umbral normativo por bytes UTF-8 (Recommended)

**Approach:** exponer constante `GEDCOM_CHUNK_MAX_BYTES=180`, fragmentar por bytes y documentar.

**Effort:** Medio  
**Risk:** Bajo

## Recommended Action

Implementar chunking byte-based deterministic y tests de reconstruccion exacta.

## Technical Details

**Affected files:**
- `src/core/gedcom/serializer.ts`
- `src/tests/gedcom.chunking.test.ts` (nuevo)
- `docs/wiki-gsk/05_interoperabilidad_gedcom.md`

## Acceptance Criteria

- [x] Chunking usa bytes UTF-8, no `string.length`.
- [x] Payload reconstruible byte-perfect con `CONC`.
- [x] Umbral documentado normativamente.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Se definio gap entre implementacion actual y criterio normativo.

**Learnings:**
- Las pruebas con caracteres multibyte son obligatorias para este cambio.



### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- Chunking GEDCOM por bytes UTF-8 con umbral normativo implementado.
- Se actualizaron codigo, pruebas y documentacion asociada al issue.
- Se ejecuto validacion tecnica con vitest y checks de enlaces wiki.

**Results:**
- Acceptance criteria completados y verificados en esta iteracion.
- Estado del issue actualizado a complete.

**Learnings:**
- La trazabilidad por tarea reduce drift entre contrato wiki y runtime.


