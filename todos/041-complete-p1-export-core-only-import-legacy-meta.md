---
status: complete
priority: p1
issue_id: "041"
tags: [gschema, io, export, import, compatibility]
dependencies: ["040"]
---

# Export Core-Only and Import Legacy Meta

## Problem Statement

Runtime IO currently writes app metadata inside `.gsk`, which conflicts with the new core-only standard goal.

## Findings

- `useGskFile.saveGsk` currently passes `meta` to export.
- `GskPackage` currently writes and reads `meta/*`.
- We must keep legacy import compatibility while stopping new `meta/*` exports.

## Proposed Solutions

### Option 1: Core-only export + backward-compatible import (Recommended)

**Approach:** Remove `meta` from export pipeline, keep controlled import of legacy `meta/*` for migration into local profile.

**Pros:**
- Immediate standard purity for new files.
- No hard break for existing user files.
- Supports phased migration.

**Cons:**
- Requires warning and mode policy updates.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Implement:
1. Export path emits core-only artifacts.
2. Import path accepts legacy meta for old schema versions only.
3. Add explicit strict/compat policy behavior for illegal `meta/*` in new schema.

## Technical Details

**Implemented targets:**
- `src/hooks/useGskFile.ts`
- `src/io/fileIOService.ts`
- `src/core/gschema/GSchemaGraph.ts`
- `src/core/gschema/GskPackage.ts`
- `src/core/gschema/LegacyMigrator.ts`
- `src/tests/gschema.regression.test.ts`
- `src/tests/gschema.strict-audit.test.ts`
- `src/tests/gschema.migration-040.test.ts`

## Contract/Wiki Sync

- Required chapters: `02_formato.md`, `06_versionado_y_migraciones.md`, `07_error_catalog.md`.
- Add behavior matrix for `meta/*` by schema and mode.

## Acceptance Criteria

- [x] New `.gsk` exports contain no `meta/*`.
- [x] Legacy `.gsk` with `meta/*` still imports in supported compatibility flow.
- [x] Import behavior for invalid `meta/*` in `>=0.5.0` is mode-dependent and documented.
- [x] Tests cover strict-lossless, strict-lossless-audit, and compat behavior.
- [x] Closing checklist completed:
- [x] Skill `file-todos` applied (explicit confirmation in Work Log).
- [x] Skill `gsk-engine-architect` applied (explicit confirmation in Work Log).
- [x] Contract/Wiki Sync section updated with exact file refs.

## Work Log

### 2026-03-04 - Task creation

**By:** Codex

**Actions:**
- Created IO transition task for export/import split.
- Captured required policy and test targets.

**Learnings:**
- Backward compatibility is feasible without compromising new standard purity.

### 2026-03-04 - 0.5.0 export activation implemented

**By:** Codex

**Actions:**
- Activated core-only runtime export in `src/core/gschema/GskPackage.ts`:
  - export no longer writes `meta/*`;
  - integrity no longer includes `role: "meta"` in new packages;
  - export normalizes `manifest.schemaVersion` + `graph.json.schemaVersion` to `0.5.0`.
- Updated default in `src/core/gschema/GSchemaGraph.ts` to `0.5.0`.
- Removed app metadata injection from active export callers:
  - `src/hooks/useGskFile.ts` (`saveGsk`, `exportBranchGsk`);
  - `src/core/gschema/LegacyMigrator.ts`.
- Added/updated contractual tests:
  - `src/tests/gschema.regression.test.ts`
  - `src/tests/gschema.strict-audit.test.ts`
  - `src/tests/gschema.migration-040.test.ts`
- Synced docs:
  - `docs/wiki-gsk/02_formato.md`
  - `docs/wiki-gsk/06_versionado_y_migraciones.md`
  - `docs/wiki-gsk/07_error_catalog.md`
  - `docs/wiki-gsk/CHANGELOG.md`

**Verification gates executed:**
- `npx vitest run src/tests/gschema.golden.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.regression.test.ts` -> PASS
- `npx vitest run src/tests/gschema.strict-audit.test.ts src/tests/gschema.migration-040.test.ts` -> PASS
- `npx vitest run src/tests/wiki.error-catalog-parity-docs.test.ts src/tests/wiki.gschema-operations-parity.test.ts src/tests/gedcom.error-catalog-parity.test.ts` -> PASS
- `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py` -> PASS

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada.

**Contract/Wiki Sync refs:**
- Runtime: `src/core/gschema/GskPackage.ts`, `src/core/gschema/GSchemaGraph.ts`, `src/hooks/useGskFile.ts`, `src/core/gschema/LegacyMigrator.ts`
- Docs: `docs/wiki-gsk/02_formato.md`, `docs/wiki-gsk/06_versionado_y_migraciones.md`, `docs/wiki-gsk/07_error_catalog.md`, `docs/wiki-gsk/CHANGELOG.md`

**Learnings:**
- Activating schema `0.5.0` at export-time plus import compatibility allows clean forward output without breaking legacy loads.


