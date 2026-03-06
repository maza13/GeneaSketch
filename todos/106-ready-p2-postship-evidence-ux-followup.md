---
protocol_version: 2
task_type: "leaf"
status: "ready"
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
commit_confirmed: false
commit_message: null
closed_at: null
---


# Postship evidence UX followup

Revisit the person-detail evidence surface after the blocker-clearing phase, without reopening core read-model work.

## Problem Statement

The 0.5.0 UX audit left evidence UX as a follow-up concern: the panel exposes projected references, but not a stronger first-class evidence experience. This should be clarified as postship UX debt.

## Findings

- `093` already captured the gap.
- This is not a blocker, but it needs a concrete follow-up decision instead of remaining a vague note.

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

- [ ] Evidence UX gap is described concretely.
- [ ] A clear follow-up recommendation is recorded.
- [ ] Work log updated.

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

## Notes

Keep this work clearly postship and non-blocking.
