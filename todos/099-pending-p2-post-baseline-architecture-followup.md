---
protocol_version: 2
task_type: "leaf"
status: "pending"
priority: "p2"
issue_id: "099"
title: "Post-baseline architecture followup"
tags: ["architecture", "followup", "systems", "boundaries"]
dependencies: ["100"]
child_tasks: []
related_tasks: ["097:precedent", "098:parallel", "048:context"]
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

# Post-baseline architecture followup

Preserve the architectural follow-up questions that emerge after the ecosystem baseline from `100`, without prematurely turning them into a `0.6.0` hard-cut plan.

## Problem Statement

The ecosystem analysis from `100` established the taxonomy, dependency flow, format-vs-engine boundary, and coupling classification of the project. Some architectural follow-up questions remain relevant, but they should not be framed as immediate hard-cut execution for `0.6.0` while the project is still closing the current phase and preparing to move cleanly into `0.5.0`.

### Context

- Current behavior:
  - `100` is now complete and provides the architectural baseline.
  - The project still needs a solid, stable foundation before any future version-specific hard-cut planning.
- Expected behavior:
  - Architectural follow-up remains visible as context, but not as an active migration track.
- Where this appears:
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`
  - `todos/100-complete-p2-gsk-ecosystem-architecture-analysis.md`

### Why This Matters

- Impact:
  - Keeps structural project questions visible without forcing roadmap pressure from a future version.
- Cost of not doing it:
  - The system baseline may be forgotten, or future work may jump too quickly from architecture analysis into version-specific migration planning.

## Findings

- `100` already answers the core system-analysis questions from `N0011`.
- `097` remains an important precedent because it clarified the Visual Engine vs App Shell distinction.
- `098` is a closer next track because it addresses postship cleanup without changing the architecture baseline.
- Any future `0.6.0` hard-cut planning should happen later, after intentional approval and after the project foundation is considered stable.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Keep one passive umbrella as a placeholder for future architecture follow-up after the baseline, without splitting it into executable children yet.
- Pros:
  - Preserves context without forcing timing.
  - Prevents premature roadmap coupling to `0.6.0`.
- Cons:
  - Requires later intentional triage before execution.
- Effort: M
- Risk: Low

## Recommended Action

Leave this umbrella in `pending` as a post-baseline architecture follow-up placeholder. Do not prepare or execute it until the project explicitly chooses to open a deeper architecture phase.

### Execution Plan

1. Keep `100` as the architecture baseline of record.
2. Use `098` or other nearer tasks first when the goal is to stabilize the current project phase.
3. Revisit this umbrella only when the team intentionally wants to convert architecture findings into a new planning phase.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [ ] The post-baseline architecture follow-up is preserved in one pending umbrella.
- [ ] The task no longer frames itself as immediate `0.6.0` hard-cut preparation.
- [ ] Related context to `097`, `098`, and future hard-cut work is explicit.
- [ ] Work log updated.

## Work Log

### 2026-03-06 - Reframed after baseline consolidation

**By:** Codex

**Status Transition:**
- from: pending
- to: pending

**Actions:**
- Rewrote this task so it no longer pushes immediate `0.6.0` hard-cut planning.
- Removed the derived child tasks because they were too early for the current project phase.
- Repositioned this task as passive architecture follow-up after the completed ecosystem baseline.
- Converted it from `umbrella` to passive `leaf`, because the protocol only treats umbrellas as executable coordinators with real child tasks.

**Evidence:**
- Artifacts/paths:
  - `todos/099-pending-p2-post-baseline-architecture-followup.md`
  - `todos/100-complete-p2-gsk-ecosystem-architecture-analysis.md`
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`

## Notes

This task should remain pending and passive until a later architecture phase is intentionally opened.
