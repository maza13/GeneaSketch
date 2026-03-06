---
status: "pending"
priority: "p2"
issue_id: "099"
title: "060-hard-cut-preparation"
tags: ["release-0.6.0", "hard-cut", "architecture", "legacy-removal"]
dependencies: ["096"]
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

Track the architectural work required for the 0.6.0 hard cut without enabling it during the current release-closing phase.

## Problem Statement

The Super Analysis confirmed that 0.6.0 remains blocked by legacy fallback paths and product flows that still bridge between `GraphDocument` and `GSchemaGraph`. That work should be planned explicitly, but it must stay outside the current 0.5.0 closure.

### Context

- Current behavior:
  - 0.5.0 blocker work is complete.
  - The central fallback and graph/document bridge paths are still present.
- Expected behavior:
  - 0.6.0 prep is documented, sequenced, and intentionally left pending.
- Where this appears:
  - `reports/super-analysis-0.5.0/fix-plan.md`
  - `reports/super-analysis-0.5.0/findings.json`

### Why This Matters

- Impact:
  - Prevents the 0.6.0 migration from being improvised later.
- Cost of not doing it:
  - Future architecture work may restart discovery from zero or leak into 0.5.x scope.

## Findings

- Known hard-cut targets include:
  - `src/core/read-model/selectors.ts`
  - `src/hooks/useGskFile.ts`
  - `src/App.tsx`
  - `src/state/slices/docSlice.ts`
  - remaining bridge-style helpers tied to legacy assumptions
- This work depends on keeping the current blocker-clearing state stable and separated from architecture changes.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Keep one pending umbrella for 0.6.0 hard-cut prep and split it into child tasks only when architecture work is intentionally started.
- Pros:
  - Preserves clean release scope.
  - Makes future migration sequencing easier.
- Cons:
  - Requires a later planning pass before execution.
- Effort: L
- Risk: Medium

## Recommended Action

Leave this task in `pending` as the architecture handoff point for the 0.6.0 hard cut.

### Execution Plan

1. Freeze the blocker-clearing bundle first.
2. Re-open the hard-cut dependency matrix when 0.6.0 planning starts.
3. Break removal work into graph-native migration tasks only after explicit approval.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] 0.6.0 hard-cut work is tracked in one pending task.
- [ ] No hard-cut work is marked `ready` yet.
- [ ] Scope is limited to legacy-removal and graph-native migration planning.

## Work Log

### 2026-03-06 - Task created as architecture placeholder

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created a dedicated pending task for the 0.6.0 hard-cut preparation track.
- Kept this work explicitly outside the current 0.5.0 closure.

**Evidence:**
- Artifacts/paths:
  - `todos/099-pending-p2-060-hard-cut-preparation.md`
  - `reports/super-analysis-0.5.0/fix-plan.md`

## Notes

This task must not move to `ready` until the 0.5.0 closure is accepted and 0.6.0 planning is explicitly opened.
