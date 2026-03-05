---
status: "complete"
priority: "p1"
issue_id: "081"
title: "n0007-paso-2-ruta-oficial-journalizada-notas"
tags: ["notes", "note:N0007"]
dependencies: []
owner: "codex"
created_at: "2026-03-05"
updated_at: "2026-03-05"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: false
commit_confirmed: false
commit_message: "chore(todos): close issue 081 n0007-paso-2-ruta-oficial-journalizada-notas"
closed_at: "2026-03-05"
---



# N0007 Paso 2: ruta oficial journalizada para mutaciones de nota

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

- Implementar o exponer metodo publico del engine para editar nota sin tocar internals privados.
- Reemplazar write path directo en `src/state/slices/docSlice.ts` y equivalentes UI.
- Garantizar que la operacion quede journalizada y observable para proyecciones.
- Dejar removido el acceso a rutas privadas para este flujo.

## Recommended Action

Implementar primero el caso de nota y usarlo como patron para futuros writes.

## User Action Required (Only if unavoidable)

Leave this section empty unless the task truly requires user intervention.

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] `updateNoteRecord` (o equivalente oficial) usa solo API publica
- [ ] `docSlice` deja de mutar nodos de forma directa para este flujo
- [ ] Cada mutacion relevante de nota genera op journalizable
- [ ] Work Log incluye paths modificados y comando de verificacion

## Work Log

Chronological execution history.

### 2026-03-05 - Implementacion de ruta oficial journalizada

**By:** Codex / Developer

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Agregada API publica `updateNoteText` en `GSchemaGraph` para mutar texto de nota con journaling.
- Agregado `GraphMutations.updateNoteInGraph` como fachada de uso desde UI/store.
- Reemplazada mutacion directa `(node as any).text = text` en `docSlice.updateNoteRecord`.
- Agregado test de regresion para verificar incremento de journal y persistencia de texto.

**Evidence:**
- Command: `npx vitest run src/tests/gschema.mutations.test.ts`
- Result: 4 tests passing, incluyendo caso `updateNoteInGraph journals note text changes`.
- Command: `npm run check:gschema:internals`
- Result: SUCCESS sin accesos no autorizados a internals.
- Artifacts/paths:
  - `src/core/gschema/GSchemaGraph.ts`
  - `src/core/gschema/GraphMutations.ts`
  - `src/state/slices/docSlice.ts`
  - `src/tests/gschema.mutations.test.ts`

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

### 2026-03-05 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Ruta oficial journalizada para updateNoteRecord implementada y verificada con test de mutacion
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/081-complete-p1-n0007-paso-2-ruta-oficial-journalizada-notas.md

**Next Recommendation (generated at closure):**
- There are direct dependent tasks, but they are still blocked.
- Example: 079 (p1) waits for: 082.
