---
status: complete
priority: p1
issue_id: "045"
tags: [testing, gates, gsk, parity, quality]
dependencies: ["041", "042", "043", "044"]
---

# GSK Core Test Matrix and Gates

## Problem Statement

This initiative changes contract boundaries and persistence behavior; without explicit gates, regressions and doc/runtime drift are likely.

## Findings

- `gsk-engine-architect` defines a verification protocol for contract-level changes.
- Existing project already uses parity tests for docs/runtime and error catalog.
- Session robustness changes require additional store-focused verification.

## Proposed Solutions

### Option 1: Unified verification gate for this program (Recommended)

**Approach:** Execute a fixed matrix of tests and record evidence in this task and each related child task.

**Pros:**
- High confidence before closure.
- Repeatable release quality signal.
- Prevents undocumented behavior changes.

**Cons:**
- Increases cycle time.

**Effort:** Medium

**Risk:** Low

## Recommended Action

Establish mandatory gate commands and closure evidence requirements for all `037..044` work.

## Technical Details

**Mandatory verification protocol:**
1. `npx vitest run src/tests/gschema.golden.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.regression.test.ts`
2. `npx vitest run src/tests/wiki.error-catalog-parity-docs.test.ts src/tests/wiki.gschema-operations-parity.test.ts src/tests/gedcom.error-catalog-parity.test.ts`
3. `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py`
4. run session/store tests impacted by `040`
5. record evidence in Work Log of each task

## Contract/Wiki Sync

- Any failing parity or link check blocks closure.
- `043` cannot close unless this task is complete with full evidence.
- This task is evidence-only; no runtime contract delta is introduced.

## Acceptance Criteria

- [x] Gate command set is finalized and documented.
- [x] Required tests pass after implementation changes.
- [x] Evidence is logged in this task and referenced from `039`.
- [x] Known non-blocking warnings are explicitly documented.
- [x] Closing checklist completed:
- [x] Skill `file-todos` applied (explicit confirmation in Work Log).
- [x] Skill `gsk-engine-architect` applied (explicit confirmation in Work Log).
- [x] Contract/Wiki Sync section updated with exact file refs.

## Work Log

### 2026-03-04 - Task creation

**By:** Codex

**Actions:**
- Created quality-gate task and copied mandatory protocol.
- Linked gate requirements to downstream doc sync and final manual validation.

**Learnings:**
- A fixed gate matrix simplifies closure decisions across multi-file contract updates.

### 2026-03-04 - Unified quality gate executed and closed

**By:** Codex

**Actions:**
- Confirmed governance drift fix in task record: master reference `036 -> 039`.
- Executed full gate matrix A-F in fixed order (contract, audit/migration, persistence, parity, links, compile).
- Classified stderr outputs from negative-path tests as non-blocking expected diagnostics.
- Consolidated this task as evidence-only closure (no runtime feature changes).

**Verification gates executed:**
- `npx vitest run src/tests/gschema.golden.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.regression.test.ts` -> PASS
- `npx vitest run src/tests/gschema.strict-audit.test.ts src/tests/gschema.migration-040.test.ts` -> PASS
- `npx vitest run src/tests/session.service.test.ts src/tests/store.test.ts src/tests/store.recent-files.test.ts src/tests/workspace-profile.service.test.ts src/tests/workspace-profile.integration.test.ts` -> PASS
- `npx vitest run src/tests/wiki.error-catalog-parity-docs.test.ts src/tests/wiki.gschema-operations-parity.test.ts src/tests/gedcom.error-catalog-parity.test.ts` -> PASS
- `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py` -> PASS
- `npx tsc --noEmit` -> PASS

**Known non-blocking warnings/diagnostics:**
- `session.service.test.ts` prints expected warnings for rejected legacy/corrupt snapshots.
- `workspace-profile.service.test.ts` prints expected warning for intentionally corrupted profile fixture.
- `store.test.ts` prints expected warning from simulated restore failure path.
- `gschema.golden.test.ts` prints quarantine debug stdout in dirty-data scenario.

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada (contract/parity gate review).

**Contract/Wiki Sync refs:**
- Runtime refs validated (no delta): `src/core/gschema/GskPackage.ts`, `src/hooks/useGskFile.ts`, `src/state/slices/sessionSlice.ts`, `src/io/sessionService.ts`
- Evidence/tests: `src/tests/gschema.golden.test.ts`, `src/tests/gschema.strict.test.ts`, `src/tests/gschema.regression.test.ts`, `src/tests/gschema.strict-audit.test.ts`, `src/tests/gschema.migration-040.test.ts`, `src/tests/session.service.test.ts`, `src/tests/store.test.ts`, `src/tests/store.recent-files.test.ts`, `src/tests/workspace-profile.service.test.ts`, `src/tests/workspace-profile.integration.test.ts`, `src/tests/wiki.error-catalog-parity-docs.test.ts`, `src/tests/wiki.gschema-operations-parity.test.ts`, `src/tests/gedcom.error-catalog-parity.test.ts`


