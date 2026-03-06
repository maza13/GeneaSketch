---
protocol_version: 2
task_type: "leaf"
status: "complete"
priority: "p2"
issue_id: "105"
title: "postship runtime text integrity cleanup"
tags: ["release-0.5.x", "postship", "encoding", "runtime"]
dependencies: ["096"]
child_tasks: []
related_tasks: ["095:precedent"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "s"
complexity: "standard"
auto_closure: true
commit_confirmed: true
commit_message: "Close 105: clean remaining runtime text integrity issues"
closed_at: "2026-03-06"
---



# Postship runtime text integrity cleanup

Clean the remaining non-blocking mojibake in runtime files identified by the 0.5.0 analysis.

## Problem Statement

The release packet identified runtime mojibake in `review.ts`, `safety.ts`, and `analyzer.ts`. These issues no longer block 0.5.0, but they still degrade UX and diagnostics quality.

## Findings

- `095` already narrowed the affected runtime files.
- `fastTrack.ts` was already corrected during blocker clearing; this task must only handle the remaining non-blocking files.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Normalize text and strings in the affected files, then rerun the encoding audit.
- Pros:
  - Small, high-confidence cleanup.
- Cons:
  - Still requires careful review of user-visible wording.
- Effort: S
- Risk: Low

## Recommended Action

Fix the remaining runtime mojibake and rerun the encoding scan subset before closure.

### Execution Plan

1. Normalize visible strings in the affected files.
2. Run targeted tests and the encoding audit subset.
3. Update the release debt inventory if anything remains.

## Acceptance Criteria

- [x] Remaining runtime mojibake is removed from the targeted files.
- [x] Verification rerun is captured in the work log.
- [x] Work log updated.

## Work Log

### 2026-03-06 - Task created under umbrella protocol v2

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the first postship cleanup child under umbrella `098`.

**Evidence:**
- Artifacts/paths:
  - `todos/105-pending-p2-postship-runtime-text-integrity-cleanup.md`

### 2026-03-06 - Runtime text integrity cleanup completed

**By:** Codex

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Normalized remaining mojibake strings in `review.ts`, `safety.ts`, and `analyzer.ts`.
- Verified that the targeted files no longer contain the mojibake patterns tracked by the postship audit.
- Re-ran the focused diagnostics and AI safety tests after the cleanup.

**Evidence:**
- Command: `rg -n "Ã|â|ΓÇ|�" src/core/ai/review.ts src/core/ai/safety.ts src/core/diagnostics/analyzer.ts`
- Result: no matches
- Command: `npx vitest run src/tests/diagnostics/analyzer.test.ts src/tests/ai.safety-wizard.test.ts`
- Result: 2 files, 4 tests passed
- Artifacts/paths:
  - `src/core/ai/review.ts`
  - `src/core/ai/safety.ts`
  - `src/core/diagnostics/analyzer.ts`
  - `todos/105-ready-p2-postship-runtime-text-integrity-cleanup.md`

## Notes

Run this child first when `098` is opened.

### 2026-03-06 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Removed remaining runtime mojibake from review, safety, and analyzer, and reran focused verification.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/105-complete-p2-postship-runtime-text-integrity-cleanup.md

**Next Recommendation (generated at closure):**
- An umbrella now includes this completed task in its child chain: 098 (p2).
- Recommended next step: brief/prepare umbrella 098.
