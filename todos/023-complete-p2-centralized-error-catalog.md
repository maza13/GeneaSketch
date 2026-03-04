---
status: complete
priority: p2
issue_id: "023"
tags: [gschema, errors, docs, validation]
dependencies: ["022"]
---

# Catalogo Centralizado de Errores

## Problem Statement

Los codigos de error existen en multiples modulos y documentos, sin tabla normativa unica.

## Findings

- Hay codigos en `validation.ts`, `GskPackage.ts`, parser/serializer GEDCOM.
- Falta mapeo formal `code -> condicion -> severidad por modo -> accion -> remediation`.
- Esto complica UX consistente y soporte tecnico.

## Proposed Solutions

### Option 1: Catalogo tipado unico (Recommended)

**Approach:** crear `errorCatalog.ts` y consumirlo en runtime + wiki.

**Effort:** Medio  
**Risk:** Bajo

### Option 2: Mantener codigos distribuidos

**Effort:** Bajo  
**Risk:** Alto

## Recommended Action

Centralizar codigos y severidades por modo, generar referencia wiki `07_error_catalog.md`.

## Technical Details

**Affected files:**
- `src/core/gschema/errorCatalog.ts` (nuevo)
- `src/core/gschema/validation.ts`
- `src/core/gschema/GskPackage.ts`
- `src/core/gedcom/parser.ts`
- `src/core/gedcom/serializer.ts`
- `docs/wiki-gsk/07_error_catalog.md` (nuevo)
- `docs/wiki-gsk/README.md`

## Acceptance Criteria

- [x] Todos los codigos activos tienen entrada en el catalogo.
- [x] No quedan strings de codigo sin referencia catalogada.
- [x] Wiki contiene tabla unica y enlazada.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Se definio esta tarea como base transversal para hardening.

**Learnings:**
- La trazabilidad de errores es prerequisito para strict/compat/audit.



### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- Catalogo centralizado de errores agregado y referenciado en import/integridad.
- Se actualizaron codigo, pruebas y documentacion asociada al issue.
- Se ejecuto validacion tecnica con vitest y checks de enlaces wiki.

**Results:**
- Acceptance criteria completados y verificados en esta iteracion.
- Estado del issue actualizado a complete.

**Learnings:**
- La trazabilidad por tarea reduce drift entre contrato wiki y runtime.


