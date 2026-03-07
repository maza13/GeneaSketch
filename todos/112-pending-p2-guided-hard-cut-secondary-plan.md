---
protocol_version: 2
task_type: "leaf"
status: "pending"
priority: "p2"
issue_id: "112"
title: "Guided hard-cut secondary plan"
tags: ["architecture", "diagnosis", "planning", "hard-cut", "secondary-plan"]
dependencies: ["111"]
child_tasks: []
related_tasks: ["099:context", "048:context", "111:precedent"]
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

# Guided hard-cut secondary plan

Materialize the selected separation sequence into a complete secondary plan with phases, gates, dependencies, and opening criteria for a future execution phase.

## Problem Statement

The project needs more than a list of options. It needs one deliberate, evidence-backed secondary plan that explains how a future hard cut would be opened safely, what must be frozen or stabilized first, and which gates must be passed before execution starts.

### Context

- Current behavior:
  - `111` will recommend one separation sequence, but not yet convert it into a full plan.
  - The user wants solidity first, so the hard-cut posture must remain guided and evidence-driven.
- Expected behavior:
  - The output should be a complete secondary plan, not a backlog or TODO chain.
- Where this appears:
  - `reports/architecture-separation-diagnosis/separation-options.md`
  - `reports/architecture-separation-diagnosis/hotspots.json`

### Why This Matters

- Impact:
  - Gives the project a safe opening strategy for later architecture execution.
  - Prevents the next phase from having to reconstruct phase order, gates, or prerequisites.
- Cost of not doing it:
  - The diagnosis packet would still leave the most important action question unresolved.

## Findings

- The secondary plan must remain diagnostic and strategic, not executable task decomposition.
- It should be downstream of the chosen sequence, not written independently.
- The plan must make explicit what is frozen, what is targeted, and what signals permit execution to begin.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Produce `guided-hard-cut-plan.md` with objective, guiding principle, target systems, temporary freezes, phases, gates, dependencies, rollback concept, and opening signals.
- Pros:
  - Converts the diagnosis into a direct next-phase substrate.
  - Keeps scope clear by avoiding premature TODO generation.
- Cons:
  - Requires disciplined boundaries so it does not become an implementation backlog.
- Effort: M
- Risk: Medium

## Recommended Action

Create `reports/architecture-separation-diagnosis/guided-hard-cut-plan.md` as the single secondary plan that a future execution phase can adopt or refine.

### Execution Plan

1. Consume the recommended sequence from `111`.
2. Define the objective, guiding principle, and target/frozen systems.
3. Split the plan into explicit phases with dependencies and exit gates.
4. Add rollback concept and readiness signals for opening an execution phase.
5. Keep the output strategic and implementation-ready, but not yet materialized as new TODOs.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] `guided-hard-cut-plan.md` exists under `reports/architecture-separation-diagnosis/`.
- [ ] The plan includes phases, gates, dependencies, target systems, frozen systems, and readiness signals.
- [ ] The output is a secondary plan, not a generic backlog or executable child chain.
- [ ] Work log updated.

## Work Log

### 2026-03-07 - Task created from architecture diagnosis umbrella

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the guided hard-cut secondary plan task after the sequence-comparison layer.
- Fixed the task boundary so it produces one strategic plan without opening a second umbrella automatically.

**Evidence:**
- Artifacts/paths:
  - `todos/112-pending-p2-guided-hard-cut-secondary-plan.md`
  - `todos/111-pending-p2-separation-sequence-options.md`
  - `todos/099-pending-p2-post-baseline-architecture-followup.md`

## Notes

This task is the plan handoff point. It should not generate executable tasks on its own.
