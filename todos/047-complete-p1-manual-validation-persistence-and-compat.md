---
status: complete
priority: p1
issue_id: "047"
tags: [manual-testing, persistence, compatibility, release-gate]
dependencies: ["045", "046", "018"]
---

# Manual Validation: Persistence and Compatibility

## Problem Statement

Automated tests are required but not sufficient for this update. Manual validation is needed to confirm real user behavior for session continuity and file compatibility.
This gate must start with reproducible build validation (web + desktop) before manual UX/persistence scenarios.

## Findings

- User workflow requires reopening the app without reimporting every time.
- This initiative changes:
  - package boundary behavior (`gsk-core`),
  - local metadata persistence,
  - session autosave/restore behavior.
- Existing task `018` already defines broad manual testing context and should be linked.

## Proposed Solutions

### Option 1: Scenario-driven manual gate with evidence (Recommended)

**Approach:** Execute reproducible manual scenarios and log outcomes with pass/fail + observations.

**Pros:**
- Captures UX and timing edge cases.
- Verifies practical reliability for family usage.
- Complements automated verification.

**Cons:**
- Requires disciplined evidence logging.

**Effort:** Medium

**Risk:** Low

## Recommended Action

Run manual scenarios after automated gates and wiki sync are complete, then document findings and closure decision.

## Technical Details

**Required manual scenarios:**
1. Open app, edit visual state, restart app, verify session continuity.
2. Export new `.gsk` and confirm no `meta/*` is written.
3. Import legacy `.gsk` containing `meta/*`, verify core load and local profile continuity.
4. Verify strict/compat behavior using representative files.
5. Validate no forced reimport in normal daily reopen workflow.

**Build-first execution order (mandatory):**

### Phase A - Web build (blocking)
1. Run `npm run build`.
2. Validate artifacts:
   - `dist/index.html` exists.
   - `dist/assets/` is not empty.
3. Log command + timestamp + pass/fail evidence.

### Phase B - Desktop build Windows (blocking)
1. Run `npm run desktop:build:win`.
2. Validate artifacts:
   - `src-tauri/target/release/bundle/msi/*.msi` exists.
   - `src-tauri/target/release/bundle/nsis/*.exe` exists.
3. Log command + timestamp + discovered artifact paths + pass/fail evidence.

### Phase C - Informational release checks (non-blocking)
1. Run `npm run release:preflight`.
2. Run `npm run release:artifacts:verify`.
3. If these checks fail:
   - do not block `047` closure by themselves,
   - register warnings and recommended follow-up in Work Log.

### Phase D - Manual functional validation (blocking)
Execute the five required manual scenarios above using the generated desktop build.

**Go/No-Go closure rule:**
- `047` cannot close if Phase A fails.
- `047` cannot close if Phase B fails.
- `047` cannot close if any critical scenario in Phase D fails.
- Phase C is informational only and must be documented when failing.

## Contract/Wiki Sync

- If manual behavior differs from contract docs, block closure and reopen affected tasks.
- Record final behavior references in `039` master task.
- Runtime: no contractual/runtime delta in this task (validation-only closure).
- Evidence refs: `todos/047-complete-p1-manual-validation-persistence-and-compat.md`, `todos/039-complete-p1-gsk-core-master-plan.md`.

## Acceptance Criteria

- [x] Build web executed and `dist/` artifacts validated (`index.html` + non-empty `assets/`).
- [x] Build desktop executed and MSI/NSIS artifacts validated.
- [x] All manual scenarios executed with explicit pass/fail records.
- [x] No critical persistence regressions found.
- [x] Compatibility behavior matches documented contract.
- [x] Final sign-off note added to `039`.
- [x] Closing checklist completed:
- [x] Skill `file-todos` applied (explicit confirmation in Work Log).
- [x] Skill `gsk-engine-architect` applied or `N/A` justified (explicit).
- [x] Contract/Wiki Sync section updated with exact file refs.

## Work Log

### 2026-03-04 - Task creation

**By:** Codex

**Actions:**
- Created final manual validation gate task.
- Linked dependencies to automated gates, wiki sync, and prior manual cycle context.

**Learnings:**
- Manual persistence scenarios are essential for this product's real usage model.

### 2026-03-04 - Build-first gate update for manual validation

**By:** Codex

**Actions:**
- Updated `047` to enforce mandatory build-first execution before manual validation.
- Added explicit phase ordering (A: web build, B: desktop build, C: informational release checks, D: manual scenarios).
- Added blocking/non-blocking closure rules and artifact evidence requirements.
- Corrected governance reference from `036` to active master `039`.
- Kept task in `ready` (execution/closure remains pending manual run).

**Work Log template for execution evidence:**
- Phase A (Web build): command, timestamp, result, `dist/index.html`, `dist/assets` evidence.
- Phase B (Desktop build): command, timestamp, result, MSI/NSIS artifact paths.
- Phase C (Informational checks): command outputs, warnings, follow-up notes if failed.
- Phase D (Manual scenarios): scenario-by-scenario pass/fail + observations.

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada (boundary/contract-consistency review; no runtime contract change in this update).


### 2026-03-04 - Build gates A, B, C executed (Evidence)

**By:** Codex

**Actions:**
- **Phase A (Web build):** `npm run build` -> PASS. Artifacts verified in `dist/`.
- **Phase B (Desktop build Windows):** `npm run desktop:build:win` -> PASS.
  - MSI: `GeneaSketch_0.4.4_x64_en-US.msi` (~6.2 MB)
  - NSIS: `GeneaSketch_0.4.4_x64-setup.exe` (~4.5 MB)
- **Phase C (Informational checks):** `preflight` + `artifacts:verify` -> PASS. All manifests aligned at 0.4.4.

**Next:** Phase D (Manual scenarios) in generated desktop environment.

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada (build parity check).

### 2026-03-04 - Manual scenarios completed and accepted by user

**By:** Codex

**Actions:**
- Registered user sign-off confirming all manual scenarios were executed and validated.
- Marked Phase D as PASS and finalized GO closure decision.
- Closed `047` as complete and prepared master sync in `039`.

**Execution evidence (user-confirmed):**
- Persistence continuity after restart: PASS.
- Core-only `.gsk` export (no `meta/*`): PASS.
- Legacy import with `meta/*` continuity fallback: PASS.
- strict/compat policy behavior: PASS.
- No forced reimport in normal reopen flow: PASS.

**Closure decision:**
- GO (all build + manual checks accepted).

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect`: N/A for direct contract edits; boundary review satisfied (no `src/core/gschema/**` or `docs/wiki-gsk/**` changes in closure step).
