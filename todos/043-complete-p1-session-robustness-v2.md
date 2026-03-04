---
status: complete
priority: p1
issue_id: "043"
tags: [persistence, session, reliability, autosave]
dependencies: ["042"]
---

# Session Robustness V2

## Problem Statement

Current session persistence can be lost too easily due to restore/autosave flow fragility.

## Findings

- Autosave currently depends on restore state gating that can skip writes.
- Snapshot/restore shape consistency needs hardening.
- User workflow requires reliable reopen without reimporting every time.

## Proposed Solutions

### Option 1: Session schema hardening + autosave gate fix (Recommended)

**Approach:** Introduce session schema v2 with consistent payload model and resilient autosave/restore transitions.

**Pros:**
- Directly addresses data-loss reports.
- Keeps single-session workflow intact.
- Reduces hidden state lock conditions.

**Cons:**
- Requires migration logic for existing snapshots.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Implement session persistence hardening:
1. fix autosave gating behavior,
2. align snapshot shape and restore path,
3. add explicit migration and fallback logic.

## Technical Details

**Expected implementation targets:**
- `src/state/slices/sessionSlice.ts`
- `src/io/sessionService.ts`
- `src/tests/store.test.ts`
- `src/tests/session.service.test.ts`

## Contract/Wiki Sync

- This is app-runtime behavior, but if `.gsk` import/export behavior is touched, update relevant `wiki-gsk` sections accordingly.
- Ensure no accidental reintroduction of `meta/*` into `.gsk`.
- No `src/core/gschema/**` changes were required for this task.
- No `docs/wiki-gsk/**` normative updates were required for this task.

## Acceptance Criteria

- [x] Session autosave reliably triggers after normal editing.
- [x] Restore flow does not leave autosave permanently disabled.
- [x] Session snapshot schema is explicit and migration-safe.
- [x] Unit tests cover failure and recovery scenarios.
- [x] Closing checklist completed:
- [x] Skill `file-todos` applied (explicit confirmation in Work Log).
- [x] Skill `gsk-engine-architect` applied or `N/A` justified (explicit).
- [x] Contract/Wiki Sync section updated with exact file refs.

## Work Log

### 2026-03-04 - Task creation

**By:** Codex

**Actions:**
- Created session hardening task for single-session reliability.
- Captured core failure vectors and mitigation scope.

**Learnings:**
- Session reliability must be treated as first-class product behavior.

### 2026-03-04 - Session hardening v2 implemented

**By:** Codex

**Actions:**
- Hardened `src/io/sessionService.ts`:
  - added explicit schema constants (`SESSION_LEGACY_MIN_SCHEMA_VERSION=5`, `SESSION_SNAPSHOT_SCHEMA_VERSION=6`);
  - centralized parse/normalize pipeline with migration `v5 -> v6`;
  - restored snapshots now auto-write migrated version when applicable;
  - changed `clearAutosession` to key deletion (`db.delete`) instead of deleting whole DB.
- Hardened `src/state/slices/sessionSlice.ts`:
  - refactored autosession snapshot construction into helper;
  - fixed autosave gating behavior:
    - no save while restoring with no active state;
    - auto-unlock + save when active state exists;
  - made restore lock release consistent on success/failure (`finally` unlock).
- Added/updated tests:
  - new `src/tests/session.service.test.ts`;
  - extended `src/tests/store.test.ts` with autosave/restore lock scenarios;
  - reset `isRestoring` explicitly in test setup to avoid cross-test coupling.

**Verification gates executed:**
- `npx vitest run src/tests/session.service.test.ts src/tests/store.test.ts src/tests/store.recent-files.test.ts` -> PASS
- `npx vitest run src/tests/gschema.regression.test.ts src/tests/gschema.strict.test.ts` -> PASS
- `npx tsc --noEmit` -> PASS

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada (boundary review; no contract changes in `src/core/gschema/**`).

**Contract/Wiki Sync refs:**
- Runtime: `src/io/sessionService.ts`, `src/state/slices/sessionSlice.ts`
- Tests: `src/tests/session.service.test.ts`, `src/tests/store.test.ts`
- Contractual wiki changes: none required.

**Learnings:**
- Unlocking autosave from stale restore state is critical to prevent silent session-loss behavior.


