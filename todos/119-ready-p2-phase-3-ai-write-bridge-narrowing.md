---
protocol_version: 2
task_type: "leaf"
status: "ready"
priority: "p2"
issue_id: "119"
title: "Phase 3 AI write-bridge narrowing"
tags: ["architecture", "phase-3", "ai", "write-bridge", "mutation-surface", "auditability"]
dependencies: ["118"]
child_tasks: []
related_tasks: ["115:context", "112:precedent", "113:precedent", "099:precedent", "110:precedent"]
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


# Phase 3 AI write-bridge narrowing

Preserve AI on the read side while reducing the heaviness and special-case nature of its write path.

## Problem Statement

AI flows currently reason over the projected document boundary, which is correct, but they still re-enter the runtime through a heavier document reapplication bridge than the desired long-term mutation surface. If that bridge remains broad, AI becomes a structurally privileged path that later conflicts with the same trust, audit, and mutation rules expected for future external or shared changes.

This phase must narrow that bridge without breaking the read-side AI contract and without inventing a separate mutation regime just for AI.

### Context

- Current behavior:
  - AI reads from the read model but writes back through heavier conversion/reapplication flows.
  - The current bridge is acceptable short-term, but too broad for long-term architecture cleanliness.
  - Future external/shared changes are expected to follow validated and auditable entry paths.
- Expected behavior:
  - AI keeps using the projected boundary for reasoning.
  - AI writes through a narrower, more auditable mutation/application surface.
  - AI no longer behaves as a structural exception.
- Where this appears:
  - `src/hooks/useAiAssistant.ts`
  - `src/App.tsx`
  - `src/core/gschema/GedcomBridge.ts`
  - `src/state/slices/docSlice.ts`
  - `src/core/ai/*`

### Why This Matters

- Impact:
  - Reduces one of the remaining broad re-entry paths in the runtime.
  - Aligns AI with the same trust and audit model required for future external changes.
  - Prevents AI from becoming a permanent architectural shortcut.
- Cost of not doing it:
  - AI write flows would continue to distort the target mutation surface.
  - Later sharing/import/sync work would inherit inconsistent trust rules.

## Findings

- The read-side AI contract should remain stable.
- The problem is not AI reasoning; it is the breadth of AI write-back.
- This phase should follow the narrowing of the main state/engine/read-model knot.
- Future external or shared mutation rules should not be weaker than AI rules, and AI rules should not be special-case looser.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Preserve the read-side contract and replace the broadest AI write-back path with a narrower, auditable application surface.
- Pros:
  - Reduces structural debt without weakening AI capability boundaries.
  - Keeps the architecture coherent for later external/shared apply paths.
  - Improves traceability and reversibility.
- Cons:
  - Requires care to avoid breaking current AI apply flows.
- Effort: M
- Risk: Medium

## Recommended Action

Keep AI attached to the read-model boundary for reasoning, but narrow the write-back path so it no longer relies on the broadest available runtime route and instead aligns with a stricter mutation/application contract.

### Execution Plan

1. Inventory current AI re-entry and mutation application paths.
2. Reduce reliance on broad document reapplication where a narrower audited surface is possible.
3. Preserve traceability, reversibility, and contract clarity for AI-applied changes.
4. Verify that AI now follows the same trust and audit expectations intended for future external/shared changes.
5. Update the `live map` and capture evidence of the narrower bridge.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] AI still reasons on the projected/read-side boundary.
- [ ] AI write-back no longer depends on the broadest route by default.
- [ ] The AI mutation surface is narrower and more auditable.
- [ ] AI behavior does not bypass the mutation rules intended for external/shared changes.
- [ ] Work log records tests, evidence, and live-map updates.

## Work Log

### 2026-03-07 - Phase 3 task created from approved execution chain

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the AI write-bridge narrowing phase for the guided hard-cut chain.
- Anchored the task to preserving AI read-side correctness while reducing write-back breadth.
- Recorded that AI must converge toward the same trust/audit discipline expected for future external or shared changes.

**Evidence:**
- Artifacts/paths:
  - `todos/119-pending-p2-phase-3-ai-write-bridge-narrowing.md`
  - `src/hooks/useAiAssistant.ts`
  - `src/core/ai`
  - `reports/architecture-separation-diagnosis/guided-hard-cut-plan.md`

## Notes

This phase should stay blocked until `118` completes. It should not invent AI-specific architectural exceptions.
