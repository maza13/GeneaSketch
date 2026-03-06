---
protocol_version: 2
task_type: "leaf"
status: "pending"
priority: "p2"
issue_id: "109"
title: "hard-cut product bridge boundary audit"
tags: ["release-0.6.0", "hard-cut", "bridges", "architecture"]
dependencies: ["100", "108"]
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

# Hard-cut product bridge boundary audit

Audit the remaining bridge-style product flows once the selector boundary is explicit.

## Problem Statement

The repo still contains product flows that bridge between `GraphDocument` and `GSchemaGraph`. Before 0.6.0 execution starts, those bridges must be classified as legitimate boundaries, temporary adapters, or deletion targets.

## Findings

- `094` identified the main bridge hotspots.
- `108` must run first so the audit is grounded in a stable selector/read-model contract.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Revisit bridge-style product flows and classify each path by architectural role.
- Pros:
  - Prevents deleting boundaries that still serve a justified role.
- Cons:
  - Requires disciplined classification instead of quick removal.
- Effort: M
- Risk: Medium

## Recommended Action

Audit the product bridges after `108` and classify each one as keep, replace, or delete.

### Execution Plan

1. Re-scan the known bridge files.
2. Classify each bridge by role.
3. Record what becomes input to the hard-cut execution umbrella.

## Acceptance Criteria

- [ ] Product bridge paths are classified by architectural role.
- [ ] Deletion candidates are distinguished from legitimate boundaries.
- [ ] Work log updated.

## Work Log

### 2026-03-06 - Task created under umbrella protocol v2

**By:** Codex

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the bridge boundary audit child under umbrella `099`.

**Evidence:**
- Artifacts/paths:
  - `todos/109-pending-p2-hard-cut-product-bridge-boundary-audit.md`

## Notes

This task depends on `108` to avoid repeating boundary discovery.
