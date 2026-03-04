---
status: complete
priority: p2
issue_id: "029"
tags: [gedcom, bridge, defaults, provenance]
dependencies: ["023"]
---

# Defaults GEDCOM Conservadores + Provenance

## Problem Statement

Defaults actuales (`PEDI` ausente => BIO, `QUAY` ausente => high) pueden afirmar mas de lo evidenciado.

## Findings

- Bridge hoy favorece defaults optimistas.
- Falta traza explicita cuando se aplican defaults por ausencia.

## Proposed Solutions

### Option 1: default conservador + politica configurable (Recommended)

**Approach:** default a `UNK/uncertain`, warnings y metadata de asuncion, con opcion legacy.

**Effort:** Medio  
**Risk:** Medio

## Recommended Action

Implementar `gedcomDefaultPolicy` configurable (`conservative` por defecto) y registrar asunciones en metadata/provenance.

## Technical Details

**Affected files:**
- `src/core/gschema/GedcomBridge.ts`
- `src/core/gedcom/parser.ts`
- `src/tests/gedcom.defaults-conservative.test.ts` (nuevo)
- `docs/wiki-gsk/05_interoperabilidad_gedcom.md`

## Acceptance Criteria

- [x] `PEDI/QUAY` ausentes no elevan naturaleza/certeza por defecto.
- [x] Se emiten warnings trazables por default aplicado.
- [x] Existe switch para politica legacy agresiva.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Se definio cambio de defaults y necesidad de compatibilidad opt-in legacy.

**Learnings:**
- En genealogia incompleta, defaults conservadores reducen sobreafirmacion.



### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- Defaults GEDCOM conservadores y trazabilidad de asunciones implementados.
- Se actualizaron codigo, pruebas y documentacion asociada al issue.
- Se ejecuto validacion tecnica con vitest y checks de enlaces wiki.

**Results:**
- Acceptance criteria completados y verificados en esta iteracion.
- Estado del issue actualizado a complete.

**Learnings:**
- La trazabilidad por tarea reduce drift entre contrato wiki y runtime.


