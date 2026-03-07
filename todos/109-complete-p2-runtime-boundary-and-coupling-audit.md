---
protocol_version: 2
task_type: "leaf"
status: "complete"
priority: "p2"
issue_id: "109"
title: "Runtime boundary and coupling audit"
tags: ["architecture", "diagnosis", "boundaries", "coupling", "audit", "note:N0011"]
dependencies: ["108"]
child_tasks: []
related_tasks: ["099:context", "102:precedent", "103:precedent", "104:precedent"]
owner: "codex"
created_at: "2026-03-07"
updated_at: "2026-03-07"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: true
commit_message: "Close 109: produce runtime boundary and coupling audit"
closed_at: "2026-03-07"
---



# Runtime boundary and coupling audit

Audit the real runtime dependencies between the mapped systems and classify whether each relationship is a legitimate boundary, a transitional bridge, technical debt, or an ambiguous case.

## Problem Statement

The architecture baseline and master map can show which systems exist, but they still do not answer which relationships are architecturally sound and which are coupling that should eventually be reduced. This task turns the map into a concrete audit with evidence, directionality, and severity context.

### Context

- Current behavior:
  - `100` through `104` already classify boundaries at a high level.
  - The current repo still contains mixed orchestration across app root, file loading, store mutation, projection, and AI/runtime flows.
- Expected behavior:
  - The audit should classify concrete relationships using actual file paths and dependency reasons.
- Where this appears:
  - `src/App.tsx`
  - `src/hooks/useGskFile.ts`
  - `src/state/slices/docSlice.ts`
  - `src/core/read-model/*`
  - `src/core/gschema/*`
  - `src/services/*`

### Why This Matters

- Impact:
  - Makes the next separation decisions evidence-based.
  - Distinguishes safe architecture from debt hotspots.
- Cost of not doing it:
  - Later planning may overreact to legitimate boundaries or underreact to mixed responsibilities.

## Findings

- `109` depends on `108` because the audit needs a stable source/target system map.
- `103` and `104` already provide conceptual precedent, but this task must add concrete file-level evidence and removal difficulty.
- The key value is not merely saying that coupling exists, but showing where and why it exists.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Produce `boundary-audit.md` as a relationship-by-relationship table grounded in systems, files, dependency type, legitimacy, and removal difficulty.
- Pros:
  - Reusable by both hotspot analysis and final diagnosis.
  - Keeps subjective judgment constrained by explicit evidence.
- Cons:
  - Requires discipline to avoid duplicating the master map.
- Effort: M
- Risk: Medium

## Recommended Action

Create `reports/architecture-separation-diagnosis/boundary-audit.md` as the authoritative runtime boundary and coupling audit for the current system.

### Execution Plan

1. Consume the system map from `108`.
2. Enumerate the major system-to-system runtime relationships currently visible in code.
3. Classify each relationship by legitimacy and difficulty of removal.
4. Flag mixed or unclear relationships that need escalation in `110`.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [x] `boundary-audit.md` exists under `reports/architecture-separation-diagnosis/`.
- [x] The audit uses explicit source/target systems and concrete file anchors.
- [x] Each relationship includes dependency type, legitimacy, and removal difficulty.
- [x] Work log updated.

## Work Log

### 2026-03-07 - Task created from architecture diagnosis umbrella

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the runtime boundary and coupling audit task downstream of the master system map.
- Scoped it to evidence-backed relationship classification rather than abstract architecture restatement.

**Evidence:**
- Artifacts/paths:
  - `todos/109-pending-p2-runtime-boundary-and-coupling-audit.md`
  - `todos/108-pending-p2-master-system-map.md`
  - `todos/099-pending-p2-post-baseline-architecture-followup.md`

### 2026-03-07 - Runtime boundary audit completed

**By:** Codex

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Produced the runtime boundary and coupling audit under `reports/architecture-separation-diagnosis/`.
- Classified the current system-to-system edges as legitimate boundaries, transitional bridges, or technical debt/coupling.
- Added an explicit escalation list for the downstream hotspot classification task `110`.

**Evidence:**
- Artifacts/paths:
  - `reports/architecture-separation-diagnosis/boundary-audit.md`
  - `reports/architecture-separation-diagnosis/master-system-map.md`
  - `todos/109-ready-p2-runtime-boundary-and-coupling-audit.md`

## Notes

This task should not yet prioritize remediation. Prioritization belongs in `110`.

### 2026-03-07 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Produced the runtime boundary and coupling audit, classified the current system edges, and prepared the hotspot handoff for task 110.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/109-complete-p2-runtime-boundary-and-coupling-audit.md

**Next Recommendation (generated at closure):**
- Direct next tasks unblocked by this closure: 110 (p2).
- Recommended start: 110 (p2).
