---
status: complete
priority: p1
issue_id: "042"
tags: [persistence, local-profile, app-meta, session]
dependencies: ["040"]
---

# Local Workspace Profile V1

## Problem Statement

After removing app metadata from `.gsk`, the app still needs persistent visual continuity (view config, layout, theme) for daily use.

## Findings

- Current visual continuity partly depends on `.gsk meta/*`.
- User goal keeps session continuity as a practical priority.
- The new architecture requires app metadata to be local and decoupled from the public core format.

## Proposed Solutions

### Option 1: Dedicated local profile store keyed by `graphId` (Recommended)

**Approach:** Introduce internal `WorkspaceProfileV1` persisted locally and loaded independently from `.gsk`.

**Pros:**
- Decouples UI state from format standard.
- Keeps user experience continuity.
- Supports future profile evolution without touching core schema.

**Cons:**
- Adds one local persistence service.

**Effort:** Medium

**Risk:** Low

## Recommended Action

Create `WorkspaceProfileV1` and `ProfileService` for save/load/clear by `graphId`, with safe defaults and corruption tolerance.

## Technical Details

**Data model draft:**
- `profileSchemaVersion`
- `graphId`
- `viewConfig`
- `visualConfig`
- `colorTheme`
- `uiState`
- `updatedAt`
- `source`

**Expected implementation targets:**
- `src/types/workspaceProfile.ts`
- `src/io/workspaceProfileService.ts`
- `src/hooks/useGskFile.ts`
- `src/App.tsx`
- `src/tests/workspace-profile.service.test.ts`
- `src/tests/workspace-profile.integration.test.ts`

## Contract/Wiki Sync

- Since this is app-internal, avoid adding it as part of public `gsk` contract.
- No runtime/schema changes in `src/core/gschema/**`.
- No normative wiki changes required for this task.

## Acceptance Criteria

- [x] Profile loads by `graphId` after opening a core `.gsk`.
- [x] Profile save/update flow works without writing to `.gsk`.
- [x] Missing/corrupt profile falls back to defaults without blocking load.
- [x] Profile schema version is explicit and migration-ready.
- [x] Closing checklist completed:
- [x] Skill `file-todos` applied (explicit confirmation in Work Log).
- [x] Skill `gsk-engine-architect` applied or `N/A` justified (explicit).
- [x] Contract/Wiki Sync section updated with exact file refs.

## Work Log

### 2026-03-04 - Task creation

**By:** Codex

**Actions:**
- Created local-profile architecture task.
- Defined profile boundary and expected fields.

**Learnings:**
- Profile-by-graphId gives continuity without contaminating core format.

### 2026-03-04 - WorkspaceProfileV1 implemented and integrated

**By:** Codex

**Actions:**
- Added app-internal profile contract in `src/types/workspaceProfile.ts`.
- Implemented dedicated local persistence service in `src/io/workspaceProfileService.ts` (DB `geneasketch-workspace-db`, store `workspace_profiles`).
- Updated load flow in `src/hooks/useGskFile.ts`:
  - load local profile by `graphId` after import;
  - precedence `local profile > gskMeta legacy > current/default`.
- Added debounced profile autosave in `src/App.tsx` keyed by `gschemaGraph.graphId`.
- Added tests:
  - `src/tests/workspace-profile.service.test.ts`
  - `src/tests/workspace-profile.integration.test.ts`

**Verification gates executed:**
- `npx vitest run src/tests/store.test.ts src/tests/store.recent-files.test.ts src/tests/workspace-profile.service.test.ts src/tests/workspace-profile.integration.test.ts` -> PASS
- `npx vitest run src/tests/gschema.regression.test.ts src/tests/gschema.strict.test.ts` -> PASS
- `npx tsc --noEmit` -> PASS

**Skill checks:**
- Skill `file-todos` aplicada.
- Skill `gsk-engine-architect` aplicada (boundary review: no `src/core/gschema/**`/contract changes).

**Contract/Wiki Sync refs:**
- Runtime app-internal: `src/types/workspaceProfile.ts`, `src/io/workspaceProfileService.ts`, `src/hooks/useGskFile.ts`, `src/App.tsx`
- Tests: `src/tests/workspace-profile.service.test.ts`, `src/tests/workspace-profile.integration.test.ts`
- Contractual wiki updates: none required in this task.

**Learnings:**
- Decoupling workspace metadata by `graphId` restores continuity without reintroducing `.gsk meta/*`.


