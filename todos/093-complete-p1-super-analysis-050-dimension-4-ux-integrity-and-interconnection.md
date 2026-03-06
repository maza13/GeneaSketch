---
status: "complete"
priority: "p1"
issue_id: "093"
title: "super-analysis-050-dimension-4-ux-integrity-and-interconnection"
tags: ["analysis", "release-0.5.0", "ux", "wiki", "workspace-profile", "person-detail"]
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
commit_message: "Complete 093: audit UX integrity and interconnection"
closed_at: "2026-03-06"
---

# Super Analysis 0.5.0 dimension 4 UX integrity and interconnection

Verify the user journeys most likely to regress under the direct model and hardened package behavior.

## Problem Statement

Release 0.5.0 needs proof that person detail data, wiki navigation, and workspace profile hydration still behave correctly when the app runs with strict graph/package assumptions and the current read-model setup. Existing tests cover parts of this but not yet as one release-facing audit dimension.

## Findings

- `src/tests/wiki.panel-navigation.unit.test.ts` currently passes for relative links, anchors, and cross-tab resolution.
- `src/tests/workspace-profile.integration.test.ts` currently passes for hydration precedence and legacy dtree normalization.
- The person detail path still needs explicit verification for citations/evidence visibility under current projection behavior.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Audit three critical journeys: person detail, wiki internal navigation, and workspace profile hydration/flicker risk.
- Pros:
  - Focuses on the highest-value UX regressions.
  - Uses current unit/integration coverage as a starting point.
- Cons:
  - Some flicker concerns may need instrumentation or careful repro steps.
- Effort: M
- Risk: Medium

## Recommended Action

Turn the three critical journeys into an audit matrix and verify whether current behavior remains release-safe.

### Execution Plan

1. Map the data flow into `PersonDetailPanel`, `WikiPanel`, and workspace-profile hydration.
2. Re-run and extend targeted tests where evidence is missing.
3. Compare visible person evidence/citation behavior under direct vs legacy projection when relevant.
4. Investigate the theme/layout flicker concern and separate reproducible issues from suspicion.
5. Write a journey-level pass/fail report.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [x] Person detail evidence/citation behavior is audited.
- [x] Wiki internal-link behavior is audited under current strict assumptions.
- [x] Workspace-profile hydration and flicker risk are classified.
- [x] Work log updated with journey matrix and evidence.

## Work Log

### 2026-03-06 - Task created from approved plan

**By:** Codex / Developer

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the UX/interconnection audit task.
- Linked it to parity results because person-detail validation depends on the projection contract.

**Evidence:**
- Command: `npx vitest run src/tests/wiki.panel-navigation.unit.test.ts src/tests/workspace-profile.integration.test.ts`
- Result: focused suites were green during planning check
- Artifacts/paths:
  - `todos/093-pending-p1-super-analysis-050-dimension-4-ux-integrity-and-interconnection.md`

### 2026-03-06 - UX integrity audit executed

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Audited the real person workspace path and confirmed that the operative panel is `PersonWorkspacePanel`, not `PersonDetailPanel`.
- Verified that wiki navigation remains covered for relative links, cross-wiki links, and anchors.
- Verified workspace-profile precedence and legacy dtree normalization, then inspected the load order in `useGskFile`.
- Audited the person evidence path and confirmed the current product surface exposes event `sourceRefs`/`noteRefs`, but not structured claim metadata as a first-class UI.
- Wrote release-facing report artifacts for this dimension.

**Findings:**
- Wiki navigation is release-safe in the audited matrix.
- Workspace hydration is functionally correct but still applies profile state in a second phase after `loadGraph`, leaving a plausible flicker window.
- Person evidence is only partially surfaced: claim citations are flattened into event `sourceRefs`, and `PersonSourcesSection` only edits person-level refs.

**Evidence:**
- Command: `npx vitest run src/tests/wiki.panel-navigation.unit.test.ts src/tests/workspace-profile.integration.test.ts src/tests/workspace-profile.service.test.ts src/tests/person-events-binding.test.ts src/tests/person-family-links-binding.test.ts src/tests/gedcom.person-records-extended.test.ts`
- Result: `6` files, `21` tests passed
- Artifacts/paths:
  - `reports/super-analysis-0.5.0/dimension-4-ux-integrity.md`
  - `reports/super-analysis-0.5.0/dimension-4-ux-integrity.json`
  - `src/ui/PersonWorkspacePanel.tsx`
  - `src/ui/person/sections/PersonSourcesSection.tsx`
  - `src/ui/person/sections/PersonEventsSection.tsx`
  - `src/hooks/useGskFile.ts`

## Notes

This task may produce both functional findings and observability gaps.

