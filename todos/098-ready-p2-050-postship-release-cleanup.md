---
protocol_version: 2
task_type: "umbrella"
status: "ready"
priority: "p2"
issue_id: "098"
title: "0.5.x postship release cleanup"
tags: ["release-0.5.x", "postship", "ux", "text-integrity"]
dependencies: ["096"]
child_tasks: ["105", "106", "107"]
related_tasks: ["093:context", "095:precedent"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: false
commit_message: null
closed_at: null
---


# 0.5.x postship release cleanup

Coordinate the non-blocking cleanup work that should happen after the 0.5.0 blocker-clearing bundle, without opening execution now.

## Problem Statement

The blocker set for 0.5.0 is cleared, but several follow-up items remain open in text integrity, evidence UX, and hydration polish. This umbrella exists so the next phase has an explicit order instead of re-discovering the cleanup scope later.

### Context

- Current behavior:
  - 0.5.0 is now release-eligible with explicit postship debt.
  - The remaining work is non-blocking and must stay out of the blocker-clearing bundle.
- Expected behavior:
  - The postship cleanup track shows the recommended order, supporting context, and next child to activate when the phase is intentionally opened.
- Where this appears:
  - `reports/super-analysis-0.5.0/executive-summary.md`
  - `reports/super-analysis-0.5.0/findings.json`

### Why This Matters

- Impact:
  - Preserves release-scope discipline while keeping follow-up work visible.
- Cost of not doing it:
  - Postship cleanup will drift or get mixed with later architecture work.

## Findings

- Remaining postship debt includes:
  - mojibake in `src/core/ai/review.ts`
  - mojibake in `src/core/ai/safety.ts`
  - mojibake in `src/core/diagnostics/analyzer.ts`
  - unresolved first-class evidence UX decision
  - workspace hydration flicker risk not yet instrumented
- `095` already established the text-integrity audit baseline.
- `093` already established the UX/interconnection baseline for evidence and hydration risk.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Keep one umbrella in `pending` with three ordered children: text integrity, evidence UX follow-up, and hydration flicker instrumentation.
- Pros:
  - Makes the future cleanup phase predictable.
  - Separates postship quality work from release blockers and 0.6.0 architecture work.
- Cons:
  - Adds explicit backlog structure now.
- Effort: M
- Risk: Low

## Recommended Action

Use this umbrella as the orchestration entry point for postship cleanup. Start it with `todo:brief` and `todo:prepare`, then execute child tasks only when explicitly approved.

### Execution Plan

1. Reconfirm the release packet remains frozen after blocker-clearing work.
2. Start with the text-integrity child, because it is the narrowest and least coupled cleanup.
3. Continue with the evidence UX follow-up after text integrity is stable.
4. Finish with hydration flicker instrumentation and verification.

## Orchestration Guide

### Hard Dependencies

- `096` must remain complete and unchanged because this umbrella consumes the final 0.5.0 release packet.

### Child Execution Order

1. `105` - clean the remaining runtime mojibake so user-visible text and AI surfaces are stable first.
2. `106` - revisit evidence UX after text integrity is clean and the read model terminology is stable.
3. `107` - instrument and retire the hydration flicker risk after the UI debt is narrowed.

### Related Context

- `095:precedent` - provides the encoding audit that identified the runtime files still affected.
- `093:context` - provides the UX baseline for evidence and hydration concerns.

### Exit Rule

- Close this umbrella only after `105`, `106`, and `107` are complete and the postship scope remains explicitly non-blocking to release history.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] Postship debt is split into ordered child tasks.
- [ ] Related context for encoding and UX is captured explicitly.
- [ ] No child task is executed automatically when the umbrella is started.
- [ ] Work log updated.

## Work Log

### 2026-03-06 - Migrated to umbrella protocol v2

**By:** Codex

**Status Transition:**
- from: pending
- to: pending

**Actions:**
- Converted this task from a placeholder into a protocol v2 umbrella.
- Declared explicit child order and related context for the postship cleanup phase.

**Evidence:**
- Artifacts/paths:
  - `todos/098-pending-p2-050-postship-release-cleanup.md`
  - `todos/105-pending-p2-postship-runtime-text-integrity-cleanup.md`
  - `todos/106-pending-p2-postship-evidence-ux-followup.md`
  - `todos/107-pending-p2-postship-hydration-flicker-instrumentation.md`

## Notes

This umbrella must remain pending until postship work is explicitly opened.

### 2026-03-06 - Umbrella prepared via todo:prepare

**By:** Codex

**Status Transition:**
- from: pending
- to: ready

**Actions:**
- Reviewed hard dependencies before opening the umbrella.
- Confirmed child execution order: 105, 106, 107.
- Considered related context: 093:context, 095:precedent.
- Activated eligible child tasks: 105, 106, 107.
- Left blocked child tasks pending: none.

**Evidence:**
- Hard dependencies complete: 096
- Activated: 105, 106, 107
- Blocked: none
