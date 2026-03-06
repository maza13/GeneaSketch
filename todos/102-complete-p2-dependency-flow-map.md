---
status: "complete"
priority: "p2"
issue_id: "102"
title: "Dependency flow map"
tags: ["notes", "note:N0011", "architecture", "dependencies"]
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
commit_message: "Close 102: document GSK ecosystem dependency flow map"
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

## Proposed Solutions

### Recommended

- Build a dependency-flow artifact that shows:
  - source system
  - target system
  - dependency kind
  - whether the flow is runtime, persistence, projection, orchestration, or local profile

## Recommended Action

Derive the explicit dependency flow map from the current architecture and document it in a form reusable by `099`.

## Acceptance Criteria

- [ ] Main system-to-system flow is documented.
- [ ] Each edge includes dependency type or role.
- [ ] Work log updated.
- [ ] Traceability linked to note N0011.

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

## Notes

This task should be informed by the taxonomy output from `101`.

### 2026-03-06 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: pending
- to: complete

**Actions:**
- Captured the dependency flow map across package IO, engine, read model, visual engine, app shell, state, profile, and AI.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/102-complete-p2-dependency-flow-map.md

**Next Recommendation (generated at closure):**
- There are direct dependent tasks, but they are still blocked.
- Example: 100 (p2) waits for: 103, 104.
