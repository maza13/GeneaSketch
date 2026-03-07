---
protocol_version: 2
task_type: "leaf"
status: "ready"
priority: "p2"
issue_id: "120"
title: "Phase 4 legacy read-model fallback retirement preparation"
tags: ["architecture", "phase-4", "read-model", "legacy-fallback", "compatibility", "cleanup"]
dependencies: ["119"]
child_tasks: []
related_tasks: ["115:context", "112:precedent", "113:precedent", "099:precedent", "110:precedent", "111:precedent"]
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


# Phase 4 legacy read-model fallback retirement preparation

Isolate or retire the legacy read-model fallback only after the upstream runtime seams are cleaner.

## Problem Statement

The legacy projection fallback remains one of the clearest remaining debt edges, but the diagnosis explicitly placed it last. Retiring or isolating it too early would stack compatibility risk on top of already-mixed orchestration. This phase must finish the sequence by leaving a singular and explicit read-model mainline without reopening upstream ambiguity.

The task is not just to remove old code; it is to ensure the surviving read boundary is clean enough that future shells, adapters, or sharing surfaces do not inherit legacy branching by default.

### Context

- Current behavior:
  - The central read-model entrypoint still carries direct-versus-legacy ambiguity.
  - Earlier phases are expected to make shell/file/state/AI seams cleaner first.
  - Compatibility logic still risks leaking into the central selector path.
- Expected behavior:
  - Legacy fallback is isolated behind a narrower compatibility edge or retired.
  - The main read-model boundary becomes singular and explicit.
  - The final architecture state can be compared clearly against base and target maps.
- Where this appears:
  - `src/core/read-model/selectors.ts`
  - `src/core/read-model/directProjection.ts`
  - `src/core/gschema/GedcomBridge.ts`
  - `reports/architecture-separation-diagnosis/*`

### Why This Matters

- Impact:
  - Removes a major remaining ambiguity from the center of the read path.
  - Makes later adapters or platform shells less likely to inherit compatibility branching.
  - Produces a strong final architecture checkpoint.
- Cost of not doing it:
  - The core read boundary stays structurally ambiguous.
  - The project keeps carrying compatibility debt inside the mainline path.

## Findings

- The legacy fallback is real debt, but correctly sequenced as the last move.
- The goal is a singular read-model mainline, not merely code deletion.
- Earlier phases must already have reduced upstream ambiguity before this starts.
- The final phase should leave an explicit comparison between `base map`, `live map`, and `target map`.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Isolate or retire the legacy fallback behind a narrower compatibility edge after prior phases complete.
- Pros:
  - Finishes the hotspot chain in the intended dependency order.
  - Leaves the read side clearer for future adapters and shells.
  - Produces a strong final architecture checkpoint.
- Cons:
  - Still carries compatibility risk if executed too early or too broadly.
- Effort: M
- Risk: Medium

## Recommended Action

Narrow or remove the legacy fallback only after upstream seams are cleaner, leaving one explicit read-model mainline and documenting what residual debt remains versus what is actually gone.

### Execution Plan

1. Inventory the current fallback behavior and central selector branching.
2. Isolate compatibility responsibility behind a narrower edge or retire it where safe.
3. Verify that the surviving main read-model entrypoint is singular and explicit.
4. Compare `base map`, `live map`, and `target map` to document the resulting architecture state.
5. Update the architecture packet and record any residual debt explicitly.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] The legacy fallback is isolated or retired behind a narrower compatibility edge.
- [ ] The read-model mainline is singular and explicit.
- [ ] The phase output distinguishes real residual debt from removed ambiguity.
- [ ] The `base vs live vs target` comparison is recorded.
- [ ] Work log records tests, evidence, and final artifact updates.

## Work Log

### 2026-03-07 - Phase 4 task created from approved execution chain

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the final legacy-fallback cleanup phase for the guided hard-cut chain.
- Anchored the task to read-model compatibility isolation and final architecture-state comparison.
- Recorded that this phase must remain last and should not start before upstream ambiguity has been reduced.

**Evidence:**
- Artifacts/paths:
  - `todos/120-pending-p2-phase-4-legacy-read-model-fallback-retirement-preparation.md`
  - `src/core/read-model/selectors.ts`
  - `reports/architecture-separation-diagnosis/guided-hard-cut-plan.md`
  - `reports/architecture-separation-diagnosis/executive-summary.md`

## Notes

This phase should not be treated as a first move. Its value depends on the earlier phases already having narrowed the upstream seams.
