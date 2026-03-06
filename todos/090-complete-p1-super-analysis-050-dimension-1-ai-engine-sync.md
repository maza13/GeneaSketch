---
status: "complete"
priority: "p1"
issue_id: "090"
title: "super-analysis-050-dimension-1-ai-engine-sync"
tags: ["analysis", "release-0.5.0", "ai", "gschema", "strict-mode"]
dependencies: ["089"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "high"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: true
commit_message: "Complete 090: audit ai-engine sync against hardened graph contracts"
closed_at: "2026-03-06"
---

# Super Analysis 0.5.0 dimension 1 AI-engine sync

Audit AI flows against hardened graph/package contracts and isolate any remaining CI blocker.

## Problem Statement

AI-related flows previously regressed after engine hardening. Release 0.5.0 needs proof that AI uses the public contracts of `GSchemaGraph` and `GskPackage`, especially for journal replay, strict import, and graph reconstruction.

## Findings

- `src/tests/ai.apply-dependencies.test.ts` currently passes.
- `npm run check:gschema:internals` currently reports no unauthorized private access.
- `src/core/gschema/GskPackage.ts` already validates malformed journal lines and non-contiguous `opSeq`.
- Historical artifacts suggest at least one earlier strict-mode failure around journal-gap handling.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Audit AI paths touching graph state, then re-run the relevant AI suite and strict journal reproductions.
- Pros:
  - Distinguishes a real blocker from stale failure artifacts.
  - Produces root cause if a mismatch remains.
- Cons:
  - Requires tracing across AI, gschema, and older test artifacts.
- Effort: M
- Risk: Medium

## Recommended Action

Treat this as a root-cause audit, not a symptom chase. Confirm whether a real AI/strict-mode mismatch still exists and document it with a minimal reproduction if it does.

### Execution Plan

1. Inventory AI modules and tests that depend on graph reconstruction, import/export, or journal semantics.
2. Re-run the AI suite subset most likely to intersect hardened engine behavior.
3. Reproduce strict journal edge cases explicitly, including malformed line count and non-contiguous `opSeq`.
4. Verify any mismatch involving `journalLineCount`, snapshot/journal restoration, or public API assumptions.
5. Write a report mapping `AI flow -> graph/package contract -> result`.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [x] Relevant AI flows are inventoried.
- [x] Hardened engine contract mismatches are either ruled out or reproduced.
- [x] Any blocker includes root cause, repro steps, and recommended fix scope.
- [x] Work log updated with suites and findings.

## Work Log

### 2026-03-06 - AI-engine sync audit executed

**By:** Codex / Developer

**Status Transition:**
- from: ready
- to: ready

**Actions:**
- Reviewed AI code paths in `src/core/ai/*` and `src/services/ai*`.
- Verified by static search that the AI layer does not directly couple to:
  - `GSchemaGraph`
  - `importGskPackage`
  - `exportGskPackage`
  - `getJournal()`
  - `fromData()`
  - `documentToGSchema`
  - `gschemaToDocument`
- Confirmed from code inspection that `src/core/ai/apply.ts` operates on `GraphDocument`, while `src/core/ai/orchestrator.ts` handles provider orchestration rather than strict package import/replay.
- Executed the full AI test suite (`17` files / `45` tests), all green.
- Reviewed `out.json` and confirmed the recorded old failure belongs to `src/tests/gschema.strict.test.ts` (`gap in opSeq`), not to the AI suite.
- Wrote the audit report for this dimension under `reports/super-analysis-0.5.0/`.

**Evidence:**
- Command: `rg -n --glob 'ai*.test.ts' \"GSchemaGraph|importGskPackage|exportGskPackage|getJournal\\(|fromData\\(|journal|strict|documentToGSchema|gschemaToDocument\" src/core/ai src/services src/tests`
- Result: no direct AI-to-gschema strict coupling hits beyond a restricted-model string in an AI test
- Command: `npx vitest run <all ai*.test.ts files>`
- Result: `17 passed`, `45 passed`
- Command: `Get-Content out.json -TotalCount 80`
- Result: historical failure attributed to `src/tests/gschema.strict.test.ts`, not AI
- Artifacts/paths:
  - `reports/super-analysis-0.5.0/dimension-1-ai-engine.md`
  - `reports/super-analysis-0.5.0/dimension-1-ai-engine.json`

### 2026-03-06 - Task created from approved plan

**By:** Codex / Developer

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the AI-engine synchronization audit task.
- Linked it to the baseline evidence pack.

**Evidence:**
- Command: `npx vitest run src/tests/ai.apply-dependencies.test.ts src/tests/gschema.strict.test.ts`
- Result: focused suites were green during planning check
- Artifacts/paths:
  - `todos/090-pending-p1-super-analysis-050-dimension-1-ai-engine-sync.md`

## Notes

Classify any finding as `0.5.0-blocking`, `0.5.0-postship`, or `0.6.0-hardcut`.

### 2026-03-06 - Manual close after audit completion

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Closed the AI-engine sync audit after confirming no reproducible blocker in the current codebase.
- Recorded the dimension report in markdown and JSON for downstream consolidation.
- Left the next release-facing investigation to dimensions `091` and `094`.

**Evidence:**
- Command: `git commit -m "Complete 090: audit ai-engine sync against hardened graph contracts"`
- Result: task artifacts committed after manual close flow
- Artifacts/paths:
  - `todos/090-complete-p1-super-analysis-050-dimension-1-ai-engine-sync.md`
  - `reports/super-analysis-0.5.0/dimension-1-ai-engine.md`
  - `reports/super-analysis-0.5.0/dimension-1-ai-engine.json`

