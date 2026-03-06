# Super Analysis 0.5.0 fix plan

Release target after blocker implementation: `0.5.0 ready with postship debt`

## Completed blocker batch

### 1. Parity fix for direct projection IDs

- Status: `done`
- Result:
  - direct projection and legacy bridge now share synthetic XREF generation
  - parity audit rerun is green with `0` semantic mismatches

### 2. Dense-tree projection and search optimization

- Status: `done`
- Result:
  - projection p95 is under threshold
  - search p95 is under threshold
  - dense-tree audit classification is now `pass`

### 3. Normalize mojibake in `fastTrack.ts`

- Status: `done`
- Result:
  - accented Spanish matching is covered and green
  - runtime blocker removed from dimension 6

## Remaining follow-up

### 4. Normalize user-facing mojibake in AI review and diagnostics

- Primary files:
  - `src/core/ai/review.ts`
  - `src/core/ai/safety.ts`
  - `src/core/diagnostics/analyzer.ts`
- Exit gate:
  - visible Spanish strings render correctly

### 5. Decide person-claims evidence UX scope

- Primary files:
  - `src/ui/PersonWorkspacePanel.tsx`
  - `src/ui/person/sections/PersonSourcesSection.tsx`
  - `src/ui/person/sections/PersonEventsSection.tsx`
- Decision point:
  - either explicitly defer first-class claim evidence UI to `0.6.0`
  - or implement a limited 0.5.x claim evidence surface

### 6. Reduce hydration flicker risk or instrument it

- Primary files:
  - `src/hooks/useGskFile.ts`
  - `src/state/slices/docSlice.ts`
- Exit gate:
  - one-phase hydration or testable evidence that the current flow is visually acceptable

### 7. Remove legacy fallback after release

- Primary files:
  - `src/core/read-model/selectors.ts`
  - `src/hooks/useGskFile.ts`
  - `src/App.tsx`
  - `src/state/slices/docSlice.ts`
- Release impact:
  - `0.6.0-hardcut`

### 8. Extract neutral utilities from `GedcomBridge`

- Primary files:
  - `src/core/gschema/GraphMutations.ts`
  - date parsing helper destination module

## Recommended execution sequence

1. Ship or tag the blocker-clearing bundle.
2. Clean remaining mojibake in review/diagnostics strings.
3. Decide whether claim evidence UI is deferred or scoped into 0.5.x.
4. Instrument or simplify hydration to retire the flicker question.
5. Resume the 0.6.0 hard-cut migration after release.
