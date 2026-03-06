---
protocol_version: 2
task_type: "leaf"
status: "pending"
priority: "p2"
issue_id: "107"
title: "postship hydration flicker instrumentation"
tags: ["release-0.5.x", "postship", "workspace-profile", "ux"]
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

# Postship hydration flicker instrumentation

Instrument and verify the workspace hydration flicker risk left as follow-up from the 0.5.0 UX audit.

## Problem Statement

The UX audit did not prove a functional bug in hydration flicker, but it also did not retire the risk. This task exists to add evidence and decide whether any real cleanup is needed.

## Findings

- `093` marked hydration as functionally pass with residual architectural risk.
- This is a sequencing and observability task, not a core release blocker.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Add focused instrumentation or reproduction coverage to determine if any flicker remains.
- Pros:
  - Converts residual risk into evidence.
- Cons:
  - May confirm there is no bug and still consume time.
- Effort: M
- Risk: Low

## Recommended Action

Measure the hydration path and record whether a reproducible flicker exists, then either retire or promote the issue.

### Execution Plan

1. Reconstruct the hydration flow from the prior UX audit.
2. Add instrumentation or repro coverage.
3. Document whether the risk is real, retired, or promoted.

## Acceptance Criteria

- [ ] Hydration flicker risk is either reproduced or explicitly retired.
- [ ] Evidence is captured in the work log.
- [ ] Work log updated.

## Work Log

### 2026-03-06 - Task created under umbrella protocol v2

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the hydration flicker instrumentation child under umbrella `098`.

**Evidence:**
- Artifacts/paths:
  - `todos/107-pending-p2-postship-hydration-flicker-instrumentation.md`

## Notes

Run this after the narrower postship cleanup work is understood.
