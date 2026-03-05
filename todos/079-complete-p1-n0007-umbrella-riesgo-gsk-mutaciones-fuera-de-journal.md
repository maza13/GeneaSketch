---
complexity: "complex"
title: "n0007-umbrella-riesgo-gsk-mutaciones-fuera-de-journal"
tags: ["notes", "note:N0007"]
created_at: "2026-03-05"
updated_at: "2026-03-05"
auto_closure: false
closed_at: "2026-03-05"
commit_confirmed: false
commit_message: null
dependencies: ["080", "081", "082"]
estimated_effort: "m"
issue_id: "079"
owner: "codex"
priority: "p1"
risk_level: "medium"
status: "complete"
target_date: null
---


# N0007 umbrella Riesgo GSK: mutaciones fuera de journal

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

- Paso 1: Inventario y cierre de write paths directos.
  - Ejecutar barrido de mutaciones fuera de API publica en slices/hooks/servicios.
  - Clasificar cada hallazgo como: `eliminar`, `redirigir a API oficial`, `dejar temporalmente con guardrail`.
  - Criterio: lista cerrada de write paths y decision tecnica por cada uno.
- Paso 2: Ruta oficial journalizada para mutaciones de nota.
  - Implementar/usar metodo publico del engine para `updateNoteRecord` (sin acceso a internals privados).
  - Reemplazar mutacion directa en `docSlice` y flujos UI equivalentes.
  - Criterio: toda edicion de nota relevante pasa por una ruta que registra operacion en journal.
- Paso 3: Blindaje de contrato y regresion.
  - Test de contrato: cada mutacion persistida incrementa `journalLength` o deja op verificable.
  - Test de regresion para `updateNoteRecord` y para invalidez de cache de proyeccion (`graphId:journalLength`).
  - Criterio: `gschema.strict` y `gschema.regression` en verde, sin excepciones nuevas.

## Recommended Action

Coordinar tres pasos hijos (inventario, ruta oficial, blindaje), validar gates y cerrar umbrella al final.

## User Action Required (Only if unavoidable)

Leave this section empty unless the task truly requires user intervention.

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] TODO 080 cerrado con inventario completo y decision por write path
- [ ] TODO 081 cerrado con write path de notas migrado a API oficial journalizada
- [ ] TODO 082 cerrado con tests de contrato/regresion verdes
- [ ] Trazabilidad `note:N0007` preservada en todos los hijos

## Work Log

Chronological execution history.

### 2026-03-05 - Cierre de umbrella por cumplimiento de hijos

**By:** Codex / Developer

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Verificado cierre de dependencias hijas:
  - `080` inventario y clasificacion de write paths.
  - `081` ruta oficial journalizada para notas.
  - `082` blindaje de contrato/regresion y cache.
- Confirmado reemplazo de mutacion directa de nota en `docSlice`.

**Evidence:**
- Command: `npx vitest run src/tests/gschema.mutations.test.ts src/tests/read-model.selectors.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.regression.test.ts`
- Result: `32 passed`.
- Artifacts/paths:
  - `todos/080-complete-p1-n0007-paso-1-inventario-y-cierre-de-write-paths-directos.md`
  - `todos/081-complete-p1-n0007-paso-2-ruta-oficial-journalizada-notas.md`
  - `todos/082-complete-p1-n0007-paso-3-blindaje-contrato-regresion.md`

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
