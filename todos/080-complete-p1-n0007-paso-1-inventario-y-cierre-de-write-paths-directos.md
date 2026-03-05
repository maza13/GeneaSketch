---
status: "complete"
priority: "p1"
issue_id: "080"
title: "n0007-paso-1-inventario-y-cierre-de-write-paths-directos"
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
commit_message: "chore(todos): close issue 080 n0007-paso-1-inventario-y-cierre-de-write-paths-directos"
closed_at: "2026-03-05"
---



# N0007 Paso 1: inventario y cierre de write paths directos

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

- Ejecutar barrido en `src/` para detectar mutaciones directas de nodos/aristas/claims fuera de API oficial.
- Construir inventario con ruta, tipo de mutacion y flujo funcional afectado.
- Clasificar cada hallazgo en: `eliminar`, `redirigir a API oficial`, `guardrail temporal`.
- Dejar lista cerrada para que TODO 081 implemente las redirecciones.

## Recommended Action

Cerrar este paso con un inventario utilizable para implementar cambios sin redescubrir casos.

## User Action Required (Only if unavoidable)

Leave this section empty unless the task truly requires user intervention.

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] Existe inventario de write paths directos con evidencia de busqueda
- [ ] Cada write path tiene decision tecnica asignada
- [ ] No quedan casos sin clasificar en alcance de edicion de notas
- [ ] Trazabilidad `note:N0007` y evidencia en Work Log

## Work Log

Chronological execution history.

### 2026-03-05 - Inicio de ejecucion e inventario inicial

**By:** Codex / Developer

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Ejecutado barrido de referencias sobre write paths potenciales en `src/state`, `src/ui`, `src/hooks`, `src/core/edit`.
- Confirmado write path directo en `src/state/slices/docSlice.ts` para `updateNoteRecord` con mutacion de nodo GSchema.
- Generado inventario inicial con clasificacion de hallazgos para preparar implementacion del TODO 081.

**Evidence:**
- Command: `rg -n "gschemaGraph\.node\(|\.node\(graphUid\)|\.node\(" src/state src/ui src/hooks`
- Result: Se detecto ruta relevante en `src/state/slices/docSlice.ts:190`.
- Command: `rg -n "\(node as any\)\.text|\.text\s*=\s*text|updateNoteRecord\s*:\s*\(" src`
- Result: Confirmado write path directo en `src/state/slices/docSlice.ts:192`; ruta legacy adicional en `src/core/edit/commands.ts:695`.
- Artifacts/paths: `docs/archive/n0007-write-path-inventory-2026-03-05.md`

### 2026-03-05 - Cierre de clasificacion

**By:** Codex / Developer

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Cerrada clasificacion para alcance de edicion de notas:
  - `WP-001` (`docSlice.updateNoteRecord`) => `redirigir a API oficial`.
  - `WP-002` (`core/edit/commands.updateNoteRecord`) => `guardrail temporal` por ruta legacy document-centric.
- Confirmado que en scope `state/ui/hooks` no existen otros write paths directos de nodos GSchema para notas.

**Evidence:**
- Command: `rg -n "_nodes\\.|_edges\\.|_claims\\.|\\(node as any\\)|gschemaGraph\\.node\\(|updateNoteRecord\\(" src`
- Result: Hallazgos acotados a `docSlice` (riesgo activo) y `commands` legacy (riesgo controlado por scope).
- Artifacts/paths: `docs/archive/n0007-write-path-inventory-2026-03-05.md`

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
- Inventario y clasificacion de write paths de notas completado; riesgo principal identificado y acotado para implementacion en 081
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/080-complete-p1-n0007-paso-1-inventario-y-cierre-de-write-paths-directos.md

**Next Recommendation (generated at closure):**
- There are direct dependent tasks, but they are still blocked.
- Example: 079 (p1) waits for: 081, 082.
