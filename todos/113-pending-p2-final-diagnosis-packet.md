---
protocol_version: 2
task_type: "leaf"
status: "pending"
priority: "p2"
issue_id: "113"
title: "Final diagnosis packet"
tags: ["architecture", "diagnosis", "reporting", "packet", "hard-cut"]
dependencies: ["108", "109", "110", "111", "112"]
child_tasks: []
related_tasks: ["099:context", "100:precedent", "112:precedent"]
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

# Final diagnosis packet

Consolidate the architecture separation diagnosis into one final packet that states the current structural condition of the system and the recommended next-phase opening criteria.

## Problem Statement

The map, audit, hotspot layer, sequence comparison, and secondary plan only become actionable if they end in one final diagnosis packet that answers the core question: what must be separated, in what order, with what risk, and under what gates.

### Context

- Current behavior:
  - The upstream child tasks produce diagnostic components, but not yet one closing architecture packet.
  - `099` should close only after one final source of truth exists under `reports/architecture-separation-diagnosis/`.
- Expected behavior:
  - The final packet should normalize findings, summarize the architecture state, and state whether the project is safe enough to open a later execution phase.
- Where this appears:
  - `reports/architecture-separation-diagnosis/*`
  - `todos/099-pending-p2-post-baseline-architecture-followup.md`

### Why This Matters

- Impact:
  - Gives the project one architecture recommendation of record.
  - Prevents the diagnosis phase from ending as fragmented artifacts.
- Cost of not doing it:
  - The next phase would still need to manually synthesize the chain.

## Findings

- This task must be the only child that declares the final diagnosis and packet completeness for the `099` umbrella.
- The packet should remain diagnostic and should not silently launch a new workstream.
- Machine-readable findings should accompany the narrative summary.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Produce `executive-summary.md` and `findings.json`, validate them against the upstream artifacts, and state a final architecture readiness verdict.
- Pros:
  - Leaves a single closing recommendation.
  - Makes the umbrella closure criteria objective.
- Cons:
  - Requires careful normalization of evidence from all upstream tasks.
- Effort: M
- Risk: Medium

## Recommended Action

Create the final packet under `reports/architecture-separation-diagnosis/` and use it to close `099` only when the diagnosis is complete and explicitly actionable.

### Execution Plan

1. Consume the outputs of `108` through `112`.
2. Produce `executive-summary.md` and `findings.json`.
3. State the current architecture condition, top hotspots, top preserved boundaries, top removable bridges, recommended sequence, and opening criteria for the next phase.
4. Link the final packet back to `099`.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] `executive-summary.md` and `findings.json` exist under `reports/architecture-separation-diagnosis/`.
- [ ] The final packet synthesizes `108` through `112` and states an explicit readiness verdict.
- [ ] `113` is the only child task that declares the final diagnosis packet complete.
- [ ] Work log updated.

## Work Log

### 2026-03-07 - Task created from architecture diagnosis umbrella

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the final consolidation task for the architecture diagnosis chain.
- Locked it as the only child allowed to declare final packet completion for umbrella `099`.

**Evidence:**
- Artifacts/paths:
  - `todos/113-pending-p2-final-diagnosis-packet.md`
  - `todos/099-pending-p2-post-baseline-architecture-followup.md`
  - `reports/architecture-separation-diagnosis/README.md`

## Notes

This task should be the only place that states the final diagnosis verdict for the chain.
