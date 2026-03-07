---
protocol_version: 2
task_type: "leaf"
status: "ready"
priority: "p2"
issue_id: "117"
title: "Phase 1 shell and file orchestration untangling"
tags: ["architecture", "phase-1", "app-shell", "file-io", "workspace-profile", "runtime-edge"]
dependencies: ["116"]
child_tasks: []
related_tasks: ["115:context", "112:precedent", "113:precedent", "099:precedent", "108:precedent", "109:precedent", "110:precedent"]
owner: "codex"
created_at: "2026-03-07"
updated_at: "2026-03-07"
target_date: null
risk_level: "high"
estimated_effort: "l"
complexity: "complex"
auto_closure: true
commit_confirmed: false
commit_message: null
closed_at: null
---


# Phase 1 shell and file orchestration untangling

Reduce orchestration concentration at the runtime edge before touching the deepest internal knot.

## Problem Statement

The diagnosis identified `App.tsx` and `useGskFile.ts` as the first runtime seams that need cleanup. `App.tsx` still acts as a dominant integration knot, while `useGskFile.ts` mixes package IO, hydration, workspace profile application, merge preparation, and shell-facing orchestration.

If deeper structural work starts before this phase succeeds, the later refactor blast radius stays too broad and future import/share flows remain likely to re-enter through the same overloaded seams.

### Context

- Current behavior:
  - `App.tsx` still concentrates shell, state, file, AI, and profile responsibilities.
  - `useGskFile.ts` still mixes persistence and runtime-side orchestration.
  - `Workspace Profile` is a valid boundary but still too entangled with package-side flow.
- Expected behavior:
  - Runtime-edge orchestration should be clearer and less centralized.
  - Package/file concerns should be separable from runtime hydration and shell concerns.
- Where this appears:
  - `src/App.tsx`
  - `src/hooks/useGskFile.ts`
  - `src/io/fileIOService.ts`
  - `src/io/workspaceProfileService.ts`

### Why This Matters

- Impact:
  - Lowers risk for all later architecture phases.
  - Prevents future sharing/import flows from attaching to already-overloaded seams.
  - Clarifies the package boundary before deeper core cleanup begins.
- Cost of not doing it:
  - Later phases inherit the same runtime-edge ambiguity.
  - Temporary-repository sharing or import flows may later be forced through the wrong boundary.

## Findings

- `hotspot-001` and `hotspot-003` are the right first targets.
- This phase is primarily about concentration and boundary clarity, not about adding new capabilities.
- The future temporary-repository sharing path should be able to enter later through a separate adapter flow, not through more package/runtime sprawl.
- `Workspace Profile` must remain a local/private boundary, not drift into package-side sharing semantics.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Refactor runtime-edge responsibilities so `App.tsx` and `useGskFile.ts` stop acting as cross-system catch-alls.
- Pros:
  - Cleans the first two highest-value edge hotspots.
  - Creates cleaner seams for later core-runtime refactors.
  - Supports future adapter-based import/share paths without implementing them now.
- Cons:
  - May require coordinated edits across shell and file flow entrypoints.
- Effort: L
- Risk: High

## Recommended Action

Reduce the integration load in `App.tsx`, split package/file concerns from runtime hydration concerns in `useGskFile.ts`, and make `Workspace Profile` application no longer appear as a hidden package-side responsibility.

### Execution Plan

1. Inventory and reduce the most cross-system responsibilities still concentrated in `App.tsx`.
2. Split `useGskFile.ts` responsibilities into package/file concerns versus runtime hydration/orchestration concerns.
3. Move `Workspace Profile` application closer to an explicit runtime boundary rather than implicit package flow.
4. Verify that future import/share paths could be added later through separate adapters instead of through the same mixed runtime edge.
5. Update the `live map` and capture evidence of reduced concentration.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] `App.tsx` is no longer the principal integration knot.
- [ ] `useGskFile.ts` no longer mixes IO, hydration, profile, and merge orchestration as one central seam.
- [ ] `Workspace Profile` no longer appears as a hidden concern of the package path.
- [ ] A future temporary-repository sharing path could enter through a separate adapter boundary.
- [ ] Work log records commands, tests, artifacts, and live-map updates.

## Work Log

### 2026-03-07 - Phase 1 task created from approved execution chain

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the first runtime-edge implementation phase for the guided hard-cut chain.
- Anchored the task to `App.tsx`, `useGskFile.ts`, and package/profile boundary cleanup.
- Recorded the anti-drift rule that future import/share flows must not justify new orchestration sprawl here.

**Evidence:**
- Artifacts/paths:
  - `todos/117-pending-p2-phase-1-shell-and-file-orchestration-untangling.md`
  - `src/App.tsx`
  - `src/hooks/useGskFile.ts`
  - `reports/architecture-separation-diagnosis/guided-hard-cut-plan.md`

## Notes

This phase should not start before `116` is complete. It is the first real runtime refactor phase of the chain.
