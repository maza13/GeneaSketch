# Super Analysis 0.5.0 fix plan

Release target after audit: `0.5.0 blocked`

## Fix order

### Batch 1. Release blockers

#### 1. Parity fix for direct projection IDs

- Goal:
  - eliminate semantic ID drift between direct and legacy projections
- Primary files:
  - `src/core/read-model/directProjection.ts`
  - `src/core/gschema/GedcomBridge.ts`
  - `src/core/read-model/selectors.ts`
- Implementation notes:
  - extract or share the xref synthesis strategy
  - preserve stable prefixed IDs when native `xref` is absent
  - rerun `src/tests/read-model.parity.audit.test.ts`
- Exit gate:
  - `0` semantic mismatches in the current parity corpus

#### 2. Dense-tree projection and search optimization

- Goal:
  - bring direct projection and search under release thresholds or re-baseline with defensible evidence
- Primary files:
  - `src/core/read-model/directProjection.ts`
  - `src/core/read-model/selectors.ts`
  - `src/ui/search/searchEngine.ts`
  - `src/tests/perf/dense-tree.audit.test.ts`
- Implementation notes:
  - profile repeated full-graph work
  - avoid rebuilding expensive structures unnecessarily
  - improve search indexing/caching for large projections
  - keep the dense-tree scenario reproducible
- Exit gate:
  - projection and search either meet thresholds or are re-baselined with explicit justification and stable variance

#### 3. Normalize mojibake in `fastTrack.ts`

- Goal:
  - restore correct accented Spanish matching in runtime AI fast-track parsing
- Primary files:
  - `src/core/ai/fastTrack.ts`
  - related tests to add under `src/tests/`
- Implementation notes:
  - fix literals and regex character classes
  - add regression coverage for accented inputs like `nació`, `murió`, `falleció`, `varón`
- Exit gate:
  - accented input path is covered by tests and passes

### Batch 2. Release-safe cleanup after blockers

#### 4. Normalize user-facing mojibake in AI review and diagnostics

- Primary files:
  - `src/core/ai/review.ts`
  - `src/core/ai/safety.ts`
  - `src/core/diagnostics/analyzer.ts`
- Exit gate:
  - visible Spanish strings render correctly

#### 5. Decide person-claims evidence UX scope

- Primary files:
  - `src/ui/PersonWorkspacePanel.tsx`
  - `src/ui/person/sections/PersonSourcesSection.tsx`
  - `src/ui/person/sections/PersonEventsSection.tsx`
- Decision point:
  - either explicitly defer first-class claim evidence UI to `0.6.0`
  - or implement a limited 0.5.x claim evidence surface

#### 6. Reduce hydration flicker risk or instrument it

- Primary files:
  - `src/hooks/useGskFile.ts`
  - `src/state/slices/docSlice.ts`
- Exit gate:
  - one-phase hydration or testable evidence that the current flow is visually acceptable

### Batch 3. 0.6.0 hard-cut preparation

#### 7. Remove legacy fallback after parity is green

- Primary files:
  - `src/core/read-model/selectors.ts`
  - `src/hooks/useGskFile.ts`
  - `src/App.tsx`
  - `src/state/slices/docSlice.ts`
- Dependency:
  - blocked on Batch 1 item 1

#### 8. Extract neutral utilities from `GedcomBridge`

- Primary files:
  - `src/core/gschema/GraphMutations.ts`
  - date parsing helper destination module

## Recommended execution sequence

1. Fix parity
2. Fix `fastTrack` encoding
3. Optimize projection/search
4. Rerun release-gate subset: `091`, `092`, `095`
5. If green, reassess release decision
6. Then do UX cleanup and 0.6.0 hard-cut prep

