---
status: "complete"
priority: "p1"
issue_id: "094"
title: "super-analysis-050-dimension-5-hard-cut-060-readiness"
tags: ["analysis", "release-0.5.0", "hard-cut", "0.6.0", "legacy", "dependency-audit"]
dependencies: ["089", "091"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: true
commit_message: "Complete 094: audit hard-cut 0.6.0 legacy dependency readiness"
closed_at: "2026-03-06"
---

# Super Analysis 0.5.0 dimension 5 hard-cut 0.6.0 readiness

Audit remaining legacy dependencies so the 0.6.0 hard cut can be planned without ambiguity.

## Problem Statement

Release 0.5.0 still tolerates some legacy boundaries, but the project needs a precise inventory of what remains coupled to `GedcomBridge` or other compatibility paths before 0.6.0. Without that inventory, the hard cut stays aspirational rather than executable.

## Findings

- Productive code still imports `GedcomBridge` in multiple places.
- `projectGraphDocument` is now a central path, but it is not the only legacy boundary in the repo.
- An older hard-cut TODO already exists: `048-pending-p2-hard-cut-legacy-compat-060.md`.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Produce a dependency matrix that separates legitimate import/export boundaries from debt that must be removed or replaced.
- Pros:
  - Makes 0.6.0 planning concrete.
  - Avoids deleting compatibility code blindly.
- Cons:
  - Requires careful categorization instead of a simple grep.
- Effort: M
- Risk: Low

## Recommended Action

Build the dependency matrix now and feed any actionable subset into the existing 0.6.0 hard-cut work.

### Execution Plan

1. Inventory imports to `GedcomBridge` and related legacy paths in non-test code.
2. Classify each usage as import/export boundary, temporary bridge, or removable debt.
3. Identify replacement paths, especially through `selectors.ts` or direct read-model APIs.
4. Produce a matrix with priority and release impact.
5. Link the output back to TODO `048` if new hard-cut tasks are uncovered.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [x] Non-test legacy dependency inventory is complete.
- [x] Each dependency is classified with replacement or retention rationale.
- [x] Any 0.6.0 blockers are explicit and linked to follow-up tasks.
- [x] Work log updated with inventory method and results.

## Work Log

### 2026-03-06 - Hard-cut dependency matrix completed

**By:** Codex / Developer

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Audited productive imports and usages related to:
  - `GedcomBridge`
  - `documentToGSchema`
  - `gschemaToDocument`
  - `projectGraphDocument`
- Classified each dependency into:
  - legitimate migration/import-export boundary
  - temporary UI/state bridge
  - removable debt
  - public-boundary review
- Identified the main 0.6.0 blockers as concentrated rather than widespread:
  - central legacy fallback in `src/core/read-model/selectors.ts`
  - app/state flows still converting `GraphDocument -> GSchemaGraph`
  - utility coupling in `src/core/gschema/GraphMutations.ts`
- Linked blockers explicitly to:
  - TODO `091` for the parity prerequisite
  - TODO `048` for the hard-cut execution umbrella
- Generated the hard-cut readiness report under `reports/super-analysis-0.5.0/`.

**Evidence:**
- Command: `rg -n --glob '!src/tests/**' --glob '!node_modules/**' \"GedcomBridge|documentToGSchema|gschemaToDocument|roundTripDocument|LegacyMigrator|core/read-model/selectors|projectGraphDocument|setReadModelMode\" src`
- Result: inventory of productive legacy-related dependencies captured
- Artifacts/paths:
  - `reports/super-analysis-0.5.0/dimension-5-hard-cut-readiness.md`
  - `reports/super-analysis-0.5.0/dimension-5-hard-cut-readiness.json`

### 2026-03-06 - Task created from approved plan

**By:** Codex / Developer

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the hard-cut readiness audit task.
- Recorded that productive imports to `GedcomBridge` still exist and need classification.

**Evidence:**
- Command: `rg -n --glob '!src/tests/**' 'GedcomBridge|core/read-model/selectors' src`
- Result: productive import sites were identified during planning
- Artifacts/paths:
  - `todos/094-pending-p1-super-analysis-050-dimension-5-hard-cut-060-readiness.md`

## Notes

This task should refine, not replace, TODO `048`.

### 2026-03-06 - Manual close after dependency audit completion

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Closed the hard-cut readiness audit after producing a dependency matrix and explicit blocker set.
- Left TODO `048` as the execution umbrella for the eventual 0.6.0 cut.
- Left TODO `091` as the parity prerequisite for removing the selectors legacy fallback.

**Evidence:**
- Command: `git commit -m "Complete 094: audit hard-cut 0.6.0 legacy dependency readiness"`
- Result: task artifacts committed after manual close flow
- Artifacts/paths:
  - `todos/094-complete-p1-super-analysis-050-dimension-5-hard-cut-060-readiness.md`
  - `reports/super-analysis-0.5.0/dimension-5-hard-cut-readiness.md`
  - `reports/super-analysis-0.5.0/dimension-5-hard-cut-readiness.json`

