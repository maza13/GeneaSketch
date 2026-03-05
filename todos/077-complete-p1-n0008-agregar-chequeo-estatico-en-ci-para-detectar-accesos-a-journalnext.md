---
status: "complete"
priority: "p1"
issue_id: "077"
title: "n0008-agregar-chequeo-estatico-en-ci-para-detectar-accesos-a-journalnext"
tags: ["notes", "note:N0008"]
dependencies: []
owner: "codex"
created_at: "2026-03-05"
updated_at: "2026-03-05"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: true
commit_message: "chore(gschema): implement static analysis for internal encapsulation satisfying Todo 077"
closed_at: "2026-03-05"
---



# N0008 Agregar chequeo estatico en CI para detectar accesos a `_journal`/`_nextOpSeq` fuera de mo

One sentence describing the desired outcome.

## Problem Statement

En el flujo de import existen accesos directos a internals (`_journal`, `_nextOpSeq`) mediante casts estructurales para registrar `INITIAL_IMPORT`. Tambien hay capa de replay/aplicacion que opera sobre internals de `GSchemaGraph`.

Aunque funciona hoy, este patron evita la API publica del engine y acopla comportamiento a la representacion interna concreta del grafo.

## Findings

El riesgo principal es de mantenibilidad y seguridad de contrato:

- Refactors del engine (por ejemplo para branches/changesets o politicas nuevas de opSeq) pueden romper import/replay sin errores obvios de compilacion.
- Se dificulta garantizar invariantes transversales (updatedAt, monotonia opSeq, hooks de validacion).
- Se incrementa la probabilidad de deuda circular: nuevas features tendran que conocer internals en vez de depender de API estable.

## Proposed Solutions

- Exponer metodo publico explicito para `INITIAL_IMPORT` (sin acceso a `_journal`/`_nextOpSeq`).
- Encapsular apply/replay de journal en API oficial del engine (o facade interna controlada) y reducir casts a una frontera unica.
- Agregar chequeo estatico en CI para detectar accesos a `_journal`/`_nextOpSeq` fuera de modulos autorizados.
- Reforzar tests de monotonia/gap-less `opSeq` en import, replay y fast-forward.
- Definir criterio de salida:
  - no hay escrituras a internals privados fuera de la frontera autorizada.
  - import/replay operan por API estable.
  - suite gschema strict/golden/regression pasa sin bypasses.

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
- [ ] Traceability linked to note N0008

## Work Log

Chronological execution history.

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

- Source note: N0008
- Promotion mode: complex

### 2026-03-05 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Implemented static analysis check for GSchemaGraph internals and integrated it into package.json.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/077-complete-p1-n0008-agregar-chequeo-estatico-en-ci-para-detectar-accesos-a-journalnext.md

**Next Recommendation (generated at closure):**
- There are direct dependent tasks, but they are still blocked.
- Example: 074 (p1) waits for: 078.
