---
protocol_version: 2
task_type: "leaf"
status: "pending"
priority: "p2"
issue_id: "110"
title: "hard-cut graph native rollout sequencing"
tags: ["release-0.6.0", "hard-cut", "graph-native", "rollout"]
dependencies: ["108", "109"]
child_tasks: []
related_tasks: ["048:followup"]
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

# Hard-cut graph native rollout sequencing

Convert the selector and bridge prep into a rollout sequence ready for the 0.6.0 execution umbrella.

## Problem Statement

Even after the boundaries are defined, the hard cut still needs an execution order. This task exists to turn the prep analysis into a graph-native migration sequence that `048` can consume directly.

## Findings

- `108` defines the canonical selector/read-model boundary.
- `109` classifies the remaining bridges.
- `048` is the downstream execution umbrella that should consume this sequencing rather than rediscover it.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Build a migration sequence that orders removal, replacement, and verification for the hard cut.
- Pros:
  - Makes the execution umbrella concrete.
- Cons:
  - Depends on the previous prep tasks being high quality.
- Effort: M
- Risk: Medium

## Recommended Action

Produce the ordered graph-native rollout plan that hands off cleanly into `048`.

### Execution Plan

1. Collect outputs from `108` and `109`.
2. Order the migration steps by dependency and risk.
3. Hand off the resulting sequence to the downstream hard-cut execution umbrella.

## Acceptance Criteria

- [ ] Graph-native rollout sequence is explicitly defined.
- [ ] The handoff to `048` is documented.
- [ ] Work log updated.

## Work Log

### 2026-03-06 - Task created under umbrella protocol v2

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the rollout sequencing child under umbrella `099`.

**Evidence:**
- Artifacts/paths:
  - `todos/110-pending-p2-hard-cut-graph-native-rollout-sequencing.md`

## Notes

This task should remain pending until the hard-cut prep chain is intentionally opened.
