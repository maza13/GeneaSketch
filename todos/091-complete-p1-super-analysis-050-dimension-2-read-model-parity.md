---
status: "complete"
priority: "p1"
issue_id: "091"
title: "super-analysis-050-dimension-2-read-model-parity"
tags: ["analysis", "release-0.5.0", "read-model", "parity", "direct-vs-legacy"]
dependencies: ["089"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "high"
estimated_effort: "l"
complexity: "complex"
auto_closure: true
commit_confirmed: true
commit_message: "Complete 091: audit direct vs legacy read-model parity"
closed_at: "2026-03-06"
---

# Super Analysis 0.5.0 dimension 2 read-model parity

Measure semantic parity between `direct` and `legacy` projections using golden, regression, and synthetic cases.

## Problem Statement

Release 0.5.0 cannot ask users to trust the direct read model unless it returns the same visible semantics as the legacy projection for names, dates, relationships, and derived views. The current test coverage proves only basic parity.

## Findings

- `src/core/read-model/selectors.ts` still keeps a central legacy fallback path.
- `src/tests/read-model.selectors.test.ts` validates only basic parity.
- Canonical and regression sources already exist:
  - `docs/wiki-gsk/ejemplos/canon/*`
  - `src/tests/gschema.golden.test.ts`
  - `src/tests/gedcom.test.ts`
  - `samples/NunezyMendoza.ged`

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Add a parity comparator utility and run it over canonical, regression, and synthetic complex fixtures.
- Pros:
  - Produces field-level diffs instead of vague parity claims.
  - Can become a reusable release gate.
- Cons:
  - Requires normalization rules for ordering-only differences.
- Effort: L
- Risk: Medium

## Recommended Action

Create a dedicated parity audit harness and classify mismatches as semantic, ordering-only, or formatting-only.

### Execution Plan

1. Define the comparison contract for persons, families, stats, search rows, and timeline inputs.
2. Select fixture corpus from canonical docs, golden tests, regression tests, and one real sample.
3. Run both `direct` and `legacy` projections on each fixture.
4. Emit structured diffs and severity for every mismatch.
5. Summarize whether parity is release-safe or still dependent on the fallback path.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [x] A repeatable parity procedure is defined and executed.
- [x] Corpus includes multi-union, adoption, compat repair, and one real sample.
- [x] Semantic mismatches are enumerated with affected fields and severity.
- [x] Work log updated with fixture set, commands, and report paths.

## Work Log

### 2026-03-06 - Parity harness executed and mismatch root cause isolated

**By:** Codex / Developer

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Added a reusable parity audit harness in `src/tests/read-model.parity.audit.test.ts`.
- Executed the harness over `7` fixtures:
  - canonical: `basico`, `tipico`, `edgecases`
  - synthetic: `multi_union`, `adoption`
  - compat: `missing_union_repair`
  - real sample: `NuñezyMendoza.ged`
- Generated machine-readable and markdown reports under `reports/super-analysis-0.5.0/`.
- Confirmed parity is clean for:
  - canonical `basico`
  - canonical `edgecases`
  - synthetic multi-union
  - synthetic adoption
  - real sample `NuñezyMendoza.ged`
- Detected `24` semantic mismatches concentrated in:
  - `canonical_tipico`
  - `compat_missing_union_repair`
- Isolated the root cause:
  - `src/core/read-model/directProjection.ts` falls back to raw `uid` in `xrefOf()`
  - `src/core/gschema/GedcomBridge.ts` synthesizes prefixed stable IDs in `xrefOf()`
  - This breaks parity when the graph lacks native `xref`, especially for union/person IDs surfaced to UI selectors.
- Assessed release impact as high for direct-mode edge cases because the mismatch affects entity IDs, family IDs, and relationship references used by selectors/search/timeline.

**Evidence:**
- Command: `npx vitest run src/tests/read-model.parity.audit.test.ts`
- Result: `1 passed`
- Command: `Get-Content reports/super-analysis-0.5.0/dimension-2-read-model-parity.json`
- Result: `fixtureCount=7`, `semanticMismatchCount=24`
- Artifacts/paths:
  - `src/tests/read-model.parity.audit.test.ts`
  - `reports/super-analysis-0.5.0/dimension-2-read-model-parity.md`
  - `reports/super-analysis-0.5.0/dimension-2-read-model-parity.json`

### 2026-03-06 - Task created from approved plan

**By:** Codex / Developer

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the parity audit task for direct vs legacy behavior.
- Recorded the fixture sources already identified during planning.

**Evidence:**
- Command: `Get-Content src/core/read-model/selectors.ts`
- Result: confirmed legacy fallback remains present
- Artifacts/paths:
  - `todos/091-pending-p1-super-analysis-050-dimension-2-read-model-parity.md`

## Notes

This task is expected to define a reusable gate for future direct-mode rollout.

### 2026-03-06 - Manual close after parity audit completion

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Closed the parity audit with a documented high-severity finding.
- Preserved the harness so the same corpus can be rerun after the eventual fix.
- Left remediation follow-up to the next implementation/planning step.

**Evidence:**
- Command: `git commit -m "Complete 091: audit direct vs legacy read-model parity"`
- Result: task artifacts committed after manual close flow
- Artifacts/paths:
  - `todos/091-complete-p1-super-analysis-050-dimension-2-read-model-parity.md`
  - `src/tests/read-model.parity.audit.test.ts`
  - `reports/super-analysis-0.5.0/dimension-2-read-model-parity.md`
  - `reports/super-analysis-0.5.0/dimension-2-read-model-parity.json`

