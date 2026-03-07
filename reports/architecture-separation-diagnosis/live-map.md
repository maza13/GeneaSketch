# Live Architecture Map

Generated: 2026-03-07
Execution phase: `116`
Current chain: `115`

## Current Status

- execution state: `phase-0-established`
- strategy: `Guided Hard Cut`
- hotspot order: unchanged from diagnosis
- live-vs-base status: no runtime refactor phases executed yet

## Current Boundary Snapshot

At the end of `Phase 0`, the current runtime still matches the diagnosed pre-execution baseline in structural terms:

- `App Shell` remains mixed
- `State Manager` remains mixed
- `GSK Package IO`, `GEDCOM IO`, `Read Model`, and `AI Assistant` remain transitional
- `GSchema Engine`, `Visual Engine`, `Workspace Profile`, and `Knowledge System` remain the strongest preserved boundaries

## Phase 0 Clarifications Added

The following did change in `Phase 0`, even though runtime code boundaries did not:

- the architecture packet now has an explicit operating model for `base map`, `live map`, `target map`, and `consideration log`
- future-facing concerns now have explicit dispositions rather than staying implicit
- the distinction between `shareable tree state` and `local/private workspace state` is now part of the execution guardrails
- temporary-repository shared-tree support is now recognized as a near/mid-term architectural constraint, but not an implementation scope item for this chain

## Debt Still Intentionally Present

- root orchestration concentration in `App.tsx`
- mixed file/hydration/profile orchestration in `useGskFile.ts`
- the `State Manager <-> GSchema Engine <-> Read Model` knot
- the broad AI write-back bridge
- the legacy read-model fallback in the central selector boundary

## Next Expected Change

If `117` completes successfully, this live map should show:

- reduced orchestration concentration at the runtime edge
- clearer separation between package/file concerns and runtime hydration/orchestration concerns
- cleaner `Workspace Profile` application boundaries
