---
status: complete
priority: p1
issue_id: "044"
tags: [migration, legacy, meta, profile, compatibility]
dependencies: ["041", "042"]
---

# Legacy Meta Minimal Compatibility (No Auto-Migration)

## Problem Statement

Legacy `.gsk` files may contain `meta/*`, but current project phase prioritizes minimal risk/effort while preserving forward architecture.

## Findings

- `041` already enforces core-only export (`0.5.0`) and keeps legacy import compatibility.
- `042` already stores app metadata in local `WorkspaceProfileV1`.
- There are no external users yet; full migration complexity can be deferred safely.

## Proposed Solutions

### Option 1: Minimal compatibility now + hard cut planned for `0.6.0` (Recommended)

**Approach:** Keep legacy import path lightweight in `0.5.x` (no auto-migration write), preserve current fallback behavior, and document explicit deprecation + hard-cut plan for `0.6.0`.

**Pros:**
- Minimum implementation cost now.
- Low regression risk in active code paths.
- Keeps architecture clean: `.gsk` core-only + app metadata local.

**Cons:**
- Full removal of legacy paths is deferred to a future task.
- Temporary coexistence of fallback logic in `0.5.x`.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Implement minimal policy for `0.5.x`:
1. keep legacy `meta/*` as read-only compatibility fallback (no automatic write to local profile),
2. preserve priority `local profile > legacy meta > defaults`,
3. ensure core graph import is independent from meta,
4. add explicit deprecation note: `0.6.0` will remove legacy compatibility (`<0.5.0` hard cut).

## Technical Details

**Expected implementation targets:**
- `src/hooks/useGskFile.ts` (only if fallback behavior needs tightening)
- `src/tests/gschema.regression.test.ts` / session-profile tests (no-regression evidence)
- `docs/wiki-gsk/06_versionado_y_migraciones.md` (deprecation/hard-cut note)
- `docs/wiki-gsk/CHANGELOG.md` (technical deprecation entry)

## Contract/Wiki Sync

- Keep current runtime contract stable in `0.5.x` (no export contract changes).
- Add deprecation note and planned hard cut in `0.6.0`.
- No new error codes expected in this minimized scope.

## Acceptance Criteria

- [x] Legacy import remains functional without breaking core graph load.
- [x] No auto-migration write path to local profile is introduced in `0.5.x`.
- [x] Priority behavior is explicit and verified (`local profile > legacy meta > defaults`).
- [x] Deprecation + hard-cut `0.6.0` are documented in wiki/changelog.
- [x] Closing checklist completed:
- [x] Skill `file-todos` applied (explicit confirmation in Work Log).
- [x] Skill `gsk-engine-architect` applied (explicit confirmation in Work Log).
- [x] Contract/Wiki Sync section updated with exact file refs.

## Work Log

### 2026-03-04 - Task creation

**By:** Codex

**Actions:**
- Created dedicated migration task for legacy package metadata.
- Defined behavior split between core import and profile migration.

**Learnings:**
- Migration must be tolerant; continuity failures must not become core-load failures.

### 2026-03-04 - Scope refinement to minimal compatibility

**By:** Codex

**Actions:**
- Re-scoped task from full auto-migration to minimal-compatibility mode for `0.5.x`.
- Locked policy:
  - keep legacy fallback read path,
  - avoid new auto-migration write complexity now,
  - document hard cut with no retrocompatibility for `0.6.0`.
- Added future follow-up requirement for hard-cut execution task.

**Learnings:**
- With no external distribution yet, deferring full migration reduces immediate risk without harming long-term architecture.

### 2026-03-04 - 044 minimal compatibility implemented and closed

**By:** Codex

**Actions:**
- Confirmed runtime policy already satisfied minimal scope:
  - legacy `meta/*` remains read-only fallback path;
  - no dedicated `legacy meta -> local profile` migration pipeline introduced;
  - precedence remains `local profile > legacy meta > defaults`.
- Applied documentation updates for deprecation and hard-cut roadmap:
  - `docs/wiki-gsk/06_versionado_y_migraciones.md`
  - `docs/wiki-gsk/CHANGELOG.md`
  - `docs/wiki-gsk/02_formato.md` (deprecation visibility note).
- No changes made to `src/core/gschema/**` or `errorCatalog`.

**Verification gates executed:**
- `npx vitest run src/tests/gschema.regression.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.strict-audit.test.ts` -> PASS
- `npx vitest run src/tests/workspace-profile.integration.test.ts src/tests/workspace-profile.service.test.ts` -> PASS
- `npx vitest run src/tests/wiki.error-catalog-parity-docs.test.ts src/tests/wiki.gschema-operations-parity.test.ts src/tests/gedcom.error-catalog-parity.test.ts` -> PASS
- `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py` -> PASS
- `npx tsc --noEmit` -> PASS

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada (boundary/contract review).

**Contract/Wiki Sync refs:**
- Runtime (no-op verification): `src/hooks/useGskFile.ts`, `src/core/gschema/GskPackage.ts`
- Wiki: `docs/wiki-gsk/06_versionado_y_migraciones.md`, `docs/wiki-gsk/CHANGELOG.md`, `docs/wiki-gsk/02_formato.md`

**Learnings:**
- A minimal compatibility step in `0.5.x` is enough to preserve stability while preparing a clean, explicit hard-cut in `0.6.0`.


