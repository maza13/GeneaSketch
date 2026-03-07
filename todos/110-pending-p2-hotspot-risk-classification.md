---
protocol_version: 2
task_type: "leaf"
status: "pending"
priority: "p2"
issue_id: "110"
title: "Hotspot risk classification"
tags: ["architecture", "diagnosis", "hotspots", "risk", "coupling"]
dependencies: ["109"]
child_tasks: []
related_tasks: ["099:context", "104:precedent"]
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

# Hotspot risk classification

Convert the boundary audit into a normalized hotspot inventory that ranks the places most likely to propagate structural debt or destabilize future separation work.

## Problem Statement

Knowing which boundaries are mixed is not enough. The project needs a clear hotspot layer that translates architectural coupling into operational risk, so future work can separate systems in a safe order instead of treating every issue as equally urgent.

### Context

- Current behavior:
  - `109` will identify mixed relationships and removal difficulty.
  - The repo already contains likely hotspots in app root orchestration, file loading, state/engine coupling, and projection boundaries.
- Expected behavior:
  - Hotspots should be normalized into a structured artifact with severity, risk, cost, and direction.
- Where this appears:
  - `src/App.tsx`
  - `src/hooks/useGskFile.ts`
  - `src/state/slices/docSlice.ts`
  - `src/core/read-model/*`

### Why This Matters

- Impact:
  - Gives a practical prioritization layer for the final diagnosis.
  - Prevents low-value cleanup from being confused with structural blockers.
- Cost of not doing it:
  - The separation plan may have the right narrative but the wrong execution order.

## Findings

- The hotspot layer should be downstream of the boundary audit, not created independently.
- Severity alone is insufficient; the artifact also needs propagation risk and estimated refactor cost.
- This task should leave machine-readable output for downstream consolidation.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Produce `hotspots.json` with structured entries for classification, severity, risk, anchors, and recommended direction.
- Pros:
  - Machine-readable and reusable in `113`.
  - Forces explicit prioritization.
- Cons:
  - Requires normalization judgments that must stay evidence-backed.
- Effort: M
- Risk: Medium

## Recommended Action

Create `reports/architecture-separation-diagnosis/hotspots.json` and use it to identify the top 3 to 5 structural hotspots that matter most for safe separation.

### Execution Plan

1. Consume `boundary-audit.md` from `109`.
2. Convert mixed or debt-heavy relationships into normalized hotspot entries.
3. Score them by severity, risk, and refactor cost.
4. Capture a recommended direction for each hotspot without prescribing implementation yet.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] `hotspots.json` exists under `reports/architecture-separation-diagnosis/`.
- [ ] Each hotspot includes anchors, systems, severity, risk, refactor cost, and recommended direction.
- [ ] The top structural hotspots are clearly identifiable from the output.
- [ ] Work log updated.

## Work Log

### 2026-03-07 - Task created from architecture diagnosis umbrella

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the hotspot classification task as the operational prioritization layer after the coupling audit.
- Defined structured output requirements so later consolidation can consume the data directly.

**Evidence:**
- Artifacts/paths:
  - `todos/110-pending-p2-hotspot-risk-classification.md`
  - `todos/109-pending-p2-runtime-boundary-and-coupling-audit.md`
  - `todos/099-pending-p2-post-baseline-architecture-followup.md`

## Notes

This task should classify and rank hotspots, not select the final separation sequence. That choice belongs in `111`.
