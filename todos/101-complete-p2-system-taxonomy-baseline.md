---
status: "complete"
priority: "p2"
issue_id: "101"
title: "System taxonomy baseline"
tags: ["notes", "note:N0011", "architecture", "taxonomy"]
dependencies: []
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "standard"
auto_closure: true
commit_confirmed: true
commit_message: "Close 101: establish system taxonomy baseline for GSK ecosystem"
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

## Proposed Solutions

### Recommended

- Build a taxonomy table per major system:
  - canonical name
  - current aliases
  - system role
  - implementation anchors
  - naming assessment

## Recommended Action

Produce the baseline system taxonomy that will anchor the dependency and boundary analysis.

## Acceptance Criteria

- [ ] Major systems are enumerated with canonical names.
- [ ] Aliases and ambiguous legacy labels are documented.
- [ ] Work log updated.
- [ ] Traceability linked to note N0011.

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

## Notes

This task should be treated as the conceptual entry point for the rest of the N0011 analysis chain.

### 2026-03-06 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: pending
- to: complete

**Actions:**
- Established the system taxonomy baseline for the GSK ecosystem and linked it to the shared architecture report.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/101-complete-p2-system-taxonomy-baseline.md

**Next Recommendation (generated at closure):**
- There are direct dependent tasks, but they are still blocked.
- Example: 100 (p2) waits for: 102, 103, 104.
