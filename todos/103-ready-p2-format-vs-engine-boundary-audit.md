---
protocol_version: 2
task_type: "leaf"
status: "ready"
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
commit_confirmed: false
commit_message: null
closed_at: null
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

## Notes

This task is reopened strictly and should be re-closed only after `101` and `102` are cleanly complete again.
