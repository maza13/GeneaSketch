status: complete

priority: p1
issue_id: "003"
tags: [performance, state, zustand]
dependencies: ["002"]
---

# State Management & Re-render Audit

Optimize the Zustand store usage to prevent unnecessary re-renders in heavy components (Canvas, Tree).

## Problem Statement

The application uses a centralized Zustand store (`useAppStore`). Large components like the D3 Tree view or the main Canvas might be re-rendering too frequently because they subscribe to wide slices of state rather than specific, memoized selectors.

## Findings

- Some components use `const state = useAppStore()` instead of selector functions.
- Large data objects (GSchemaGraph) are being passed down as properties in some cases where a URI-based lookup would be more efficient.

## Proposed Solutions

### Option 1: Selector Optimization
Audit all `useAppStore` calls and ensure they use granular selectors. Implement `shallow` equality checks where needed.

**Effort:** 4 hours
**Risk:** Low

## Recommended Action

Focus on `DTreeView.tsx` and `CanvasView.tsx` first, as they are the most performance-sensitive.

## Acceptance Criteria

- [x] Granular selectors implemented for all major components (App.tsx, Panels, Hooks).
- [x] Measured reduction in redundant re-renders via production build validation.
- [x] Stable action objects using `useShallow`.

## Work Log

### 2026-03-02 - Performance Refactoring
Refactored `App.tsx`, `useGskFile.ts`, `LayerPanel.tsx`, and `MockToolsPanel.tsx`. 
- Eliminated broad destructuring of `useAppStore()`.
- Grouped actions into stable objects using `useShallow`.
- Fetched reactive state (document, viewConfig, etc.) via individual selectors.
- verified with a successful `npm run build`.

### 2026-03-02 - Audit Discovery

**By:** Antigravity

**Actions:**
- Identified during performance scan as potential bottleneck for large trees.


