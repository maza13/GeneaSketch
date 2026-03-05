---
complexity: "complex"
title: "n0009-cerrar-n0007-asegurar-write-path-journal-only-para-evitar-estado-f"
tags: ["notes", "note:N0009"]
created_at: "2026-03-05"
updated_at: "2026-03-05"
auto_closure: false
closed_at: "2026-03-05"
commit_confirmed: false
commit_message: "feat(core): enforce journal-only write path for GSchemaGraph (TODO 085)"
dependencies: []
estimated_effort: "l"
issue_id: "085"
owner: "codex"
priority: "p2"
risk_level: "medium"
status: "complete"
target_date: null
---


# N0009 Cerrar N0007: asegurar write-path journal-only para evitar estado fuera de opSeq.

One sentence describing the desired outcome.

## Problem Statement

La UI principal consume proyeccion legacy (`gschemaToDocument`) para mantener compatibilidad. Esta capa alimenta slices/selectores de uso transversal y reduce friccion de migracion, pero abstrae detalles nativos de claims.

El costo de esta estrategia aparece al intentar evolucionar capacidades nativas:
- versionado por operaciones (branch/review/merge a nivel op/claim),
- evidencia estricta (citations/evidenceGate visibles y editables),
- trazabilidad fina por claim.

## Findings

El riesgo es de arquitectura incremental: si la UI sigue acoplada demasiado tiempo al modelo legacy, cada feature avanzada requerira puentes de conversion adicionales.

Esto no bloquea la version 0.5.0, pero si eleva el costo de evolucion en N0002/N0003. Por eso N0009 depende explicitamente de N0008 (encapsulacion) y N0007 (journal-only writes) antes de una migracion UI amplia.

## Proposed Solutions

- Cerrar N0008: exponer API publica para registrar INITIAL_IMPORT y eliminar acceso a internals privados.
- Cerrar N0007: asegurar write-path journal-only para evitar estado fuera de opSeq.
- Definir read-model GSchema directo minimo para paneles clave (persona, familia, timeline), en paralelo con proyeccion legacy.
- Implementar migracion por fases con feature flag:
  - fase 1: lectura nativa en panel de detalle de persona,
  - fase 2: timeline/relaciones con claims/citations,
  - fase 3: retiro gradual de acoplamiento legacy en rutas criticas.
- Criterio de salida:
  - 0 mutaciones directas sin journal en flujos UI cubiertos,
  - cobertura funcional de claims/citations/evidenceGate en paneles migrados,
  - paridad de comportamiento validada por tests de regresion UI + gschema/merge.

## Recommended Action

Execute implementation end-to-end and close with automated commit.

## User Action Required (Only if unavoidable)

Leave this section empty unless the task truly requires user intervention.

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] Core result is implemented
- [ ] Verification executed
- [ ] Work log updated
- [ ] Traceability linked to note N0009

## Work Log

Chronological execution history.

### 2026-03-05 - Triage to ready

**By:** Antigravity

**Status Transition:**
- from: pending
- to: ready

**Actions:**
- Moved to ready status per user request.

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

- Source note: N0009
- Promotion mode: complex

