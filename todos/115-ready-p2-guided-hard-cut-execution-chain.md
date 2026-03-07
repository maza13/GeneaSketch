---
protocol_version: 2
task_type: "umbrella"
status: "ready"
priority: "p2"
issue_id: "115"
title: "Guided hard-cut execution chain"
tags: ["architecture", "hard-cut", "guided-hard-cut", "execution", "boundaries", "followup"]
dependencies: ["099"]
child_tasks: ["116", "117", "118", "119", "120"]
related_tasks: ["112:precedent", "113:precedent", "099:precedent", "048:context"]
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



# Guided hard-cut execution chain

Execute the refined guided hard-cut plan as a controlled implementation chain, without reopening the already-closed diagnosis strategy.

## Problem Statement

The architecture diagnosis chain closed under `099` through `113` already established the valid strategy, hotspot order, and refined guardrails for a phased guided hard cut. What is still missing is an execution-grade TODO chain that turns that plan into an implementation sequence with hard dependencies, explicit validations, artifact expectations, and anti-drift constraints.

This umbrella exists to coordinate that execution chain without allowing scope drift toward cloud, P2P, mobile, API integration, or shared-tree feature delivery. Those concerns may constrain boundaries, but they must not hijack the implementation sequence.

### Context

- Current behavior:
  - `099` is closed as the architecture diagnosis umbrella of record.
  - `112` and `113` define the guided hard-cut secondary plan and final diagnosis packet.
  - `reports/architecture-separation-diagnosis/` now includes refined guardrails, plan-governance expectations, and future-constraint hygiene.
- Expected behavior:
  - A new umbrella should consume the closed diagnosis packet and coordinate five execution phases from `Phase 0` through `Phase 4`.
  - Each phase should produce code, evidence, validation, and live-map updates before the next phase can begin.
- Where this appears:
  - `reports/architecture-separation-diagnosis/guided-hard-cut-plan.md`
  - `reports/architecture-separation-diagnosis/executive-summary.md`
  - `reports/architecture-separation-diagnosis/findings.json`
  - `src/App.tsx`
  - `src/hooks/useGskFile.ts`
  - `src/state/slices/docSlice.ts`
  - `src/core/read-model/*`

### Why This Matters

- Impact:
  - Turns the hard-cut plan into a decision-complete execution chain.
  - Makes phase order, validations, and evidence requirements explicit.
  - Reduces the chance of structural regressions or scope drift while executing high-risk architecture work.
- Cost of not doing it:
  - The team may start implementing the hard cut from the right diagnosis but with inconsistent execution standards.
  - Future-facing concerns may leak back into mixed runtime loci and recreate debt while the cleanup is underway.

## Findings

- The diagnosis packet is complete and should be consumed, not reopened.
- The refined plan already includes cross-phase invariants, live-map expectations, and future-constraint hygiene.
- The biggest remaining risk is no longer strategy selection; it is execution drift.
- A v2 umbrella with strict child order is the correct control structure for this chain.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Create one execution umbrella plus five phase tasks covering `Phase 0` through `Phase 4`, all initially `pending`.
- Pros:
  - Keeps execution order explicit.
  - Preserves the diagnosis packet as precedent instead of mutating it into a live execution record.
  - Gives each phase a clear validation and evidence contract.
- Cons:
  - Requires disciplined closure criteria and artifact updates after each phase.
- Effort: L
- Risk: High

## Recommended Action

Open this chain only through `todo:brief` and `todo:prepare`. Execute child tasks strictly in dependency order. Do not start a later phase until the current phase satisfies its acceptance criteria, updates the required architecture artifacts, and leaves a clear rollback point.

### Execution Plan

1. Start with `116` to convert the diagnosis into operational execution guardrails.
2. Execute `117` to reduce runtime-edge orchestration concentration in `App.tsx` and `useGskFile.ts`.
3. Execute `118` to narrow the `State Manager <-> GSchema Engine <-> Read Model` knot.
4. Execute `119` to narrow the AI write bridge without violating the same trust rules expected for future external/shared changes.
5. Execute `120` to isolate or retire the legacy read-model fallback only after upstream seams are cleaner.
6. Close this umbrella only when all child tasks are complete, validations ran, the live map was maintained, and the packet still aligns with the execution reality.

## Orchestration Guide

### Hard Dependencies

- `099` must remain complete as the precedent diagnosis umbrella of record.

### Child Execution Order

1. `116` - lock scope, guardrails, live-map operation, and future-constraint dispositions before touching runtime structure.
2. `117` - untangle shell and file orchestration first so deeper core cleanup has cleaner seams.
3. `118` - narrow the store/engine/read-model knot only after runtime-edge concentration is reduced.
4. `119` - narrow the AI write bridge after the main mutation/projection knot is cleaner.
5. `120` - isolate or retire the legacy read-model fallback last, once upstream ambiguity is already reduced.

### Related Context

- `112:precedent` because it contains the guided hard-cut secondary plan this chain must execute rather than reinterpret.
- `113:precedent` because it contains the final diagnosis packet and readiness verdict.
- `099:precedent` because it is the umbrella that closed the diagnostic chain this execution plan now consumes.
- `048:context` because hard-cut concerns remain historically relevant, but this chain should follow the newer guided plan rather than older generic hard-cut instincts.

### Exit Rule

- Close this umbrella only after `116` through `120` are complete, all required validations have been executed, the live map has been maintained phase by phase, and the architecture packet remains aligned with the actual execution outcome.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] Child tasks `116` through `120` exist and are linked.
- [ ] The chain defines guardrails, execution order, validations, and evidence requirements per phase.
- [ ] The umbrella explicitly prevents scope drift toward cloud, P2P, mobile, API implementation, or shared-tree feature delivery.
- [ ] Work log initial entry recorded.

## Work Log

### 2026-03-07 - Execution umbrella created from approved hard-cut plan

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Materialized a new v2 umbrella as follow-up execution chain to the closed diagnosis packet.
- Wired child tasks `116` through `120` in strict dependency order.
- Recorded the execution constraint that future-facing concerns may shape boundaries but must not expand immediate implementation scope.

**Evidence:**
- Artifacts/paths:
  - `todos/115-pending-p2-guided-hard-cut-execution-chain.md`
  - `todos/116-pending-p2-phase-0-scope-freeze-and-boundary-guardrails.md`
  - `todos/117-pending-p2-phase-1-shell-and-file-orchestration-untangling.md`
  - `todos/118-pending-p2-phase-2-state-engine-and-read-model-boundary-narrowing.md`
  - `todos/119-pending-p2-phase-3-ai-write-bridge-narrowing.md`
  - `todos/120-pending-p2-phase-4-legacy-read-model-fallback-retirement-preparation.md`

## Notes

This umbrella executes the refined guided hard-cut plan. It does not reopen the diagnosis strategy, and it must not be used as a backdoor to start cloud, P2P, API, mobile, or shared-tree implementation scope.

### 2026-03-07 - Umbrella prepared via todo:prepare

**By:** Codex

**Status Transition:**
- from: pending
- to: ready

**Actions:**
- Reviewed hard dependencies before opening the umbrella.
- Confirmed child execution order: 116, 117, 118, 119, 120.
- Considered related context: 112:precedent, 113:precedent, 099:precedent, 048:context.
- Activated eligible child tasks: 116.
- Left blocked child tasks pending: 117 (blocked by 116), 118 (blocked by 117), 119 (blocked by 118), 120 (blocked by 119).

**Evidence:**
- Hard dependencies complete: 099
- Activated: 116
- Blocked: 117 (blocked by 116), 118 (blocked by 117), 119 (blocked by 118), 120 (blocked by 119)

### 2026-03-07 - Umbrella prepared via todo:prepare

**By:** Codex

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Reviewed hard dependencies before opening the umbrella.
- Confirmed child execution order: 116, 117, 118, 119, 120.
- Considered related context: 112:precedent, 113:precedent, 099:precedent, 048:context.
- Activated eligible child tasks: 117.
- Left blocked child tasks pending: 118 (blocked by 117), 119 (blocked by 118), 120 (blocked by 119).

**Evidence:**
- Hard dependencies complete: 099
- Activated: 117
- Blocked: 118 (blocked by 117), 119 (blocked by 118), 120 (blocked by 119)
