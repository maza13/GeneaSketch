---
protocol_version: 2
task_type: "leaf"
status: "pending"
priority: "p2"
issue_id: "108"
title: "hard-cut read model selector boundary"
tags: ["release-0.6.0", "hard-cut", "read-model", "selectors"]
dependencies: ["100"]
child_tasks: []
related_tasks: ["097:precedent"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "high"
estimated_effort: "m"
complexity: "standard"
auto_closure: true
commit_confirmed: false
commit_message: null
closed_at: null
---

# Hard-cut read model selector boundary

Define the exact selector/read-model boundary that the 0.6.0 hard cut must preserve.

## Problem Statement

The hard cut cannot start by deleting fallback code blindly. It first needs an explicit contract for what stays in selectors, what moves to graph-native flows, and what counts as unacceptable bridge behavior.

## Findings

- `100` already established the architecture baseline.
- `097` clarified the Visual Engine vs App Shell distinction that shapes how read-model APIs should be consumed.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Freeze the read-model boundary in terms of selectors, direct projection, and graph-native consumers before any deletion work.
- Pros:
  - Reduces migration ambiguity.
- Cons:
  - Adds prep work before implementation.
- Effort: M
- Risk: Medium

## Recommended Action

Produce a precise boundary note for selectors and read-model access as the first hard-cut prep step.

### Execution Plan

1. Identify the current selector and projection entry points.
2. Classify which calls are canonical for 0.6.0.
3. Document what must be removed versus preserved.

## Acceptance Criteria

- [ ] Selector/read-model hard-cut boundary is explicitly defined.
- [ ] Canonical versus removable paths are distinguished.
- [ ] Work log updated.

## Work Log

### 2026-03-06 - Task created under umbrella protocol v2

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the first hard-cut preparation child under umbrella `099`.

**Evidence:**
- Artifacts/paths:
  - `todos/108-pending-p2-hard-cut-read-model-selector-boundary.md`

## Notes

Run this child first when `099` is opened.
