---
protocol_version: 2
task_type: "leaf"
status: "complete"
priority: "p2"
issue_id: "111"
title: "Separation sequence options"
tags: ["architecture", "diagnosis", "separation", "sequencing", "hard-cut"]
dependencies: ["110"]
child_tasks: []
related_tasks: ["099:context", "048:context", "104:precedent"]
owner: "codex"
created_at: "2026-03-07"
updated_at: "2026-03-07"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: true
commit_message: "Close 111: select separation sequence strategy"
closed_at: "2026-03-07"
---



# Separation sequence options

Design and compare credible system-separation sequences, then choose the one that best balances solidity, architectural clarity, and future hard-cut readiness.

## Problem Statement

Once the project knows where the hotspots are, it still needs to decide how to separate the system without destabilizing the runtime. That requires comparing multiple sequences, not jumping directly from diagnosis to a single plan.

### Context

- Current behavior:
  - The repo has architecture baseline, boundary audit, and hotspot layers, but not yet a decision on sequence.
  - There is user intent for a guided hard-cut style, but not for a reckless or immediate cut.
- Expected behavior:
  - The task should compare at least conservative, guided hard-cut, and aggressive sequences and recommend one.
- Where this appears:
  - `reports/architecture-separation-diagnosis/*`
  - `todos/048-pending-p2-hard-cut-legacy-compat-060.md`

### Why This Matters

- Impact:
  - Prevents planning bias toward the loudest hotspot.
  - Makes the final plan defensible and explicit about tradeoffs.
- Cost of not doing it:
  - The next phase may inherit an undocumented strategy decision.

## Findings

- The final sequence should be a choice, not a default assumption.
- The user preference favors a guided hard-cut posture, but the recommendation must still be evidence-based.
- This task needs to justify why one sequence is better than the others under the current risk profile.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Produce `separation-options.md` with three candidate sequences, compare them against current hotspots, and select one recommended path.
- Pros:
  - Makes tradeoffs visible.
  - Creates a bridge from diagnosis to plan without collapsing them.
- Cons:
  - Adds one more explicit decision layer before the final plan.
- Effort: M
- Risk: Low

## Recommended Action

Create `reports/architecture-separation-diagnosis/separation-options.md` and use it to recommend one separation sequence for the downstream guided hard-cut plan.

### Execution Plan

1. Consume `hotspots.json` and the upstream artifacts.
2. Define three sequence candidates: conservative, guided hard cut, and aggressive.
3. Compare them using risk, prerequisites, frozen systems, deferred work, and expected benefits.
4. Select one sequence and justify the recommendation.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [x] `separation-options.md` exists under `reports/architecture-separation-diagnosis/`.
- [x] It compares conservative, guided hard-cut, and aggressive sequences.
- [x] It recommends one sequence with explicit tradeoff rationale.
- [x] Work log updated.

## Work Log

### 2026-03-07 - Task created from architecture diagnosis umbrella

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the separation-sequence comparison task downstream of hotspot classification.
- Locked the required comparison set so the later guided plan cannot skip explicit tradeoffs.

**Evidence:**
- Artifacts/paths:
  - `todos/111-pending-p2-separation-sequence-options.md`
  - `todos/110-pending-p2-hotspot-risk-classification.md`
  - `todos/099-pending-p2-post-baseline-architecture-followup.md`

### 2026-03-07 - Separation sequence comparison completed

**By:** Codex

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Produced the sequence comparison report under `reports/architecture-separation-diagnosis/`.
- Compared conservative, guided hard-cut, and aggressive separation routes against the current hotspot profile.
- Selected one recommended route and fixed the strategic handoff for `112`.

**Evidence:**
- Artifacts/paths:
  - `reports/architecture-separation-diagnosis/separation-options.md`
  - `reports/architecture-separation-diagnosis/hotspots.json`
  - `todos/111-ready-p2-separation-sequence-options.md`

## Notes

This task recommends a sequence but should not yet prescribe the complete phase plan. That belongs in `112`.

### 2026-03-07 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Compared conservative, guided hard-cut, and aggressive separation routes against the current hotspot evidence and fixed the strategic recommendation for task 112.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/111-complete-p2-separation-sequence-options.md

**Next Recommendation (generated at closure):**
- Direct next tasks unblocked by this closure: 112 (p2).
- Recommended start: 112 (p2).
