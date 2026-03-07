---
protocol_version: 2
task_type: "umbrella"
status: "complete"
priority: "p2"
issue_id: "121"
title: "Post hard-cut residual cleanup chain"
tags: ["architecture", "cleanup", "post-hard-cut", "residual-debt", "runtime"]
dependencies: ["115"]
child_tasks: ["122", "123", "124"]
related_tasks: ["115:precedent", "120:precedent", "099:context"]
owner: "codex"
created_at: "2026-03-07"
updated_at: "2026-03-07"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: true
commit_message: "Close 121: complete post-hard-cut residual cleanup chain"
closed_at: "2026-03-07"
---




# Post hard-cut residual cleanup chain

Clean up the remaining edge debt left intentionally outside the completed guided hard cut.

## Problem Statement

The guided hard-cut chain is complete, but the architecture packet explicitly records residual debt that still matters for maintainability: shell-level concentration in `App.tsx`, repeated view-triggered reprojection in `viewSlice.ts`, and residual runtime compatibility state that no longer belongs in the mainline path. This chain exists to clean that debt without reopening the already-closed hard-cut hotspot sequence.

### Context

- Current behavior:
  - `115` through `120` are complete and the major hard-cut objectives are done.
  - `App.tsx` still retains some shell orchestration concentration.
  - `viewSlice.ts` still recomputes expanded graph aggressively on many view changes.
  - compatibility runtime state still exists around `readModelMode`, even though the read-model mainline is now direct-only.
- Expected behavior:
  - residual runtime debt should be reduced through a short, bounded chain.
  - no new feature scope or architecture re-taxonomy should be opened.
- Where this appears:
  - `src/App.tsx`
  - `src/state/slices/viewSlice.ts`
  - `src/core/read-model/*`
  - `reports/architecture-separation-diagnosis/live-map.md`

### Why This Matters

- Impact:
  - reduces the remaining maintainability drag after the hard cut.
  - prevents residual edge debt from becoming the next integration knot.
- Cost of not doing it:
  - the system stays structurally improved but needlessly rough at the edges.
  - future product work starts paying tax in shell and view-state churn.

## Findings

- The hard cut itself is complete and should stay closed.
- The remaining debt is edge cleanup, not unresolved central ambiguity.
- A short follow-up chain is safer than extending the completed hard-cut umbrella indefinitely.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - execute a short post-hard-cut cleanup chain focused only on explicit residual debt.
- Pros:
  - keeps the hard cut closed.
  - preserves a clear definition of done.
  - avoids turning cleanup into open-ended refactoring.
- Cons:
  - introduces one more small umbrella to manage.
- Effort: M
- Risk: Medium

## Recommended Action

Open a new bounded chain for residual cleanup only. Execute child tasks in order, and do not mix this chain with feature work or with another architecture diagnosis pass.

### Execution Plan

1. Reduce remaining shell-level orchestration concentration in `App.tsx`.
2. Narrow view-triggered reprojection and `expandedGraph` refresh churn in `viewSlice.ts`.
3. Remove or normalize residual runtime compatibility state around `readModelMode` so direct-only runtime is reflected consistently.

## Orchestration Guide

### Hard Dependencies

- `115` must remain complete as the closed guided hard-cut execution chain.

### Child Execution Order

1. `122` - reduce remaining `App.tsx` shell orchestration concentration first.
2. `123` - narrow `viewSlice.ts` reprojection and refresh churn after the shell edge is cleaner.
3. `124` - normalize residual runtime compatibility state only after the shell and view seams are clearer.

### Related Context

- `115:precedent` because this cleanup chain must not reopen the completed hard cut.
- `120:precedent` because the read-model mainline is already singular and this chain should only clean residual compatibility state.
- `099:context` because the original architecture diagnosis still defines the preserved boundaries this chain must respect.

### Exit Rule

- Close this umbrella only after `122` through `124` are complete, validations ran, and the architecture packet still describes the remaining debt accurately.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [x] Child tasks `122` through `124` exist and are linked.
- [x] The chain stays explicitly separate from the completed hard cut.
- [x] The chain defines bounded residual cleanup scope without feature expansion.
- [x] Work log initial entry recorded.

## Work Log

### 2026-03-07 - Residual cleanup umbrella created after hard-cut closure

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created a short post-hard-cut cleanup umbrella focused only on residual runtime debt.
- Anchored the chain to residual shell, view, and runtime-compat cleanup.
- Recorded the anti-drift rule that this chain must not reopen the closed hard cut or expand into product work.

**Evidence:**
- Artifacts/paths:
  - `todos/121-pending-p2-post-hard-cut-residual-cleanup-chain.md`
  - `todos/122-pending-p2-app-shell-residual-orchestration-cleanup.md`
  - `todos/123-pending-p2-view-slice-reprojection-and-expanded-graph-cleanup.md`
  - `todos/124-pending-p2-runtime-read-model-compat-state-normalization.md`

## Notes

This umbrella is intentionally short. If new debt is discovered outside these residual areas, it should be triaged separately instead of silently extending this chain.

### 2026-03-07 - Umbrella prepared via todo:prepare

**By:** Codex

**Status Transition:**
- from: pending
- to: ready

**Actions:**
- Reviewed hard dependencies before opening the umbrella.
- Confirmed child execution order: 122, 123, 124.
- Considered related context: 115:precedent, 120:precedent, 099:context.
- Activated eligible child tasks: 122.
- Left blocked child tasks pending: 123 (blocked by 122), 124 (blocked by 123).

**Evidence:**
- Hard dependencies complete: 115
- Activated: 122
- Blocked: 123 (blocked by 122), 124 (blocked by 123)

### 2026-03-07 - Residual cleanup chain completed

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Completed `122`, `123`, and `124` as a bounded post-hard-cut cleanup chain.
- Reduced residual shell orchestration in `App.tsx`, centralized repeated view refresh logic, and removed misleading runtime `readModelMode` state from store and persistence.
- Kept the cleanup chain separate from the completed hard cut and avoided expanding into feature work or a new architecture diagnosis pass.

**Evidence:**
- Completed child tasks:
  - `122`
  - `123`
  - `124`
- Updated architecture packet:
  - `reports/architecture-separation-diagnosis/live-map.md`

## Next Step Recommendation

If more cleanup is needed, open a new follow-up TODO chain instead of extending `121`.

### 2026-03-07 - Umbrella prepared via todo:prepare

**By:** Codex

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Reviewed hard dependencies before opening the umbrella.
- Confirmed child execution order: 122, 123, 124.
- Considered related context: 115:precedent, 120:precedent, 099:context.
- Activated eligible child tasks: 123.
- Left blocked child tasks pending: 124 (blocked by 123).

**Evidence:**
- Hard dependencies complete: 115
- Activated: 123
- Blocked: 124 (blocked by 123)

### 2026-03-07 - Umbrella prepared via todo:prepare

**By:** Codex

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Reviewed hard dependencies before opening the umbrella.
- Confirmed child execution order: 122, 123, 124.
- Considered related context: 115:precedent, 120:precedent, 099:context.
- Activated eligible child tasks: 124.
- Left blocked child tasks pending: none.

**Evidence:**
- Hard dependencies complete: 115
- Activated: 124
- Blocked: none
