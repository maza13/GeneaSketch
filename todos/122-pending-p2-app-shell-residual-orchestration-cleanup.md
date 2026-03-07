---
protocol_version: 2
task_type: "leaf"
status: "pending"
priority: "p2"
issue_id: "122"
title: "App shell residual orchestration cleanup"
tags: ["architecture", "cleanup", "app-shell", "runtime", "post-hard-cut"]
dependencies: ["115"]
child_tasks: []
related_tasks: ["117:precedent", "121:context", "115:precedent"]
owner: "codex"
created_at: "2026-03-07"
updated_at: "2026-03-07"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: false
commit_message: null
closed_at: null
---

# App shell residual orchestration cleanup

Reduce the shell-level orchestration concentration that still remains in `App.tsx` after the hard cut.

## Problem Statement

`App.tsx` is no longer the original integration knot, but it still carries more shell coordination than necessary across local UI state, modal orchestration, runtime callbacks, and menu-driven action wiring. This phase should reduce that concentration without reopening file/runtime/state seams already cleaned by the hard cut.

### Context

- Current behavior:
  - `App.tsx` still wires many modal states, shell callbacks, and menu-side flows directly.
  - the mainline architecture seams are cleaner, but the shell still has residual concentration.
- Expected behavior:
  - `App.tsx` should move closer to composition root plus layout host.
  - shell coordination should be grouped into narrower hooks or adapter seams where useful.
- Where this appears:
  - `src/App.tsx`
  - `src/hooks/useMenuConfig.tsx`
  - `src/hooks/useNodeActions.ts`

### Why This Matters

- Impact:
  - lowers shell maintenance friction for future feature work.
  - keeps post-hard-cut improvements from stalling at the composition root.
- Cost of not doing it:
  - `App.tsx` remains the first place new incidental orchestration will accumulate again.

## Findings

- The hard cut already removed the heaviest runtime/file/profile responsibilities from `App.tsx`.
- What remains is mostly shell-layer concentration rather than core architectural ambiguity.
- This task should not try to redesign the whole shell; it should only reduce obvious concentration and group related orchestration.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - extract the most cohesive remaining shell orchestration clusters into narrow hooks or shell-specific coordinators.
- Pros:
  - reduces root-file concentration without reopening upstream seams.
  - keeps diffs bounded to shell behavior.
- Cons:
  - easy to over-extract if not disciplined.
- Effort: M
- Risk: Medium

## Recommended Action

Refactor `App.tsx` toward a thinner composition root by extracting cohesive shell orchestration groups, especially where menu wiring, modal coordination, or shell-specific event routing still sit inline.

### Execution Plan

1. Inventory the remaining orchestration clusters in `App.tsx`.
2. Extract only the most cohesive shell-layer groups into narrower hooks or coordinators.
3. Keep public runtime behavior unchanged.
4. Verify `App.tsx` is materially smaller and less cross-cutting than before.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] `App.tsx` is materially less concentrated as a shell composition root.
- [ ] Extracted logic remains shell-layer only and does not reopen core/runtime seams.
- [ ] Runtime behavior remains unchanged under existing validations.
- [ ] Work log records commands, tests, and evidence.

## Work Log

### 2026-03-07 - Residual shell cleanup task created

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the first post-hard-cut residual cleanup task.
- Anchored it to shell-level concentration still present in `App.tsx`.
- Recorded the constraint that this cleanup must not reopen already-closed runtime/file seams.

**Evidence:**
- Artifacts/paths:
  - `todos/122-pending-p2-app-shell-residual-orchestration-cleanup.md`
  - `src/App.tsx`

## Notes

This task is successful only if it reduces shell concentration, not if it merely redistributes lines mechanically.
