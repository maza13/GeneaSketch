---
protocol_version: 2
task_type: "leaf"
status: "complete"
priority: "p1"
issue_id: "097"
title: "formalize visual engine vs app shell distinction"
tags: ["architecture", "documentation", "taxonomy"]
dependencies: ["096"]
child_tasks: []
related_tasks: ["100:followup", "101:context"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-07"
target_date: null
risk_level: "low"
estimated_effort: "s"
complexity: "standard"
auto_closure: true
commit_confirmed: true
commit_message: "Close 097: normalize visual engine vs app shell distinction record"
closed_at: "2026-03-07"
---



# Formalize visual engine vs app shell distinction

Normalize the backlog record for the original Visual Engine vs App Shell distinction now that the broader taxonomy work is captured in `N0010` and `100`-`104`.

## Problem Statement

The original closure of `097` captured a valid distinction, but it was left in an inconsistent state:
- the task was marked `complete` with unchecked acceptance criteria
- the language was narrower than the later taxonomy work
- the architectural baseline was later formalized more cleanly by `N0010` and `100`-`104`

This task should now serve only to leave an honest trace in the backlog:
- `Visual Engine` and `App Shell` are distinct concepts
- that distinction was an intermediate clarification
- the authoritative baseline now lives in the system-taxonomy work, not here alone

## Recommended Action

1. Reopen the task strictly under protocol V2.
2. Record that the distinction remains valid but has been absorbed by the broader taxonomy/architecture baseline.
3. Close the task as a normalized historical checkpoint instead of treating it as the canonical source of truth.

## Findings

- `097` introduced a necessary language correction: `Visual Engine` is not the same thing as `App Shell / UI`.
- `N0010` later expanded the question from one distinction to the full project system taxonomy.
- `100`-`104` later documented the canonical system list and the architecture baseline.
- Because of that later work, `097` is still relevant, but only as an upstream clarification.

## Acceptance Criteria

- [x] The task explicitly states that it is a narrower precursor to `N0010` and `100`-`104`.
- [x] The backlog no longer treats `097` as the canonical architecture source.
- [x] Work log updated.

## Work Log

### 2026-03-06 - Execution and Formalization
By: Antigravity

**Actions:**
1. **New Architecture Doc**: Created `docs/wiki-software/09_ecosistema_arquitectura.md` defining the 8 core blocks and the "Visual Engine" vs "App Shell (UI)" distinction.
2. **UX Doc Update**: Updated `docs/wiki-uxdesign/02_stack_y_arquitectura_ui.md` to reflect the formalized directory split and labeling.
3. **Task Updates**: Renamed/Updated terminology in pending tasks (e.g., `018`) to use the new nomenclature.
4. **Communication Protocol**: Established "Visual Engine" as the term for the tree/canvas/projection and "App Shell / UI" for panels/chrome.

**Findings:**
The code structure already followed this split (views vs ui), but the documentation was using "UI" as an umbrella term for everything. The formalization removes this ambiguity.

**Status Transition:**
- from: pending
- to: complete

### 2026-03-06 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: pending
- to: complete

**Actions:**
- Formalize the architectural distinction between Visual Engine and App Shell (UI) across docs and tasks.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/097-complete-p1-formalize-visual-engine-vs-ui-distinction.md

**Next Recommendation (generated at closure):**
- No direct dependent task found.
- Recommended next unblocked task: 018 (p2).

### 2026-03-06 - Strict reopen for backlog normalization

**By:** Codex

**Status Transition:**
- from: complete
- to: ready

**Actions:**
- Reopened the task under protocol V2 because the prior closure left acceptance criteria unchecked.
- Reframed the task as a historical normalization step instead of a standalone architecture source.
- Linked the task explicitly to the later taxonomy and architecture baseline.

**Evidence:**
- Artifacts/paths:
  - `notes/entries/N0010-idea-re-evaluacion-nomenclatura-visual-engine-otros.md`
  - `todos/100-complete-p2-gsk-ecosystem-architecture-analysis.md`
  - `todos/101-complete-p2-system-taxonomy-baseline.md`
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`

### 2026-03-06 - Historical checkpoint normalized

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Confirmed that the Visual Engine vs App Shell distinction remains valid.
- Recorded that the distinction is now subsumed by the later taxonomy and architecture baseline.
- Normalized the backlog so `097` no longer appears as an inconsistent standalone closure.

**Evidence:**
- Artifacts/paths:
  - `notes/entries/N0010-idea-re-evaluacion-nomenclatura-visual-engine-otros.md`
  - `todos/100-complete-p2-gsk-ecosystem-architecture-analysis.md`
  - `todos/101-complete-p2-system-taxonomy-baseline.md`
  - `notes/reports/gsk-ecosystem-architecture-2026-03-06.md`

### 2026-03-07 - Auto close via todo:close

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Normalized 097 as a historical checkpoint: the Visual Engine vs App Shell distinction remains valid, but the canonical architecture baseline now lives in N0010 and 100-104.
- Closed task with automated status update + rename + commit.

**Evidence:**
- Command: npm run todo:close -- ...
- Result: automatic close and commit executed.
- Artifacts/paths: todos/097-complete-p1-formalize-visual-engine-vs-app-shell-distinction.md

**Next Recommendation (generated at closure):**
- No direct dependent task found.
- Recommended next unblocked task: 018 (p2).
