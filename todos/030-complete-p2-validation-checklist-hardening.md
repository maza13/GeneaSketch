---
status: complete
priority: p2
issue_id: "030"
tags: [gschema, validation, invariants, strict]
dependencies: ["023", "027", "029"]
---

# Checklist Normativo de Validacion Estructural

## Problem Statement

Hay invariantes que se asumen implÃ­citamente y no siempre se validan con codigo especÃ­fico.

## Findings

- Falta check explicito bucket-claim (`claims[nodeUid][predicate]` vs claim interno).
- Falta check generalizado de edges activos apuntando a nodos soft-deleted.
- No todos los casos tienen remediation documentada.

## Proposed Solutions

### Option 1: ampliar validator + codigos nuevos (Recommended)

**Approach:** aÃ±adir reglas y cÃ³digos dedicados en validator + catÃ¡logo.

**Effort:** Medio  
**Risk:** Bajo

## Recommended Action

Agregar validaciones faltantes y documentarlas como checklist normativo.

## Technical Details

**Affected files:**
- `src/core/gschema/validation.ts`
- `src/core/gschema/errorCatalog.ts`
- `src/tests/gschema.validation-hardening.test.ts` (nuevo)
- `docs/wiki-gsk/03_modelo.md`

## Acceptance Criteria

- [x] Bucket-claim mismatch detectado con codigo dedicado.
- [x] Edges activos hacia nodos soft-deleted detectados.
- [x] Reglas nuevas documentadas en wiki/catalogo.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Se inventariaron invariantes pendientes de formalizacion.

**Learnings:**
- Invariante no codificado termina en drift de runtime y UX.



### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- Validaciones estructurales nuevas incorporadas (bucket claims y soft-delete refs).
- Se actualizaron codigo, pruebas y documentacion asociada al issue.
- Se ejecuto validacion tecnica con vitest y checks de enlaces wiki.

**Results:**
- Acceptance criteria completados y verificados en esta iteracion.
- Estado del issue actualizado a complete.

**Learnings:**
- La trazabilidad por tarea reduce drift entre contrato wiki y runtime.


