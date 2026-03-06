---
protocol_version: 2
task_type: "leaf"
status: "complete"
priority: "p2"
issue_id: "106"
title: "postship evidence UX followup"
tags: ["release-0.5.x", "postship", "ux", "evidence"]
dependencies: ["093"]
child_tasks: []
related_tasks: ["098:context"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "standard"
auto_closure: true
commit_confirmed: true
commit_message: "Close 106: document postship evidence UX follow-up"
closed_at: "2026-03-06"
---



# Postship evidence UX followup

Revisit the person-detail evidence surface after the blocker-clearing phase, without reopening core read-model work.

## Problem Statement

The 0.5.0 UX audit left evidence UX as a follow-up concern: the panel exposes projected references, but not a stronger first-class evidence experience. This should be clarified as postship UX debt.

## Findings

- `093` already captured the gap.
- This is not a blocker, but it needs a concrete follow-up decision instead of remaining a vague note.
- The current workspace does preserve event-level `sourceRefs`, `noteRefs`, and `notesInline`.
- The missing piece is not raw reference persistence; it is the lack of a first-class claim-evidence review surface.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Turn the evidence UX concern into a concrete product/technical recommendation with clear scope.
- Pros:
  - Converts an ambiguous debt item into an actionable decision.
- Cons:
  - May require later product/UI refinement work.
- Effort: M
- Risk: Medium

## Recommended Action

Audit the current evidence surface, define the missing first-class UX, and document the minimal postship decision.

### Execution Plan

1. Reconfirm the current evidence surface in the person detail panel.
2. Document what is missing and whether it is product debt or technical debt.
3. Record the recommended next implementation step.

## Acceptance Criteria

- [x] Evidence UX gap is described concretely.
- [x] A clear follow-up recommendation is recorded.
- [x] Work log updated.

## Work Log

### 2026-03-06 - Task created under umbrella protocol v2

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the evidence UX follow-up child under umbrella `098`.

**Evidence:**
- Artifacts/paths:
  - `todos/106-pending-p2-postship-evidence-ux-followup.md`

### 2026-03-06 - Postship evidence UX decision documented

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Reconfirmed the current person workspace surface from the UX audit and code references.
- Documented that event-level references survive today through `sourceRefs`, `noteRefs`, and `notesInline`.
- Recorded the missing scope as a first-class claim-evidence review UX, not a read-model persistence failure.
- Fixed the follow-up recommendation to defer new UI implementation and keep this as explicit postship product debt.

**Evidence:**
- Artifacts/paths:
  - `reports/super-analysis-0.5.0/dimension-4-ux-integrity.md`
  - `reports/super-analysis-0.5.0/fix-plan.md`
  - `src/ui/person/sections/PersonEventsSection.tsx`
  - `src/ui/person/sections/PersonSourcesSection.tsx`

## Decision

- Keep `0.5.x` behavior as-is for person evidence UX.
- Treat the current gap as product/UI debt: the app preserves event references, but it does not expose structured claims and citations as a first-class review surface.
- Defer any first-class claim-evidence workspace to a later scoped design task instead of implying it already exists in the current panel model.

## Notes

Keep this work clearly postship and non-blocking.

### 2026-03-06 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Documented the current evidence UX surface, the missing first-class claim-evidence review layer, and the explicit postship defer decision.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/106-complete-p2-postship-evidence-ux-followup.md

**Next Recommendation (generated at closure):**
- An umbrella now includes this completed task in its child chain: 098 (p2).
- Recommended next step: brief/prepare umbrella 098.
