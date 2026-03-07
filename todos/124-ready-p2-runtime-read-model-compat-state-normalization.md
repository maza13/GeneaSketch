---
protocol_version: 2
task_type: "leaf"
status: "ready"
priority: "p2"
issue_id: "124"
title: "Runtime read-model compat state normalization"
tags: ["architecture", "cleanup", "read-model", "compatibility", "runtime-state"]
dependencies: ["123"]
child_tasks: []
related_tasks: ["119:precedent", "120:precedent", "121:context"]
owner: "codex"
created_at: "2026-03-07"
updated_at: "2026-03-07"
target_date: null
risk_level: "medium"
estimated_effort: "s"
complexity: "complex"
auto_closure: true
commit_confirmed: false
commit_message: null
closed_at: null
---


# Runtime read-model compat state normalization

Normalize the remaining runtime compatibility state so direct-only mainline behavior is reflected consistently across store, persistence, and tests.

## Problem Statement

The hard cut moved legacy read-model compatibility out of the central selector path, but some runtime state and persistence surfaces still carry `readModelMode` even though the mainline is now direct-only. This task should normalize that residual compatibility state without deleting the explicit compatibility edge used by tests and audit tooling.

### Context

- Current behavior:
  - the runtime mainline is direct-only.
  - some store/persistence surfaces still expose or persist `readModelMode`.
  - explicit legacy compatibility still exists for non-runtime uses.
- Expected behavior:
  - runtime-facing state should reflect direct-only reality consistently.
  - explicit legacy compatibility should remain available only where intentionally needed.
- Where this appears:
  - `src/state/types.ts`
  - `src/state/slices/viewSlice.ts`
  - `src/hooks/useFileLoadRuntime.ts`
  - `src/io/workspaceProfileService.ts`
  - `src/types/workspaceProfile.ts`

### Why This Matters

- Impact:
  - removes misleading runtime state that no longer drives real branching.
  - completes the residual cleanup around the read-model mainline.
- Cost of not doing it:
  - the codebase keeps signaling runtime configurability that no longer exists.

## Findings

- The mainline selector no longer branches on runtime mode.
- Compatibility still exists intentionally for explicit side-edge use.
- The remaining question is normalization of runtime-facing state and persisted profile values, not compatibility removal.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - normalize runtime-facing `readModelMode` state toward direct-only semantics while preserving backward-tolerant profile loading.
- Pros:
  - aligns types, persistence, and runtime truth.
  - avoids reintroducing ambiguity after phase `120`.
- Cons:
  - may require compatibility handling for older persisted workspace profiles.
- Effort: S
- Risk: Medium

## Recommended Action

Audit and normalize the remaining runtime and persistence surfaces that still expose `readModelMode`, keeping backward tolerance for older inputs but making direct-only semantics explicit in current runtime paths.

### Execution Plan

1. Inventory runtime and persistence surfaces that still expose `readModelMode`.
2. Normalize current runtime behavior to direct-only semantics.
3. Preserve backward-tolerant loading for old persisted inputs where needed.
4. Verify tests and documentation reflect the new truth consistently.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] Runtime-facing state no longer implies a meaningful legacy mode branch where none exists.
- [ ] Backward-tolerant loading remains intact for old persisted inputs.
- [ ] Explicit compatibility edge remains available only where intentionally needed.
- [ ] Work log records commands, tests, and evidence.

## Work Log

### 2026-03-07 - Runtime compat-state cleanup task created

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the final residual cleanup task focused on runtime compatibility state normalization.
- Anchored it to the post-phase-120 state where mainline runtime is already direct-only.

**Evidence:**
- Artifacts/paths:
  - `todos/124-pending-p2-runtime-read-model-compat-state-normalization.md`
  - `src/state/types.ts`
  - `src/state/slices/viewSlice.ts`

## Notes

This task is about truthfulness of runtime state, not about deleting explicit compatibility tooling.
