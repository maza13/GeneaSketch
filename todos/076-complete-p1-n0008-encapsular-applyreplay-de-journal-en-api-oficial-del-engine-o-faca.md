---
status: "complete"
priority: "p1"
issue_id: "076"
title: "n0008-encapsular-applyreplay-de-journal-en-api-oficial-del-engine-o-faca"
tags: ["notes", "note:N0008"]
dependencies: ["075"]
owner: "codex"
created_at: "2026-03-05"
updated_at: "2026-03-05"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: true
commit_message: "chore(gschema): encapsulate journal mutators in Journal.ts satisfying Todo 076"
closed_at: "2026-03-05"
---


# N0008 Encapsular apply/replay de journal en API oficial del engine

Replace direct manipulation of `graph._journal` and `graph._nextOpSeq` in `Journal.ts` with controlled internal mutators.

## Problem Statement

En el flujo de import existen accesos directos a internals (`_journal`, `_nextOpSeq`) mediante casts estructurales. Tambien hay capa de replay/aplicacion que opera sobre internals de `GSchemaGraph`.

## Findings

El acoplamiento a internals dificulta garantizar invariantes como la monotonia de `opSeq` y el `updatedAt`.

## Proposed Solutions

- Encapsular apply/replay de journal en API oficial del engine (o facade interna controlada).

## Recommended Action

Execute implementation end-to-end and close with automated commit.

## Acceptance Criteria

- [x] `Journal.ts` updated to use `_appendJournal` and `_replaceJournal`
- [x] Direct access to `_journal` removed from `GraphInternals` type in `Journal.ts`
- [x] Work log updated
- [x] Verification tests pass

## Work Log

### 2026-03-05 - Planning and Execution

**By:** Antigravity

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Refactored `Journal.ts` to use `GSchemaGraph` internal facades.
- Removed `_journal` and `_nextOpSeq` from `GraphInternals` definition.
- Ran `vitest` suite (golden + strict).

**Evidence:**
- Command: `npx vitest run src/tests/gschema.golden.test.ts src/tests/gschema.strict.test.ts`
- Result: 69 passed.

### 2026-03-05 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Refactored Journal.ts to use controlled GSchemaGraph mutators and removed direct internal property access.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/076-complete-p1-n0008-encapsular-applyreplay-de-journal-en-api-oficial-del-engine-o-faca.md

**Next Recommendation (generated at closure):**
- Direct next tasks unblocked by this closure: 077 (p1), 078 (p1).
- Recommended start: 077 (p1).
