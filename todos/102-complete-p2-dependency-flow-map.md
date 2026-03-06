---
protocol_version: 2
task_type: "leaf"
status: "complete"
priority: "p2"
issue_id: "102"
title: "Dependency flow map"
tags: ["notes", "note:N0011", "architecture", "dependencies"]
dependencies: ["101"]
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
commit_message: "Close 102: reclose dependency flow map under protocol v2"
closed_at: "2026-03-06"
---


# Dependency flow map

Map the main flow of data and control across the GSK ecosystem using the system taxonomy baseline.

## Problem Statement

The project needs a readable dependency flow from `.gsk` package IO and GEDCOM bridges through GSchema Engine, read model, Visual Engine, App Shell, State Manager, Workspace Profile, and AI Assistant. Without that map, it is difficult to tell where dependencies are intentional and where they are accidental.

## Findings

- The key architectural path already identified in N0011 is:
  - `.gsk -> package IO -> GSchema Engine -> read model -> Visual Engine -> App Shell`
- The current app also routes Workspace Profile, store orchestration, and AI assistant behavior through that runtime.
- This task should describe flow, ownership, and directionality, not yet judge whether each dependency is correct.
- The previous closure was invalid because the acceptance checklist was never marked complete.

## Proposed Solutions

### Recommended

- Build a dependency-flow artifact that shows:
  - source system
  - target system
  - dependency kind
  - whether the flow is runtime, persistence, projection, orchestration, or local profile

## Recommended Action

Derive the explicit dependency flow map from the current architecture and document it in a form reusable by `099`, after reconfirming the taxonomy baseline from `101`.

## Acceptance Criteria

- [x] Main system-to-system flow is documented.
- [x] Each edge includes dependency type or role.
- [x] Work log updated.
- [x] Traceability linked to note N0011.

## Work Log

### 2026-03-06 - Task normalized after notes:promote

**By:** Codex

**Status Transition:**
- from: pending
- to: pending

**Actions:**
- Replaced the literal promoted title with the second logical architecture block.
- Scoped the task to dependency mapping only.

**Evidence:**
- Artifacts/paths:
  - `todos/102-pending-p2-dependency-flow-map.md`
  - `notes/entries/N0011-idea-analisis-ecosistema-gsk-interconexiones.md`

### 2026-03-06 - Strict reopen for protocol correction

**By:** Codex

**Status Transition:**
- from: complete
- to: ready

**Actions:**
- Reopened the task because the previous closure left acceptance criteria unchecked.
- Added the explicit dependency on `101` so the order now matches the intended architecture chain.

**Evidence:**
- Artifacts/paths:
  - `todos/102-ready-p2-dependency-flow-map.md`
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`

### 2026-03-06 - Dependency flow map reconfirmed under protocol v2

**By:** Codex

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Revalidated the architecture report section for dependency flow under the reopened protocol.
- Confirmed that the main runtime flow and edge-role observations are explicitly documented.
- Preserved the dependency on `101` so this task only closes after the taxonomy baseline is formally clean again.

**Evidence:**
- Artifacts/paths:
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`
  - `todos/102-ready-p2-dependency-flow-map.md`

## Notes

This task is reopened strictly and should be re-closed only after `101` is cleanly complete again.

### 2026-03-06 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Revalidated and formally closed the dependency flow map under protocol v2.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/102-complete-p2-dependency-flow-map.md

**Next Recommendation (generated at closure):**
- Direct next tasks unblocked by this closure: 103 (p2).
- Recommended start: 103 (p2).
