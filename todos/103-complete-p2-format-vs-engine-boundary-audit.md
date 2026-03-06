---
status: "complete"
priority: "p2"
issue_id: "103"
title: "Format vs engine boundary audit"
tags: ["notes", "note:N0011", "architecture", "boundaries", "gsk-format"]
dependencies: []
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "standard"
auto_closure: true
commit_confirmed: true
commit_message: "Close 103: audit format vs engine boundary in GSK ecosystem"
closed_at: "2026-03-06"
---

# Format vs engine boundary audit

Audit the boundary between the `.gsk` format/package layer and the in-memory engine semantics.

## Problem Statement

A central architecture question is whether `.gsk` is only a persistence boundary or whether it is still shaping engine behavior too deeply. This task isolates that specific boundary and documents where the current separation is clean and where it is blurred.

## Findings

- N0011 explicitly raises the question of how independent the engine is from the `.gsk` format.
- This is not only an IO concern; it also affects long-term extensibility and future engine or renderer variation.
- The current runtime still contains orchestration paths that pass package concerns into app/runtime concerns.

## Proposed Solutions

### Recommended

- Audit the boundary in terms of:
  - persistence responsibilities
  - package validation responsibilities
  - engine invariants
  - where cross-layer assumptions leak

## Recommended Action

Document the real format-vs-engine boundary and identify where the current design is stable versus transitional.

## Acceptance Criteria

- [ ] Format responsibilities and engine responsibilities are separated explicitly.
- [ ] Leakage points or mixed responsibilities are identified.
- [ ] Work log updated.
- [ ] Traceability linked to note N0011.

## Work Log

### 2026-03-06 - Task normalized after notes:promote

**By:** Codex

**Status Transition:**
- from: pending
- to: pending

**Actions:**
- Replaced the literal promoted title with the third logical architecture block.
- Scoped the task to the `.gsk` format versus engine boundary question.

**Evidence:**
- Artifacts/paths:
  - `todos/103-pending-p2-format-vs-engine-boundary-audit.md`
  - `notes/entries/N0011-idea-analisis-ecosistema-gsk-interconexiones.md`

## Notes

This task feeds directly into the architecture constraints for future hard-cut planning.

### 2026-03-06 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: pending
- to: complete

**Actions:**
- Audited the separation between .gsk package concerns and engine semantics, including leakage points in current orchestration paths.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/103-complete-p2-format-vs-engine-boundary-audit.md

**Next Recommendation (generated at closure):**
- There are direct dependent tasks, but they are still blocked.
- Example: 100 (p2) waits for: 104.
