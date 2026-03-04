---
status: complete
priority: p1
issue_id: "039"
tags: [gsk-core, master-plan, governance, todos, standards]
dependencies: ["038"]
---

# GSK Core Master Plan

## Problem Statement

The initiative to move GeneaSketch toward `gsk-core` requires a single execution board with explicit sequencing, scope boundaries, and verification gates.

## Findings

- The project already has strong `wiki-gsk` hardening practices, but this initiative spans runtime, docs, and persistence.
- The user requested strict dual-skill orchestration:
  - `file-todos` for governance and closure discipline.
  - `gsk-engine-architect` for `.gsk` contract guardrails.
- Existing backlog quality issue (duplicate IDs) was resolved in `038`.

## Proposed Solutions

### Option 1: Dedicated master task with phase matrices (Recommended)

**Approach:** Maintain one master todo as the canonical control plane for tasks, wiki impact, and tests.

**Pros:**
- Single source of execution truth.
- Clear dependency graph and handoff points.
- Easier audit and release gating.

**Cons:**
- Requires disciplined updates at every closure.

**Effort:** 1 hour setup + ongoing maintenance

**Risk:** Low

## Recommended Action

Use this task as the mandatory control layer for execution closure of `040..047`.  
`048` remains explicitly deferred as future work (`0.6.0` hard-cut track) and does not block closure of this master task.

## Technical Details

### Task Matrix

| Issue | Title | Priority | Dependencies | Skill Lead |
| :--- | :--- | :---: | :--- | :--- |
| 038 | normalize-todo-id-collisions | p1 | [] | file-todos |
| 039 | gsk-core-master-plan | p1 | [038] | dual |
| 040 | gsk-core-050-contract | p1 | [038,039] | gsk-engine-architect |
| 041 | export-core-only-import-legacy-meta | p1 | [040] | gsk-engine-architect |
| 042 | local-workspace-profile-v1 | p1 | [040] | file-todos (+gsk review) |
| 043 | session-robustness-v2 | p1 | [042] | file-todos (+gsk review if needed) |
| 044 | legacy-meta-migration-to-local-profile | p1 | [041,042] | dual |
| 045 | gsk-core-test-matrix-and-gates | p1 | [041,042,043,044] | dual |
| 046 | wiki-gsk-sync-050-and-changelog | p2 | [040,045] | gsk-engine-architect |
| 047 | manual-validation-persistence-and-compat | p1 | [045,046,018] | file-todos |
| 048 | hard-cut-legacy-compat-060 (deferred/future) | p2 | [044,046,047] | dual |

### Wiki Impact Matrix

| Chapter | Expected update owner | Trigger task(s) |
| :--- | :--- | :--- |
| `01_paradigma.md` | gsk-engine-architect | 040, 046 |
| `02_formato.md` | gsk-engine-architect | 040, 041, 046, 048 |
| `03_modelo.md` | gsk-engine-architect | 040, 046 |
| `04_operaciones.md` | gsk-engine-architect | 040, 046 |
| `05_interoperabilidad_gedcom.md` | gsk-engine-architect | 044, 046 |
| `06_versionado_y_migraciones.md` | gsk-engine-architect | 040, 046, 048 |
| `07_error_catalog.md` | gsk-engine-architect | 040, 041, 044, 046 |
| `CHANGELOG.md` (wiki-gsk) | gsk-engine-architect | 040, 046, 048 |

### Test Matrix by Phase

| Phase | Required commands |
| :--- | :--- |
| Contract/runtime changes | `npx vitest run src/tests/gschema.golden.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.regression.test.ts` |
| Parity checks | `npx vitest run src/tests/wiki.error-catalog-parity-docs.test.ts src/tests/wiki.gschema-operations-parity.test.ts src/tests/gedcom.error-catalog-parity.test.ts` |
| Docs link validation | `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py` |
| Session/persistence | targeted store/session tests + manual scenario logs in task Work Log |

## Contract/Wiki Sync

- This task governs cross-sync for the active execution scope (`040..047`) and can be marked complete when those child tasks are complete and evidence-linked.
- All child tasks must add file references here on closure.
- Child `040` synced:
  - Runtime: `src/core/gschema/GskPackage.ts`, `src/core/gschema/errorCatalog.ts`
  - Wiki: `docs/wiki-gsk/01_paradigma.md`, `docs/wiki-gsk/02_formato.md`, `docs/wiki-gsk/03_modelo.md`, `docs/wiki-gsk/04_operaciones.md`, `docs/wiki-gsk/06_versionado_y_migraciones.md`, `docs/wiki-gsk/07_error_catalog.md`, `docs/wiki-gsk/CHANGELOG.md`
- Child `041` synced:
  - Runtime: `src/core/gschema/GskPackage.ts`, `src/core/gschema/GSchemaGraph.ts`, `src/hooks/useGskFile.ts`, `src/core/gschema/LegacyMigrator.ts`
  - Wiki: `docs/wiki-gsk/02_formato.md`, `docs/wiki-gsk/06_versionado_y_migraciones.md`, `docs/wiki-gsk/07_error_catalog.md`, `docs/wiki-gsk/CHANGELOG.md`
- Child `042` synced:
  - Runtime (app-internal): `src/types/workspaceProfile.ts`, `src/io/workspaceProfileService.ts`, `src/hooks/useGskFile.ts`, `src/App.tsx`
  - Wiki: no contractual updates required (boundary unchanged).
- Child `043` synced:
  - Runtime (app-internal): `src/io/sessionService.ts`, `src/state/slices/sessionSlice.ts`
  - Tests: `src/tests/session.service.test.ts`, `src/tests/store.test.ts`
  - Wiki: no contractual updates required (boundary unchanged).
- Child `044` synced:
  - Runtime: no contract/runtime delta required in this minimal scope (`src/hooks/useGskFile.ts`, `src/core/gschema/GskPackage.ts` verified).
  - Wiki: `docs/wiki-gsk/06_versionado_y_migraciones.md`, `docs/wiki-gsk/CHANGELOG.md`, `docs/wiki-gsk/02_formato.md`.
- Child `045` synced:
  - Runtime: no functional delta (evidence-only gate closure).
  - Evidence/tests: full matrix A-F executed and logged in `todos/045-complete-p1-gsk-core-test-matrix-and-gates.md`.
  - Wiki: no additional normative update required in this task.
- Child `046` synced:
  - Runtime: no functional delta (contract/wiki sync closure).
  - Wiki: `docs/wiki-gsk/01_paradigma.md`, `docs/wiki-gsk/CHANGELOG.md`.
  - Evidence/tests: parity + link + gschema sanity logged in `todos/046-complete-p2-wiki-gsk-sync-050-and-changelog.md`.
- Child `047` synced:
  - Runtime: no functional delta (manual validation gate closure).
  - Evidence: build-first gate A/B/C and manual scenarios accepted in `todos/047-complete-p1-manual-validation-persistence-and-compat.md`.
  - Wiki: no additional normative update required in this task.

## Acceptance Criteria

- [x] Task matrix is current and consistent with actual backlog files.
- [x] Wiki impact matrix is current.
- [x] Test matrix is current and executable.
- [x] Every child closure is reflected in this file immediately.
- [x] Closing checklist completed:
- [x] Skill `file-todos` applied (explicit confirmation in Work Log).
- [x] Skill `gsk-engine-architect` applied (explicit confirmation in Work Log).
- [x] Contract/Wiki Sync section updated.

## Work Log

### 2026-03-04 - Task creation

**By:** Codex

**Actions:**
- Created master-control todo for the `gsk-core` initiative.
- Added task, wiki, and verification matrices.

**Learnings:**
- Centralized control reduces risk of divergence between runtime and wiki.

### 2026-03-04 - Backlog normalization update

**By:** Codex

**Actions:**
- Registered completion of `038` (ID-collision normalization).
- Updated master matrices and dependency IDs after global renumbering.
- Confirmed next executable child task is `040`.

**Evidence from 038:**
- `NO_DUPLICATE_IDS`
- `FILENAME_FRONTMATTER_PARITY_OK`
- `ALL_DEPENDENCIES_RESOLVE_UNIQUELY`

**Learnings:**
- Keeping a master matrix synchronized after renumbering prevents hidden dependency drift.

### 2026-03-04 - Child 040 completed and 041 unblocked

**By:** Codex

**Actions:**
- Registered closure of `040` (`todos/040-complete-p1-gsk-core-050-contract.md`).
- Confirmed contract/runtime updates for `0.5.0` base and import policy enforcement for `meta/*`.
- Updated wiki impact matrix to include `07_error_catalog.md` and `CHANGELOG.md` under `040`.
- Confirmed next executable child task: `041`.

**Evidence from 040:**
- `npx vitest run src/tests/gschema.golden.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.regression.test.ts` -> PASS
- `npx vitest run src/tests/wiki.error-catalog-parity-docs.test.ts src/tests/wiki.gschema-operations-parity.test.ts src/tests/gedcom.error-catalog-parity.test.ts` -> PASS
- `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py` -> PASS

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada.

### 2026-03-04 - Child 046 completed, 047 now pending only on 018

**By:** Codex

**Actions:**
- Registered closure of `046` (`todos/046-complete-p2-wiki-gsk-sync-050-and-changelog.md`).
- Confirmed minimum-scope contractual wiki sync for `0.5.0` without runtime changes.
- Updated Contract/Wiki Sync registry for child `046`.
- Confirmed dependency status:
  - `047` now pending only on `018` (`045 + 046` satisfied).
  - `048` remains deferred hard-cut track.

**Evidence from 046:**
- `npx vitest run src/tests/wiki.error-catalog-parity-docs.test.ts src/tests/wiki.gschema-operations-parity.test.ts src/tests/gedcom.error-catalog-parity.test.ts` -> PASS
- `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py` -> PASS
- `npx vitest run src/tests/gschema.golden.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.regression.test.ts` -> PASS

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada (contract/wiki guardrails + parity review).

### 2026-03-04 - Child 047 completed, 048 now unblocked

**By:** Codex

**Actions:**
- Registered closure of `047` (`todos/047-complete-p1-manual-validation-persistence-and-compat.md`).
- Registered user sign-off for manual validation scenarios and build-first gate acceptance.
- Updated Contract/Wiki Sync registry for child `047`.
- Confirmed dependency status:
  - `048` is now unblocked (`044 + 046 + 047` complete).

**Evidence from 047:**
- Build web (`npm run build`) accepted with `dist/` artifacts.
- Build desktop (`npm run desktop:build:win`) accepted with MSI/NSIS artifacts.
- Manual scenarios accepted by user sign-off (persistence + compatibility).

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect`: N/A for direct contract edits; boundary review satisfied.

### 2026-03-04 - Child 042 completed, 043 and 044 unblocked

**By:** Codex

**Actions:**
- Registered closure of `042` (`todos/042-complete-p1-local-workspace-profile-v1.md`).
- Confirmed local `WorkspaceProfileV1` persistence is active and decoupled from `.gsk`.
- Confirmed no changes to `gsk-core` runtime contract (`src/core/gschema/**`) and no wiki-gsk normative changes required.
- Updated Contract/Wiki Sync registry for child `042`.
- Confirmed dependency unlock:
  - `043` now unblocked (depends on `042`).
  - `044` now fully unblocked (`041` + `042` complete).
  - `045` still waiting on `043` + `044`.

**Evidence from 042:**
- `npx vitest run src/tests/store.test.ts src/tests/store.recent-files.test.ts src/tests/workspace-profile.service.test.ts src/tests/workspace-profile.integration.test.ts` -> PASS
- `npx vitest run src/tests/gschema.regression.test.ts src/tests/gschema.strict.test.ts` -> PASS
- `npx tsc --noEmit` -> PASS

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada (boundary review).

### 2026-03-04 - Child 043 completed, 045 now waiting only on 044

**By:** Codex

**Actions:**
- Registered closure of `043` (`todos/043-complete-p1-session-robustness-v2.md`).
- Confirmed session autosave/restore hardening is active with migration + lock-release behavior.
- Updated Contract/Wiki Sync registry for child `043`.
- Confirmed dependency status:
  - `044` remains ready/unblocked (already unblocked by `041+042`).
  - `045` now waiting only on `044` (since `043` is complete).

**Evidence from 043:**
- `npx vitest run src/tests/session.service.test.ts src/tests/store.test.ts src/tests/store.recent-files.test.ts` -> PASS
- `npx vitest run src/tests/gschema.regression.test.ts src/tests/gschema.strict.test.ts` -> PASS
- `npx tsc --noEmit` -> PASS

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada (boundary review).

### 2026-03-04 - 044 scope refined + 048 hard-cut task created

**By:** Codex

**Actions:**
- Re-scoped `044` to minimum compatibility mode for `0.5.x`:
  - no new auto-migration write complexity,
  - keep stable fallback behavior,
  - document deprecation and hard-cut plan.
- Added `048-pending-p2-hard-cut-legacy-compat-060.md` for explicit no-retrocompat `0.6.0` execution.
- Updated task matrix and wiki impact matrix to include hard-cut phase.

**Dependency impact:**
- `044` remains the current execution gate for `045`.
- `048` is intentionally deferred (post-`0.5.x` hard-cut track).

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada (scope/contract planning review).

### 2026-03-04 - Child 044 completed, 045 unblocked

**By:** Codex

**Actions:**
- Registered closure of `044` (`todos/044-complete-p1-legacy-meta-migration-to-local-profile.md`).
- Confirmed `044` executed as minimal-compatibility step for `0.5.x` (no dedicated migration pipeline added).
- Confirmed deprecation path and hard-cut direction documented for `0.6.0`.
- Updated Contract/Wiki Sync registry for child `044`.
- Confirmed dependency unlock:
  - `045` is now unblocked (`041+042+043+044` complete).
  - `048` remains deferred as post-`0.5.x` hard-cut track.

**Evidence from 044:**
- `npx vitest run src/tests/gschema.regression.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.strict-audit.test.ts` -> PASS
- `npx vitest run src/tests/workspace-profile.integration.test.ts src/tests/workspace-profile.service.test.ts` -> PASS
- `npx vitest run src/tests/wiki.error-catalog-parity-docs.test.ts src/tests/wiki.gschema-operations-parity.test.ts src/tests/gedcom.error-catalog-parity.test.ts` -> PASS
- `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py` -> PASS
- `npx tsc --noEmit` -> PASS

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada (boundary/contract review).

### 2026-03-04 - Child 045 completed, 046 unblocked

**By:** Codex

**Actions:**
- Registered closure of `045` (`todos/045-complete-p1-gsk-core-test-matrix-and-gates.md`).
- Executed full unified quality gate matrix (A-F) and consolidated evidence.
- Confirmed `045` is evidence-only with no runtime feature delta.
- Updated Contract/Wiki Sync registry for child `045`.
- Confirmed dependency status:
  - `046` is now unblocked (`040 + 045` complete).
  - `047` remains pending `046 + 018`.
  - `048` remains deferred hard-cut track.

**Evidence from 045:**
- `npx vitest run src/tests/gschema.golden.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.regression.test.ts` -> PASS
- `npx vitest run src/tests/gschema.strict-audit.test.ts src/tests/gschema.migration-040.test.ts` -> PASS
- `npx vitest run src/tests/session.service.test.ts src/tests/store.test.ts src/tests/store.recent-files.test.ts src/tests/workspace-profile.service.test.ts src/tests/workspace-profile.integration.test.ts` -> PASS
- `npx vitest run src/tests/wiki.error-catalog-parity-docs.test.ts src/tests/wiki.gschema-operations-parity.test.ts src/tests/gedcom.error-catalog-parity.test.ts` -> PASS
- `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py` -> PASS
- `npx tsc --noEmit` -> PASS

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada (parity/contract gate review).

### 2026-03-04 - Child 041 completed, 044 unblocked

**By:** Codex

**Actions:**
- Registered closure of `041` (`todos/041-complete-p1-export-core-only-import-legacy-meta.md`).
- Confirmed operational activation of core-only export with `schemaVersion = 0.5.0`.
- Confirmed compatibility import for legacy `meta/*` remains active.
- Updated Contract/Wiki Sync registry for child `041`.
- Confirmed dependency unlock:
  - `044` now unblocked (`041` + `042` requirement now waiting only on `042`).
  - `045` progresses with `041` complete, still waiting on `042/043/044`.

**Evidence from 041:**
- `npx vitest run src/tests/gschema.golden.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.regression.test.ts` -> PASS
- `npx vitest run src/tests/gschema.strict-audit.test.ts src/tests/gschema.migration-040.test.ts` -> PASS
- `npx vitest run src/tests/wiki.error-catalog-parity-docs.test.ts src/tests/wiki.gschema-operations-parity.test.ts src/tests/gedcom.error-catalog-parity.test.ts` -> PASS
- `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py` -> PASS

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada.

### 2026-03-04 - 047 Build Validation Completed

**By:** Codex

**Actions:**
- Executed and validated Phase A, B, and C of `047` (Manual Validation).
- Web build (dist) and Desktop builds (MSI/NSIS) for 0.4.4 are verified.
- Preflight and artifact checks passed.
- **Current Status:** 047 is waiting for Phase D (Manual scenarios) for final closure.

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada.

### 2026-03-04 - Master 039 closure (040..047 complete, 048 deferred)

**By:** Codex

**Actions:**
- Closed master task `039` after confirming complete execution/evidence for child tasks `040..047`.
- Declared `048` as explicitly deferred future track (`0.6.0` hard-cut), outside current closure scope.
- Updated acceptance checklist and closure criteria to reflect active scope.
- Kept governance traceability for future reactivation of `048` when intentionally scheduled.

**Closure scope decision:**
- In scope complete: `040`, `041`, `042`, `043`, `044`, `045`, `046`, `047`.
- Out of scope (deferred): `048`.

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada (contract/governance boundary alignment).
