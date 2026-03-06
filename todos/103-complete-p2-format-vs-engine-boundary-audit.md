---
protocol_version: 2
task_type: "leaf"
status: "complete"
priority: "p2"
issue_id: "103"
title: "Format vs engine boundary audit"
tags: ["notes", "note:N0011", "architecture", "boundaries", "gsk-format"]
dependencies: ["101", "102"]
child_tasks: []
related_tasks: ["100:context"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "standard"
auto_closure: true
commit_confirmed: true
commit_message: "Close 103: reclose format vs engine boundary audit under protocol v2"
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
- The previous closure was invalid because the acceptance checklist was never marked complete.

## Proposed Solutions

### Recommended

- Audit the boundary in terms of:
  - persistence responsibilities
  - package validation responsibilities
  - engine invariants
  - where cross-layer assumptions leak

## Recommended Action

Document the real format-vs-engine boundary and identify where the current design is stable versus transitional, using the taxonomy and dependency map as prerequisites.

## Acceptance Criteria

- [x] Format responsibilities and engine responsibilities are separated explicitly.
- [x] Leakage points or mixed responsibilities are identified.
- [x] Work log updated.
- [x] Traceability linked to note N0011.

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

### 2026-03-06 - Strict reopen for protocol correction

**By:** Codex

**Status Transition:**
- from: complete
- to: ready

**Actions:**
- Reopened the task because the previous closure left acceptance criteria unchecked.
- Added explicit upstream dependencies so the task no longer floats independently of the taxonomy and flow map.

**Evidence:**
- Artifacts/paths:
  - `todos/103-ready-p2-format-vs-engine-boundary-audit.md`
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`

### 2026-03-06 - Format vs engine boundary reconfirmed under protocol v2

**By:** Codex

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Revalidated the architecture report section for format vs engine separation under the reopened protocol.
- Confirmed the report already distinguishes package responsibilities, engine semantics, and specific leakage points.
- Preserved the task dependency order so this closure remains downstream of the clean taxonomy and dependency-flow closures.

**Evidence:**
- Artifacts/paths:
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`
  - `todos/103-ready-p2-format-vs-engine-boundary-audit.md`

## Notes

This task is reopened strictly and should be re-closed only after `101` and `102` are cleanly complete again.

### 2026-03-06 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Revalidated and formally closed the format-vs-engine boundary audit under protocol v2.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/103-complete-p2-format-vs-engine-boundary-audit.md

**Next Recommendation (generated at closure):**
- Direct next tasks unblocked by this closure: 104 (p2).
- Recommended start: 104 (p2).
