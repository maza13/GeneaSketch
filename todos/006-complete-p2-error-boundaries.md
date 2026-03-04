---
status: complete
priority: p2
issue_id: "006"
tags: [robustness, ui, error-boundary]
dependencies: []
---

# Implement Panel Error Boundaries (UI Isolation)

Add reusable React Error Boundaries around high-risk UI regions so a panel crash does not break the full app shell.

## Problem Statement

Current UI has only a specific boundary for merge review (`MergeReviewErrorBoundary`).  
If another complex panel throws during render/update (left panel tools, right detail/timeline, wiki/search, external panel), users can lose the full working surface.

## Findings

- `App.tsx` already wires many heavy panels (left, tree/canvas, right stack, wiki, search, AI, external integrations).
- `MergeReviewErrorBoundary` exists and can be reused as a design reference.
- Previous note about `PersonEditorPanel` is outdated; current high-risk panels are `PersonWorkspacePanel/PersonWorkspacePanelV3`, `PersonDetailPanel`, `SearchCenterPanel`, `WikiPanel`, and side shells.

## Proposed Solutions

### Option 1: Region-level reusable boundaries (Recommended)

Create a generic `PanelErrorBoundary` and wrap major app regions (not every tiny component), with per-region reset + fallback UI.

**Effort:** 4-6 hours  
**Risk:** Low

## Recommended Action

1. Create `PanelErrorBoundary` reusable component in `src/ui/common/`.
2. Add region wrappers in `App.tsx`:
   - Left region (`LeftPanel`, tools).
   - Center region (`DTreeView` / canvas area).
   - Right region (`RightPanel`, `TimelineRightPanel`, detail/workspace modals when mounted).
   - Utility panels (`WikiPanel`, `SearchCenterPanel`, `FamilySearchPanel`) with isolated fallback.
3. Keep `MergeReviewErrorBoundary` as-is or adapt it to extend the generic boundary.
4. Add `onReset` hooks to close/reopen panel state (not full app reload).
5. Add tests for fallback rendering and reset behavior.

## Acceptance Criteria

- [x] A runtime error in one wrapped panel does not crash `TopMenuBar`, navigation, or tree/canvas interactions.
- [x] Fallback shows a clear message and a reset action for the failed region.
- [x] Existing merge-review boundary flow keeps working.
- [x] Test coverage added for at least one boundary fallback and one reset path.

## Work Log

### 2026-03-02 - Audit Discovery

**By:** Antigravity

**Actions:**
- Identified as a reliability improvement.

### 2026-03-04 - Plan refreshed and approved

**By:** Codex

**Actions:**
- Updated issue from `pending` to `ready`.
- Refreshed scope to current architecture (`App.tsx`, existing `MergeReviewErrorBoundary`).
- Defined execution plan with region-level wrappers and tests.


### 2026-03-04 - Boundary implementation completed

**By:** Codex

**Actions:**
- Added reusable PanelErrorBoundary in src/ui/common/PanelErrorBoundary.tsx.
- Wrapped App regions: leftPanel, rightPanel, canvas, SearchCenterPanel, WikiPanel, FamilySearchPanel.
- Added tests in src/tests/panel-error-boundary.test.tsx (fallback + reset path).
- Verified npm run build and targeted tests in green.

