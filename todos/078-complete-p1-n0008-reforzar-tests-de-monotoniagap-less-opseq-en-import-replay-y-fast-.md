---
status: "complete"
priority: "p1"
issue_id: "078"
title: "n0008-reforzar-tests-de-monotoniagap-less-opseq-en-import-replay-y-fast-"
tags: ["notes", "note:N0008"]
dependencies: ["075", "076"]
owner: "codex"
created_at: "2026-03-05"
updated_at: "2026-03-05"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: true
commit_message: "chore(gschema): reinforce opSeq integrity tests satisfying Todo 078"
closed_at: "2026-03-05"
---


# N0008 Reforzar tests de monotonia/gap-less opSeq

Ensure the system strictly rejects journals with gaps or non-sequential operation numbers.

## Problem Statement

A bug was found where gaps were only reported as warnings in some flows.

## Acceptance Criteria

- [x] Tests for gap detection added to `gschema.strict.test.ts`
- [x] `GskPackage.ts` patched to throw errors on gaps in strict mode
- [x] Automated tests pass
- [x] Work log updated

## Work Log

### 2026-03-05 - Planning and Execution

**By:** Antigravity

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Implemented negative tests for `opSeq` gaps in `gschema.strict.test.ts`.
- Patched `GskPackage.ts` to enforce strict gap-less validation.
- Verified all tests pass in strict mode.

**Evidence:**
- Command: `npx vitest run src/tests/gschema.strict.test.ts`
- Result: 12 passed.

### 2026-03-05 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Strengthened opSeq integrity tests and enforced gap-less validation in GskPackage.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/078-complete-p1-n0008-reforzar-tests-de-monotoniagap-less-opseq-en-import-replay-y-fast-.md

**Next Recommendation (generated at closure):**
- Direct next tasks unblocked by this closure: 074 (p1).
- Recommended start: 074 (p1).
