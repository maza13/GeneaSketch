---
status: "complete"
priority: "p1"
issue_id: "088"
title: "super-analysis-050-umbrella"
tags: ["analysis", "release-0.5.0", "audit", "gschema", "read-model", "performance", "ux"]
dependencies: ["089", "090", "091", "092", "093", "094", "095", "096"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "high"
estimated_effort: "l"
complexity: "complex"
auto_closure: true
commit_confirmed: true
commit_message: "Complete 088: close super analysis 0.5.0 umbrella"
closed_at: "2026-03-06"
---

# Super Analysis 0.5.0 umbrella

Coordinate the full Super Analysis 0.5.0 as an evidence-driven audit plus implementation-ready fix plan.

## Problem Statement

Release 0.5.0 needs a release-grade analysis across six dimensions: AI-engine sync, read-model parity, performance, UX integrity, hard-cut 0.6.0 readiness, and encoding/text integrity. The repo already contains partial tests, baselines, and hardening work, but the evidence is distributed and not yet normalized into a single release decision.

This umbrella task exists to coordinate a complete audit chain that ends in explicit findings, release gates, and a prioritized fix plan.

### Context (Optional)

- Current behavior:
  - Focused tests for `gschema.strict`, `read-model.selectors`, `workspace-profile`, `wiki.panel-navigation`, and `ai.apply-dependencies` are currently green.
  - `src/core/read-model/selectors.ts` still retains a legacy fallback path.
  - Perf tooling exists under `src/tests/perf/*` and `reports/perf/*`, but not yet for a dense 2,000-node scenario.
  - There is at least one untracked local file in the worktree: `PersonDetailPanel_clean.txt`.
- Expected behavior:
  - Each audit dimension should conclude with `pass`, `fail`, or `needs-followup`, backed by reproducible evidence.
- Where this appears:
  - `src/core/gschema/*`
  - `src/core/read-model/*`
  - `src/tests/*`
  - `src/ui/*`
  - `reports/*`
  - `docs/*`

### Why This Matters (Optional)

- Impact:
  - Prevents a false-green 0.5.0 release.
  - Reduces regressions when moving from legacy fallback toward direct read-model behavior.
  - Prepares the repo for 0.6.0 hard-cut work with less ambiguity.
- Cost of not doing it:
  - Release decisions remain anecdotal.
  - Fixes will be reactive and ordered poorly.

## Findings

- `npm run check:gschema:internals` is currently green, so direct internal-state bypass is not the obvious active failure.
- Strict import validation in `src/core/gschema/GskPackage.ts` already enforces `journal.jsonl` and `opSeq` invariants.
- Existing perf baselines cover medium scenarios, not the requested large dense tree.
- Mojibake is visible in some repo content, but not yet proven as a source-wide active-code problem.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Materialize one umbrella TODO, one baseline task, one task per audit dimension, and one final consolidation task.
- Pros:
  - Clear dependency chain.
  - Easy to execute incrementally.
  - Preserves release visibility.
- Cons:
  - Produces a larger TODO batch.
- Effort: L
- Risk: Low

## Recommended Action

Execute the child TODOs in dependency order and close this umbrella only after the final report and fix plan are complete.

### Execution Plan

1. Establish baseline evidence and current-state truth.
2. Execute dimensions 1 through 6 as separate audit tasks.
3. Consolidate findings into release gates and a fix plan.
4. Close the umbrella after verifying all children and report outputs.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [x] Child TODOs `089` through `096` exist and are linked.
- [x] Each child produces an explicit report or evidence pack.
- [x] A consolidated release decision and fix plan are produced.
- [x] Work log updated through execution.

## Work Log

### 2026-03-06 - Chain moved to ready and umbrella opened

**By:** Codex / Developer

**Status Transition:**
- from: pending
- to: ready

**Actions:**
- Moved TODOs `088` through `096` from `pending` to `ready` per user request.
- Opened the umbrella task as the active coordination entry for the analysis chain.
- Left `089` as the next executable dependency without starting it yet.

**Evidence:**
- Command: `Get-ChildItem todos | Where-Object { $_.Name -match '^(088|089|090|091|092|093|094|095|096)-' }`
- Result: all nine files renamed to `ready`
- Artifacts/paths:
  - `todos/088-ready-p1-super-analysis-050-umbrella.md`
  - `todos/089-ready-p1-super-analysis-050-baseline-and-evidence-pack.md`

### 2026-03-06 - Task created from approved plan

**By:** Codex / Developer

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Materialized the approved Super Analysis 0.5.0 plan into an umbrella TODO.
- Split the work into baseline, six audit dimensions, and final consolidation.
- Wired dependencies so execution order remains explicit.

**Evidence:**
- Command: `Get-ChildItem todos`
- Result: next free issue id range reserved from `088` onward
- Artifacts/paths:
  - `todos/088-pending-p1-super-analysis-050-umbrella.md`

## Notes

Close this task last.

### 2026-03-06 - Umbrella closed after final consolidation

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Verified that child TODOs `089` through `096` were executed.
- Linked the final release packet into the umbrella record.
- Closed the Super Analysis 0.5.0 chain.

**Evidence:**
- Artifacts/paths:
  - `reports/super-analysis-0.5.0/executive-summary.md`
  - `reports/super-analysis-0.5.0/findings.json`
  - `reports/super-analysis-0.5.0/fix-plan.md`

