---
status: complete
priority: p1
issue_id: "026"
tags: [gschema, import, strict, audit, journal]
dependencies: ["025"]
---

# Modo `strict-lossless-audit`

## Problem Statement

`strict-lossless` permite continuar con snapshot aunque falle hash del journal, lo que reduce confiabilidad de auditoria.

## Findings

- El comportamiento actual marca warning para `journalHash` inconsistente.
- No hay modo explicito para exigir journal verificable cuando existe.

## Proposed Solutions

### Option 1: nuevo modo `strict-lossless-audit` (Recommended)

**Approach:** incorporar politica de carga con `mode` y endurecer journal en modo audit.

**Effort:** Medio  
**Risk:** Bajo

## Recommended Action

Extender import con `mode: strict-lossless | strict-lossless-audit | compat` y hacer critico journal invalido en `strict-lossless-audit`.

## Technical Details

**Affected files:**
- `src/core/gschema/GskPackage.ts`
- `src/types/domain.ts` (si se expone opcion en capa superior)
- `src/tests/gschema.strict-audit.test.ts` (nuevo)

## Acceptance Criteria

- [x] `strict-lossless-audit` rechaza journal inconsistente.
- [x] `strict-lossless` conserva comportamiento legacy.
- [x] `compat` mantiene warning y continuidad.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Se definio matriz esperada por modo para journal inconsistente.

**Learnings:**
- Separar perfil de uso casual vs preservacion evita romper compat existente.



### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- Modo strict-lossless-audit incorporado con journal invalido critico.
- Se actualizaron codigo, pruebas y documentacion asociada al issue.
- Se ejecuto validacion tecnica con vitest y checks de enlaces wiki.

**Results:**
- Acceptance criteria completados y verificados en esta iteracion.
- Estado del issue actualizado a complete.

**Learnings:**
- La trazabilidad por tarea reduce drift entre contrato wiki y runtime.


