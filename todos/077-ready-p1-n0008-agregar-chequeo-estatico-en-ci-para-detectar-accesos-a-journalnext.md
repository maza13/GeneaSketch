---
status: "ready"
priority: "p1"
issue_id: "077"
title: "n0008-agregar-chequeo-estatico-en-ci-para-detectar-accesos-a-journalnext"
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
commit_confirmed: false
closed_at: null
---

# N0008 Agregar chequeo estatico en CI

Implement a safeguard script to prevent future unauthorized access to `GSchemaGraph` internal properties.

## Problem Statement

Even with the API in place, new code might accidentally bypass it using casts.

## Proposed Solutions

- Static check scanning `src/` for `._journal` and `._nextOpSeq`.

## Acceptance Criteria

- [x] Static script `check-internals.mjs` implemented
- [x] Integration in `package.json` done
- [x] No violations in current codebase
- [x] Work log updated

## Work Log

### 2026-03-05 - Planning and Execution

**By:** Antigravity

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Implemented `check-internals.mjs` to scan for direct access to `_journal` and `_nextOpSeq`.
- Verified integration in `package.json`.
- Ran the check and confirmed 0 violations across the `src/` directory.

**Evidence:**
- Command: `npm run check:gschema:internals`
- Result: SUCCESS: No unauthorized internal property accesses found.

