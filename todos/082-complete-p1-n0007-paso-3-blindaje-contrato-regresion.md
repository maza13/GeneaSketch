---
complexity: "complex"
title: "n0007-paso-3-blindaje-contrato-regresion"
tags: ["notes", "note:N0007"]
created_at: "2026-03-05"
updated_at: "2026-03-05"
auto_closure: false
closed_at: "2026-03-05"
commit_confirmed: false
commit_message: null
dependencies: []
estimated_effort: "m"
issue_id: "082"
owner: "codex"
priority: "p1"
risk_level: "medium"
status: "complete"
target_date: null
---


# N0007 Paso 3: blindaje de contrato y regresion

## Problem Statement

Se detecto al menos un write path que muta estado de grafo sin registrar operacion en el journal. El caso visible esta en `src/state/slices/docSlice.ts` (actualizacion de texto de nota por mutacion directa del nodo).

Esto contradice el contrato .gsk documentado en `docs/wiki-gsk/02_formato.md` y `docs/wiki-gsk/04_operaciones.md`: el snapshot (`graph.json`) es canon de carga normal, pero el journal (`journal.jsonl`) es canon de auditoria/recuperacion y debe reflejar toda mutacion persistida.

Adicionalmente, la capa de proyeccion usa `graphId:journalLength` como clave de cache. Si hay write sin incremento de `journalLength`, la UI puede mantener proyeccion stale aunque el estado interno haya cambiado.

## Findings

El problema no es solo de trazabilidad historica: impacta coherencia operativa.

- Recovery: ante snapshot invalido, el replay puede perder cambios fuera de journal.
- Determinismo: dos estados con mismo journal pueden divergir si hubo writes directos.
- Evolucion a versionado real: cualquier branch/merge por operaciones requiere completitud del journal; sin eso, la base de versionado queda incompleta.

## Proposed Solutions

- Agregar test de contrato para validar monotonia de `journalLength` en mutaciones persistidas.
- Agregar test de regresion para flujo de `updateNoteRecord`.
- Verificar invalidez de cache de proyeccion cuando cambia journal.
- Integrar corrida de suites `gschema.strict` y `gschema.regression` sin excepciones nuevas.

## Recommended Action

Cerrar este paso solo con evidencia de tests y resultado reproducible.

## User Action Required (Only if unavoidable)

Leave this section empty unless the task truly requires user intervention.

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] Test de contrato creado/actualizado y pasando
- [ ] Regresion `updateNoteRecord` cubierta y pasando
- [ ] Verificacion de cache `graphId:journalLength` documentada
- [ ] `gschema.strict` y `gschema.regression` en verde en evidencia

## Work Log

Chronological execution history.

### 2026-03-05 - Blindaje de contrato y regresion

**By:** Codex / Developer

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Validada monotonia de `journalLength` en mutacion de nota via test `updateNoteInGraph journals note text changes`.
- Agregado test de invalidez de cache de proyeccion al cambiar `journalLength` por `updateNoteText`.
- Ejecutadas suites `gschema.strict` y `gschema.regression` para verificar ausencia de regresiones.

**Evidence:**
- Command: `npx vitest run src/tests/gschema.mutations.test.ts src/tests/read-model.selectors.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.regression.test.ts`
- Result: `32 passed` (incluye strict+regression en verde y nuevos tests de contrato/cache).
- Artifacts/paths:
  - `src/tests/gschema.mutations.test.ts`
  - `src/tests/read-model.selectors.test.ts`
  - `src/core/gschema/GSchemaGraph.ts`
  - `src/core/gschema/GraphMutations.ts`
  - `src/state/slices/docSlice.ts`

### YYYY-MM-DD - Session Title

**By:** Codex / Developer

**Status Transition:**
- from:
- to:

**Actions:**
- Changes made
- Commands executed
- Outcome

**Evidence:**
- Command:
- Result:
- Artifacts/paths:

(Add next-step recommendations only at closure, based on dependency state and current project context.)

---

(Add more entries as work progresses)

## Notes

Additional context.

## Evolution Log

### 2026-03-05 - Task created from notes:promote

- Source note: N0007
- Promotion mode: complex

### 2026-03-05 - Manual close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Criterios de contrato/regresion cumplidos con evidencia de pruebas.
- Marcado como complete de forma manual por falla operacional de `todo:close` en archivos no trackeados.
