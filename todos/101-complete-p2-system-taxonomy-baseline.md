---
protocol_version: 2
task_type: "leaf"
status: "complete"
priority: "p2"
issue_id: "101"
title: "System taxonomy baseline"
tags: ["notes", "note:N0011", "architecture", "taxonomy"]
dependencies: []
child_tasks: []
related_tasks: ["100:context", "097:precedent"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "standard"
auto_closure: true
commit_confirmed: true
commit_message: "Close 101: reclose system taxonomy baseline under protocol v2"
closed_at: "2026-03-06"
---


# System taxonomy baseline

Define the baseline list of major systems and their canonical names before analyzing deeper interconnections.

## Problem Statement

The architecture analysis cannot be reliable if the system blocks are still named ambiguously. This task establishes the canonical baseline for systems such as GSchema Engine, Visual Engine, App Shell, State Manager, AI Assistant, `.gsk` package IO, GEDCOM IO, the read model, Workspace Profile, and the Knowledge System.

## Findings

- N0010 is the conceptual prerequisite for this task.
- The repo already contains most of these systems as separable code areas, but the naming is partly role-based and partly implementation-based.
- Future architecture work depends on naming systems by role, not only by current implementation.
- The previous closure was invalid because the acceptance checklist was never marked complete.

## Proposed Solutions

### Recommended

- Build a taxonomy table per major system:
  - canonical name
  - current aliases
  - system role
  - implementation anchors
  - naming assessment

## Recommended Action

Produce the baseline system taxonomy that will anchor the dependency and boundary analysis, then close this task only after the checklist is explicitly satisfied.

## Acceptance Criteria

- [x] Major systems are enumerated with canonical names.
- [x] Aliases and ambiguous legacy labels are documented.
- [x] Work log updated.
- [x] Traceability linked to note N0011.

## Work Log

### 2026-03-06 - Task normalized after notes:promote

**By:** Codex

**Status Transition:**
- from: pending
- to: pending

**Actions:**
- Replaced the literal promoted title with the first logical architecture block.
- Scoped the task to taxonomy only, not to the full dependency analysis.

**Evidence:**
- Artifacts/paths:
  - `todos/101-pending-p2-system-taxonomy-baseline.md`
  - `notes/entries/N0010-idea-re-evaluacion-nomenclatura-visual-engine-otros.md`

### 2026-03-06 - Strict reopen for protocol correction

**By:** Codex

**Status Transition:**
- from: complete
- to: ready

**Actions:**
- Reopened the task because the previous closure left acceptance criteria unchecked.
- Invalidated the prior formal closure while preserving the existing architecture report as supporting evidence.

**Evidence:**
- Artifacts/paths:
  - `todos/101-ready-p2-system-taxonomy-baseline.md`
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`

### 2026-03-06 - Taxonomy baseline reconfirmed under protocol v2

**By:** Codex

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Revalidated the architecture report section for system taxonomy under the reopened protocol.
- Confirmed the canonical system list, aliases, and naming assessment are already present and sufficient for closure.
- Kept the task scoped to taxonomy only and prepared it for formal close.

**Evidence:**
- Artifacts/paths:
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`
  - `todos/101-ready-p2-system-taxonomy-baseline.md`

## Notes

This task is reopened strictly and must be re-closed under the current protocol.

### 2026-03-06 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Revalidated and formally closed the system taxonomy baseline under protocol v2.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/101-complete-p2-system-taxonomy-baseline.md

**Next Recommendation (generated at closure):**
- Direct next tasks unblocked by this closure: 102 (p2).
- Recommended start: 102 (p2).
