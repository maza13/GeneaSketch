---
protocol_version: 2
task_type: "leaf"
status: "complete"
priority: "p2"
issue_id: "108"
title: "Master system map"
tags: ["architecture", "diagnosis", "systems", "mapping", "note:N0010", "note:N0011"]
dependencies: ["100"]
child_tasks: []
related_tasks: ["099:context", "101:precedent", "102:precedent"]
owner: "codex"
created_at: "2026-03-07"
updated_at: "2026-03-07"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: true
commit_message: "Close 108: produce master system map for architecture separation diagnosis"
closed_at: "2026-03-07"
---



# Master system map

Produce the code-anchored master map of the current GeneaSketch system landscape so later boundary and separation work has one operational source of truth.

## Problem Statement

The architecture baseline already describes the major systems conceptually, but the project still lacks a concrete, code-anchored map that shows where each system actually lives, how it enters and exits runtime, and which files form its observable boundary. Without that map, later audits risk collapsing back into folder tours or abstract narratives.

### Context

- Current behavior:
  - The taxonomy is already defined by `100` and `101`.
  - Real runtime responsibilities remain distributed across root app flow, hooks, store slices, engine modules, IO services, and Tauri integration.
- Expected behavior:
  - One map should identify systems, anchors, inputs, outputs, and boundary status using actual repo evidence.
- Where this appears:
  - `src/App.tsx`
  - `src/core/*`
  - `src/hooks/*`
  - `src/state/*`
  - `src/io/*`
  - `src-tauri/src/*`

### Why This Matters

- Impact:
  - Prevents the next steps from inventing or renaming systems ad hoc.
  - Creates a stable artifact that future audits can reference instead of rediscovering.
- Cost of not doing it:
  - The coupling audit may overfit to symptoms without shared structure.

## Findings

- `100` and `101` already define the canonical system taxonomy.
- The current code confirms multiple role-based systems, but their implementation anchors are distributed and some runtime boundaries remain mixed.
- This task must not redefine taxonomy; it must operationalize it.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Build a master map that uses the `100` taxonomy baseline and binds each system to files, observable inputs/outputs, and boundary status.
- Pros:
  - Code-anchored and reusable.
  - Creates a direct substrate for `109`.
- Cons:
  - Requires careful filtering to avoid turning into a raw file inventory.
- Effort: M
- Risk: Low

## Recommended Action

Produce `reports/architecture-separation-diagnosis/master-system-map.md` and use it to define the current systems, their aliases, anchors, and state of separation.

### Execution Plan

1. Reuse the taxonomy from `100` and `101` without reopening it.
2. Inspect the current repo to identify implementation anchors, entrypoints, and public boundaries for each system.
3. Record per-system inputs, outputs, dependencies, anchors, and current boundary status.
4. Ensure the resulting artifact is clearly system-oriented, not a folder dump.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [x] `master-system-map.md` exists under `reports/architecture-separation-diagnosis/`.
- [x] Each canonical system includes anchors, inputs, outputs, dependencies, and boundary status.
- [x] The map is explicitly grounded in `100` and `101`, not a new taxonomy pass.
- [x] Work log updated.

## Work Log

### 2026-03-07 - Task created from architecture diagnosis umbrella

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the first child task under `099` for the master map artifact.
- Scoped the task to operationalize the existing taxonomy rather than redefine it.

**Evidence:**
- Artifacts/paths:
  - `todos/108-pending-p2-master-system-map.md`
  - `todos/099-pending-p2-post-baseline-architecture-followup.md`
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`

### 2026-03-07 - Master system map completed

**By:** Codex

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Produced the code-anchored master system map under `reports/architecture-separation-diagnosis/`.
- Bound the existing taxonomy to concrete implementation anchors, observable boundaries, system inputs/outputs, and current boundary status.
- Added an explicit handoff section for the `109` runtime boundary and coupling audit.

**Evidence:**
- Artifacts/paths:
  - `reports/architecture-separation-diagnosis/master-system-map.md`
  - `todos/108-ready-p2-master-system-map.md`
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`

## Notes

This task should identify system boundaries, not judge them yet. Judgment belongs downstream in `109` and `110`.

### 2026-03-07 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Produced the master system map artifact, linked it to the architecture diagnosis chain, and preserved umbrella 099 state in the same closure commit.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/108-complete-p2-master-system-map.md

**Next Recommendation (generated at closure):**
- Direct next tasks unblocked by this closure: 109 (p2).
- Recommended start: 109 (p2).
