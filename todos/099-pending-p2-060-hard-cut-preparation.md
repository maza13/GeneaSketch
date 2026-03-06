---
protocol_version: 2
task_type: "umbrella"
status: "pending"
priority: "p2"
issue_id: "099"
title: "0.6.0 hard-cut preparation"
tags: ["release-0.6.0", "hard-cut", "architecture", "legacy-removal"]
dependencies: ["096", "100"]
child_tasks: ["108", "109", "110"]
related_tasks: ["097:precedent", "048:followup"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "high"
estimated_effort: "l"
complexity: "complex"
auto_closure: true
commit_confirmed: false
commit_message: null
closed_at: null
---

# 0.6.0 hard-cut preparation

Coordinate the architecture preparation work required before the 0.6.0 hard cut is intentionally opened.

## Problem Statement

The Super Analysis confirmed that 0.6.0 remains blocked by legacy fallback paths and bridge-style product flows. This umbrella exists to turn that future work into an ordered preparation chain instead of allowing the migration to restart discovery mid-cut.

### Context

- Current behavior:
  - 0.5.0 blocker work is complete.
  - `100` already established the system taxonomy and architecture boundary baseline.
- Expected behavior:
  - 0.6.0 preparation should expose the next analysis/migration order without activating the cut itself.
- Where this appears:
  - `reports/super-analysis-0.5.0/fix-plan.md`
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`

### Why This Matters

- Impact:
  - Prevents the hard cut from collapsing taxonomy, boundary analysis, and migration implementation into one phase.
- Cost of not doing it:
  - Legacy removal risks becoming improvisational and unsafe.

## Findings

- Known hard-cut targets include:
  - `src/core/read-model/selectors.ts`
  - `src/hooks/useGskFile.ts`
  - `src/App.tsx`
  - `src/state/slices/docSlice.ts`
- `100` and its child analyses supply the architecture baseline that this umbrella must consume.
- `097` clarified the distinction between `Visual Engine` and `App Shell`, which is a prerequisite for the hard-cut framing.
- `048` remains the eventual execution umbrella for the hard-cut itself and should stay downstream.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Keep one protocol v2 umbrella that sequences selectors hard-cut scoping, bridge boundary audit, and graph-native rollout planning before `048`.
- Pros:
  - Forces architecture prep to happen before implementation pressure.
  - Makes the order explicit for both agents and users.
- Cons:
  - Adds planning structure ahead of execution.
- Effort: L
- Risk: Medium

## Recommended Action

Use this umbrella as the 0.6.0 preparation entry point. Start with `todo:brief` and `todo:prepare`, then execute child tasks only by explicit request.

### Execution Plan

1. Reuse `100` as the architecture baseline; do not repeat that discovery work.
2. Scope the selector/read-model cut first.
3. Audit the remaining product bridge boundaries second.
4. Define graph-native rollout sequencing before handing off to `048`.

## Orchestration Guide

### Hard Dependencies

- `096` must stay complete because it contains the release packet and hard-cut findings.
- `100` must stay complete because this umbrella depends on its architecture baseline rather than rediscovering it.

### Child Execution Order

1. `108` - define the selector/read-model hard-cut migration boundary.
2. `109` - audit remaining product bridges and classify which are transitional versus deletion candidates.
3. `110` - convert the analysis into a graph-native rollout sequence ready to hand off to `048`.

### Related Context

- `097:precedent` - formalized the Visual Engine vs App Shell distinction that this hard-cut planning depends on.
- `048:followup` - remains the eventual execution umbrella after this preparation chain is complete.

### Exit Rule

- Close this umbrella only after `108`, `109`, and `110` are complete and `048` can consume the resulting prep without reopening discovery.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] 0.6.0 prep is split into ordered child tasks.
- [ ] The precedent and follow-up tasks are called out explicitly.
- [ ] Starting the umbrella does not execute any child task automatically.
- [ ] Work log updated.

## Work Log

### 2026-03-06 - Migrated to umbrella protocol v2

**By:** Codex

**Status Transition:**
- from: pending
- to: pending

**Actions:**
- Converted this placeholder into a protocol v2 umbrella.
- Added ordered child tasks, hard dependencies, and explicit related context.

**Evidence:**
- Artifacts/paths:
  - `todos/099-pending-p2-060-hard-cut-preparation.md`
  - `todos/108-pending-p2-hard-cut-read-model-selector-boundary.md`
  - `todos/109-pending-p2-hard-cut-product-bridge-boundary-audit.md`
  - `todos/110-pending-p2-hard-cut-graph-native-rollout-sequencing.md`

## Notes

This umbrella stays pending until 0.6.0 preparation is intentionally opened.
