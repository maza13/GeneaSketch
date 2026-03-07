---
protocol_version: 2
task_type: "leaf"
status: "complete"
priority: "p2"
issue_id: "123"
title: "View slice reprojection and expanded graph cleanup"
tags: ["architecture", "cleanup", "view-slice", "expanded-graph", "reprojection"]
dependencies: ["122"]
child_tasks: []
related_tasks: ["118:precedent", "121:context", "115:precedent"]
owner: "codex"
created_at: "2026-03-07"
updated_at: "2026-03-07"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: true
commit_message: "Close 123: centralize residual view refresh transitions"
closed_at: "2026-03-07"
---


# View slice reprojection and expanded graph cleanup

Reduce repeated view-triggered reprojection and `expandedGraph` recomputation inside `viewSlice.ts`.

## Problem Statement

After the hard cut, one of the clearest remaining runtime inefficiencies is that `viewSlice.ts` still recomputes projected and expanded graph state across many view mutations. That behavior is not a central architecture ambiguity anymore, but it is still a maintenance and performance tax that should be narrowed.

### Context

- Current behavior:
  - many `viewSlice.ts` actions call `projectGraphDocument(...)` and `ensureExpanded(...)` inline.
  - view-level changes still trigger broad recomputation patterns.
- Expected behavior:
  - view-driven graph refresh logic should be more centralized and less repetitive.
  - actions that only patch view state should not each own their own reprojection boilerplate.
- Where this appears:
  - `src/state/slices/viewSlice.ts`
  - `src/state/helpers/graphHelpers.ts`
  - `src/core/read-model/selectors.ts`

### Why This Matters

- Impact:
  - improves maintainability and reduces view-state churn.
  - keeps the post-hard-cut runtime from regressing into refresh sprawl.
- Cost of not doing it:
  - the next wave of UI work will keep paying repeated reprojection tax in the store.

## Findings

- `docSlice.ts` already got a narrower reconciliation contract in phase `118`.
- `viewSlice.ts` still repeats similar expanded-graph refresh logic across many actions.
- This task should converge view refresh through a narrower helper or contract, not redesign view behavior.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - extract a narrower view-refresh helper and route repetitive `expandedGraph` recalculation through it.
- Pros:
  - reduces repetition and makes future view cleanup safer.
  - aligns view-side refresh with the reconciliation style already introduced in `docSlice.ts`.
- Cons:
  - still requires careful regression testing across many view actions.
- Effort: M
- Risk: Medium

## Recommended Action

Refactor `viewSlice.ts` so repeated reprojection and expanded-graph refresh logic is centralized behind a narrower helper, while preserving current view behavior and selector boundaries.

### Execution Plan

1. Inventory repeated `projectGraphDocument(...)` / `ensureExpanded(...)` patterns in `viewSlice.ts`.
2. Extract a single refresh helper or contract for view-driven recomputation.
3. Route the repetitive actions through that helper.
4. Verify no regressions in view-state behavior or selector boundaries.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [x] Reprojection and expanded-graph refresh are materially less repetitive in `viewSlice.ts`.
- [x] The resulting helper keeps current behavior intact.
- [x] Selector boundaries remain unchanged.
- [x] Work log records commands, tests, and evidence.

## Work Log

### 2026-03-07 - View-slice residual cleanup task created

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the second residual cleanup task focused on view-driven reprojection and refresh churn.
- Anchored it to `viewSlice.ts` as the clearest remaining repeated recomputation area.

**Evidence:**
- Artifacts/paths:
  - `todos/123-pending-p2-view-slice-reprojection-and-expanded-graph-cleanup.md`
  - `src/state/slices/viewSlice.ts`

### 2026-03-07 - Centralized view-driven expanded graph refresh

**By:** Codex

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Added `src/state/helpers/viewStateTransitions.ts` to centralize the repeated `projectGraphDocument(...) + ensureExpanded(...)` pattern for view mutations.
- Routed the main `viewSlice.ts` view mutations that legitimately require expanded-graph refresh through the new helper.
- Kept selector boundaries unchanged; the helper only consolidates view-side recomputation boilerplate.
- Updated the live architecture map to reflect that the remaining view debt is now policy-level rather than duplicated refresh code.

**Evidence:**
- Commands:
  - `npm test -- src/tests/store.test.ts`
  - `npm test -- src/tests/collateral_vnext.test.ts`
  - `npx vite build`
- Artifacts/paths:
  - `src/state/slices/viewSlice.ts`
  - `src/state/helpers/viewStateTransitions.ts`
  - `reports/architecture-separation-diagnosis/live-map.md`

## Notes

This task should improve maintainability first, and runtime behavior secondarily; it is not a UI redesign task.

## Next Step Recommendation

Execute `124` next to normalize residual runtime compatibility state around `readModelMode` now that shell and view churn are both narrower.
