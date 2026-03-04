---
status: complete
priority: p1
issue_id: "035"
tags: [gschema, docs, strict-lossless-audit, integrity]
dependencies: ["034"]
---

# Consistencia de Matriz por Modo en 02_formato

## Problem Statement

La matriz de recuperacion de `02_formato.md` no distingue claramente `strict-lossless-audit` para journal inconsistente, lo que contradice reglas normativas del mismo documento y del runtime.

## Findings

- La narrativa indica que `strict-lossless-audit` trata `JOURNAL_HASH_MISMATCH` como critico.
- La matriz resumida aun sugiere comportamiento generico con warning para journal inconsistente.
- Falta declarar precedencia de validacion de integridad en la wiki.

## Proposed Solutions

### Option 1: matriz explicita por modo + precedencia normativa (Recommended)

**Approach:** reescribir matriz por `compat/strict/audit` y documentar orden de evaluacion de integridad.

**Effort:** Bajo
**Risk:** Bajo

## Recommended Action

Actualizar `02_formato.md` y `07_error_catalog.md` para que reglas y matriz sean equivalentes al comportamiento probado en runtime.

## Technical Details

**Affected files:**
- `docs/wiki-gsk/02_formato.md`
- `docs/wiki-gsk/07_error_catalog.md`
- `src/tests/gschema.strict-audit.test.ts`
- `src/tests/gschema.strict.test.ts`

## Acceptance Criteria

- [x] No hay contradicciones entre narrativa y matriz por modo.
- [x] `strict-lossless-audit` deja explicitamente critico `JOURNAL_HASH_MISMATCH` con journal presente.
- [x] Precedencia de validacion documentada y verificable.
- [x] Tests de strict/audit e integridad pasan en verde.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Registrada inconsistencia de matriz en `02_formato`.
- Definido alcance de correccion documental y pruebas de modo.

**Learnings:**
- Una matriz resumida no segmentada por modo genera ambiguedad operacional.

---

### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- Se reescribio la matriz de `docs/wiki-gsk/02_formato.md` con comportamiento explicito por modo.
- Se documento la precedencia de validacion:
  - `packageHash -> hashes de artefacto -> validacion estructural`.
- Se verifico coherencia con catalogo:
  - `docs/wiki-gsk/07_error_catalog.md`
- Verificacion ejecutada:
  - `npx vitest run src/tests/gschema.strict-audit.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.package-integrity.test.ts`

**Results:**
- Matriz y narrativa quedaron consistentes con runtime.
- `strict-lossless-audit` queda explicitamente critico ante journal inconsistente.
- Suite strict/audit/integridad en verde.

**Learnings:**
- Documentar el orden de validacion evita interpretaciones ambiguas en implementaciones futuras.

