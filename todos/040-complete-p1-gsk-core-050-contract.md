---
status: complete
priority: p1
issue_id: "040"
tags: [gschema, gsk, contract, schema, wiki-gsk]
dependencies: ["038", "039"]
---

# GSK Core 0.5.0 Contract

## Problem Statement

The project needs a formal contract update so `.gsk` becomes core-only and stable as a domain format, while app-specific UI metadata is removed from the public standard.

## Findings

- Current contract allows optional `meta/*` in `.gsk`.
- Current runtime still exports and imports app meta from `meta/viewConfig.json`, `meta/visualConfig.json`, and `meta/colorTheme.json`.
- The initiative goal requires:
  - `gsk-core` as public standard.
  - app metadata moved to local internal profile.
- `gsk-engine-architect` mandates updates in runtime + wiki + validation.

## Proposed Solutions

### Option 1: Minor schema bump and explicit contract split (Recommended)

**Approach:** Define `schemaVersion: 0.5.0` as core-only contract with explicit legacy compatibility policy for pre-0.5 files.

**Pros:**
- Clear standard boundary.
- Easier long-term interoperability.
- Strong migration narrative.

**Cons:**
- Requires coordinated runtime/wiki/test updates.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Define and codify `0.5.0` contract:
- allowed package artifacts,
- strict/compat behavior for `meta/*`,
- migration semantics for legacy files.

## Technical Details

**Contract targets:**
- `.gsk` public artifacts: `manifest.json`, `graph.json`, optional `journal.jsonl`, optional `quarantine.json`, optional `media/*`.
- `meta/*` treated as:
  - legacy extension for older schemas,
  - non-compliant for `>=0.5.0` strict mode.

**Primary files changed in implementation phase:**
- `src/core/gschema/GskPackage.ts`
- `src/core/gschema/errorCatalog.ts`
- `src/tests/gschema.strict.test.ts`
- `src/tests/gschema.regression.test.ts`
- `docs/wiki-gsk/01_paradigma.md`
- `docs/wiki-gsk/02_formato.md`
- `docs/wiki-gsk/03_modelo.md`
- `docs/wiki-gsk/04_operaciones.md`
- `docs/wiki-gsk/06_versionado_y_migraciones.md`
- `docs/wiki-gsk/07_error_catalog.md`
- `docs/wiki-gsk/CHANGELOG.md`

## Contract/Wiki Sync

- Required chapters updated: `01`, `02`, `03`, `04`, `06`, `07`, `CHANGELOG`.
- Runtime contract files updated: `src/core/gschema/GskPackage.ts`, `src/core/gschema/errorCatalog.ts`.
- Tests and parity in sync:
  - `src/tests/gschema.strict.test.ts`
  - `src/tests/gschema.regression.test.ts`
  - `src/tests/wiki.error-catalog-parity-docs.test.ts`
  - `src/tests/wiki.gschema-operations-parity.test.ts`

## Acceptance Criteria

- [x] `0.5.0` core-only contract is specified in runtime and wiki.
- [x] Legacy compatibility behavior is explicit for import modes.
- [x] SemVer rationale and migration rules documented.
- [x] Contract references are aligned across `01/02/03/04/06`.
- [x] Closing checklist completed:
- [x] Skill `file-todos` applied (explicit confirmation in Work Log).
- [x] Skill `gsk-engine-architect` applied (explicit confirmation in Work Log).
- [x] Contract/Wiki Sync section updated with exact file refs.

## Work Log

### 2026-03-04 - Task creation

**By:** Codex

**Actions:**
- Created formal contract task for `gsk-core 0.5.0`.
- Linked required runtime and wiki targets.

**Learnings:**
- This task is the contractual anchor for all downstream execution.

### 2026-03-04 - Contract 0.5.0 base implemented

**By:** Codex

**Actions:**
- Applied runtime policy in `src/core/gschema/GskPackage.ts`:
  - Added `isCoreOnlySchema(schemaVersion)` and `isLegacySchema(schemaVersion)`.
  - Enforced `meta/*` handling by schema + mode on import.
  - Kept `GskImportResult.meta` for legacy-only parsing in this phase.
- Added error codes in `src/core/gschema/errorCatalog.ts`:
  - `CORE_META_FORBIDDEN`
  - `LEGACY_META_EXTENSION_DETECTED`
- Added contract tests:
  - `src/tests/gschema.strict.test.ts` (strict reject core schema + `meta/*`)
  - `src/tests/gschema.regression.test.ts` (compat ignore core meta; legacy keep meta + warning)
- Synced wiki contract/docs:
  - `docs/wiki-gsk/01_paradigma.md`
  - `docs/wiki-gsk/02_formato.md`
  - `docs/wiki-gsk/03_modelo.md`
  - `docs/wiki-gsk/04_operaciones.md`
  - `docs/wiki-gsk/06_versionado_y_migraciones.md`
  - `docs/wiki-gsk/07_error_catalog.md`
  - `docs/wiki-gsk/CHANGELOG.md`

**Verification gates executed:**
- `npx vitest run src/tests/gschema.golden.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.regression.test.ts` -> PASS
- `npx vitest run src/tests/wiki.error-catalog-parity-docs.test.ts src/tests/wiki.gschema-operations-parity.test.ts src/tests/gedcom.error-catalog-parity.test.ts` -> PASS
- `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py` -> PASS

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada.

**Contract/Wiki Sync refs:**
- Runtime: `src/core/gschema/GskPackage.ts`, `src/core/gschema/errorCatalog.ts`
- Wiki: `docs/wiki-gsk/01_paradigma.md`, `docs/wiki-gsk/02_formato.md`, `docs/wiki-gsk/03_modelo.md`, `docs/wiki-gsk/04_operaciones.md`, `docs/wiki-gsk/06_versionado_y_migraciones.md`, `docs/wiki-gsk/07_error_catalog.md`, `docs/wiki-gsk/CHANGELOG.md`

**Learnings:**
- The split \"contract now, export activation in 041\" keeps compatibility stable while locking the 0.5.0 standard boundary.


