---
status: "complete"
priority: "p1"
issue_id: "075"
title: "n0008-exponer-metodo-publico-explicito-para-initialimport-sin-acceso-a-j"
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
commit_message: "chore(gschema): implement recordInitialImport public api satisfying Todo 075"
closed_at: "2026-03-05"
---



# N0008 Exponer metodo publico explicito para `INITIAL_IMPORT`

Implement a safe public API in `GSchemaGraph` to record initial imports, eliminating direct manipulation of `_journal` and `_nextOpSeq` in `GedcomBridge`.

## Problem Statement

En el flujo de import existen accesos directos a internals (`_journal`, `_nextOpSeq`) mediante casts estructurales para registrar `INITIAL_IMPORT`. Tambien hay capa de replay/aplicacion que opera sobre internals de `GSchemaGraph`.

Aunque funciona hoy, este patron evita la API publica del engine y acopla comportamiento a la representacion interna concreta del grafo.

## Findings

El riesgo principal es de mantenibilidad y seguridad de contrato:

- Refactors del engine pueden romper import/replay sin errores obvios de compilacion.
- Se dificulta garantizar invariantes transversales (updatedAt, monotonia opSeq, hooks de validacion).

## Proposed Solutions

- Exponer metodo publico explicito para `INITIAL_IMPORT` (sin acceso a `_journal`/`_nextOpSeq`).
- Encapsular apply/replay de journal en API oficial del engine.

## Recommended Action

Execute implementation end-to-end and close with automated commit.

## Acceptance Criteria

- [x] `recordInitialImport` implemented in `GSchemaGraph`
- [x] `GedcomBridge` refactored to use public API
- [x] No direct journal manipulation in import flow
- [x] Work log updated
- [x] Traceability linked to note N0008

## Work Log

### 2026-03-05 - Planning and Execution

**By:** Antigravity

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Implemented `recordInitialImport` in `GSchemaGraph.ts`.
- Refactored `GedcomBridge.ts` to use the new API.
- Verified with `gschema.golden.test.ts`.

**Evidence:**
- Command: `npx vitest run src/tests/gschema.golden.test.ts`
- Result: 57 passed.

### 2026-03-05 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Implemented safe recordInitialImport API in GSchemaGraph and refactored GedcomBridge to use it, eliminating direct journal manipulation.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/075-complete-p1-n0008-exponer-metodo-publico-explicito-para-initialimport-sin-acceso-a-j.md

**Next Recommendation (generated at closure):**
- Direct next tasks unblocked by this closure: 076 (p1).
- Recommended start: 076 (p1).

### 2026-03-05 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Implemented safe recordInitialImport API in GSchemaGraph and refactored GedcomBridge to use it, eliminating direct journal manipulation.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/075-complete-p1-n0008-exponer-metodo-publico-explicito-para-initialimport-sin-acceso-a-j.md

**Next Recommendation (generated at closure):**
- Direct next tasks unblocked by this closure: 076 (p1).
- Recommended start: 076 (p1).
