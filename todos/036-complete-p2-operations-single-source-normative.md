---
status: complete
priority: p2
issue_id: "036"
tags: [gschema, operations, docs, parity]
dependencies: []
---

# Fuente Unica de Contrato de Operaciones

## Problem Statement

El contrato de operaciones aparece en `03_modelo.md` y `04_operaciones.md` con distinto nivel de detalle, lo que puede generar divergencia cuando evolucionen tipos en `types.ts`.

## Findings

- `04_operaciones.md` ya contiene el listado completo operativo.
- `03_modelo.md` mantiene un listado resumido que puede quedar desactualizado.
- No existe test de paridad entre `types.ts` y wiki de operaciones.

## Proposed Solutions

### Option 1: consolidar fuente normativa en capitulo 04 + test de paridad (Recommended)

**Approach:** dejar `04` como tabla canonica y convertir `03` en referencia, agregando test que compare operaciones documentadas vs tipos.

**Effort:** Bajo
**Risk:** Bajo

## Recommended Action

Ajustar documentos para fuente unica y agregar test de paridad wiki-runtime de operaciones.

## Technical Details

**Affected files:**
- `docs/wiki-gsk/03_modelo.md`
- `docs/wiki-gsk/04_operaciones.md`
- `src/core/gschema/types.ts`
- `src/tests/wiki.gschema-operations-parity.test.ts`

## Acceptance Criteria

- [x] `03_modelo` no compite con `04_operaciones` como fuente de lista canonica.
- [x] `04_operaciones` mantiene lista completa vigente.
- [x] Test de paridad rompe ante diferencias tipos vs docs.
- [x] Suite asociada pasa en verde.

## Work Log

### 2026-03-03 - Apertura de tarea

**By:** Codex

**Actions:**
- Definida consolidacion documental del contrato de operaciones.
- Delimitado test automatizado de paridad para evitar drift futuro.

**Learnings:**
- La redundancia de listas entre capitulos eleva riesgo de desalineacion.

---

### 2026-03-03 - Cierre de implementacion

**By:** Codex

**Actions:**
- `docs/wiki-gsk/03_modelo.md` se ajusto para referenciar a `04_operaciones` como fuente unica de opcodes.
- `docs/wiki-gsk/04_operaciones.md` incluye regla explicita de fuente normativa unica.
- Se agrego test de paridad:
  - `src/tests/wiki.gschema-operations-parity.test.ts`
- Verificacion ejecutada:
  - `npx vitest run src/tests/wiki.gschema-operations-parity.test.ts src/tests/gschema.compat-repair.test.ts`

**Results:**
- Operaciones documentadas quedan gobernadas por un solo capitulo.
- Cualquier drift entre `types.ts` y wiki ahora rompe test.
- Suite de paridad de operaciones en verde.

**Learnings:**
- Convertir referencias cruzadas en contratos unicos simplifica mantenimiento y auditoria.

