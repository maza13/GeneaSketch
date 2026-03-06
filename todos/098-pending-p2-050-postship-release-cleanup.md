---
status: "pending"
priority: "p2"
issue_id: "098"
title: "050-postship-release-cleanup"
tags: ["release-0.5.x", "postship", "ux", "text-integrity"]
dependencies: ["096"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "standard"
auto_closure: true
commit_confirmed: false
commit_message: null
closed_at: null
---

# 0.5.x postship release cleanup

Capture the non-blocking release debt that should be handled after the 0.5.0 blocker-clearing bundle, without activating that work yet.

## Problem Statement

The blocker set for 0.5.0 is now cleared, but several follow-up items remain open in UX polish and text integrity. Those items should stay visible and structured without being pulled into the release-closing commit or marked as ready prematurely.

### Context

- Current behavior:
  - 0.5.0 is now release-eligible with explicit postship debt.
  - Remaining issues are documented in the updated Super Analysis packet.
- Expected behavior:
  - Postship items are tracked in one place and remain pending until intentionally scheduled.
- Where this appears:
  - `reports/super-analysis-0.5.0/executive-summary.md`
  - `reports/super-analysis-0.5.0/findings.json`

### Why This Matters

- Impact:
  - Keeps postship work visible without contaminating the blocker-clearing phase.
- Cost of not doing it:
  - Follow-up cleanup can get lost or accidentally mixed into unrelated work.

## Findings

- Current postship debt includes:
  - mojibake in `src/core/ai/review.ts`
  - mojibake in `src/core/ai/safety.ts`
  - mojibake in `src/core/diagnostics/analyzer.ts`
  - unresolved decision on first-class claim evidence UX
  - hydration flicker risk still not instrumented or retired
- None of these items blocks the current 0.5.0 release packet.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Keep one pending umbrella for the postship cleanup batch and activate it only after the current phase is committed and frozen.
- Pros:
  - Clear separation between blocker work and cleanup work.
  - Easier release-scope discipline.
- Cons:
  - Requires intentional later triage.
- Effort: M
- Risk: Low

## Recommended Action

Leave this task in `pending` as the entry point for 0.5.x postship cleanup.

### Execution Plan

1. Reconfirm the release packet remains unchanged after the blocker-clearing commit.
2. Split the work into executable child tasks only when postship scheduling is approved.
3. Prioritize text-integrity cleanup before broader UX refinement.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] Postship debt remains tracked in one pending task.
- [ ] No postship cleanup work is marked `ready` yet.
- [ ] Scope is limited to non-blocking 0.5.x follow-up work.

## Work Log

### 2026-03-06 - Task created as postship placeholder

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created a dedicated pending task for non-blocking 0.5.x follow-up work.
- Kept this track separate from the blocker-clearing implementation commit.

**Evidence:**
- Artifacts/paths:
  - `todos/098-pending-p2-050-postship-release-cleanup.md`
  - `reports/super-analysis-0.5.0/executive-summary.md`

## Notes

This task must not move to `ready` until postship work is explicitly approved.
