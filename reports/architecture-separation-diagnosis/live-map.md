# Live Architecture Map

Generated: 2026-03-07
Execution phase: `120`
Current chain: `115`

## Current Status

- execution state: `phase-4-read-model-mainline-singularized`
- strategy: `Guided Hard Cut`
- hotspot order: unchanged from diagnosis
- live-vs-base status: runtime-edge, store mutation coordination, AI write-back, and the central read-model mainline are now all narrower than the base map

## Current Boundary Snapshot

At the end of `Phase 4`, the runtime no longer matches the pre-execution baseline at the shell/file edge, store mutation edge, AI write-back edge, or central read-model edge:

- `App.tsx` no longer owns the local autosession/profile persistence effects directly
- file-load hydration now enters runtime through `useFileLoadRuntime.ts`
- `useGskFile.ts` is narrower and now focuses on file/package parsing, recent-file handling, import/export, and status/reporting
- `Workspace Profile` persistence remains local/private, but is now surfaced through `useWorkspacePersistenceEffects.ts` instead of staying hidden in `App.tsx`
- merge application runtime re-entry is now routed through the same runtime adapter family instead of a broader inline path
- `docSlice.ts` now routes graph writes through an explicit reconciliation helper instead of repeating mutation + projection + refresh logic per action
- load-time reconciliation and post-mutation reconciliation are now explicit store helpers in `graphStateTransitions.ts`
- the store is closer to a coordinator role for graph writes, while `projectGraphDocument` and `ensureExpanded` sit behind a narrower reconciliation contract
- projected-document re-entry now has an explicit store surface via `applyProjectedDocument(...)`
- AI write-back now enters through `applyProjectedDocument(..., "ai")` instead of calling broad `documentToGSchema(...) + loadGraph(...)` glue inline from `App.tsx`
- merge apply, diagnostics, and mock generation also converge on the same projected-document apply surface instead of keeping parallel full-document bridges
- `projectGraphDocument(...)` is now a singular direct-mainline entrypoint
- legacy read-model projection moved to an explicit compatibility side edge through `projectLegacyGraphDocument(...)`
- runtime requests for legacy read-model mode are normalized away instead of reintroducing branching into the central selector path
- `GSK Package IO`, `GEDCOM IO`, `Read Model`, and `AI Assistant` remain transitional
- `GSchema Engine`, `Visual Engine`, `Workspace Profile`, and `Knowledge System` remain the strongest preserved boundaries

## Phase 4 Boundary Changes

The following changed in `Phase 4`:

- the central selector mainline is now direct-only and explicit
- legacy projection survives only as an explicit compatibility entrypoint, not as a hidden central fallback
- runtime state no longer depends on a direct-vs-legacy branch inside the mainline selector path
- the stable `GSchema Engine -> Read Model` boundary remains intact; the compatibility debt was pushed to a thinner side edge instead of remaining in the center

## Debt Still Intentionally Present

- residual orchestration concentration in `App.tsx`
- residual coupling between `State Manager <-> GSchema Engine <-> Read Model`, especially around view-triggered reprojection in `viewSlice.ts`
- compatibility support still exists as an explicit side edge for tests/audit tooling (`projectLegacyGraphDocument(...)`)

## Base vs Live vs Target

- Base map:
  - central selector path still carried direct-vs-legacy ambiguity
  - runtime edge, store mutation edge, and AI write-back all had broader bridges
- Live map:
  - runtime edge is split into explicit shell persistence and file-load runtime seams
  - store mutation and projected-document application are narrower and more auditable
  - AI no longer owns a privileged broad bridge
  - central read-model mainline is singular and direct-only
- Target map:
  - the current live state now matches the intended target shape on the major chain objectives
  - remaining debt is now residual edge cleanup, not central hotspot ambiguity

## Residual Debt After Chain

- `App.tsx` is now closer to a composition root after moving shell interaction state, modal routing, node interaction handlers, and keyboard shortcuts into dedicated shell hooks
- residual shell debt still exists, but it is now centered on render composition density rather than inline orchestration logic
- `viewSlice.ts` now routes the main expanded-graph refresh path through `viewStateTransitions.ts`, reducing repeated reprojection boilerplate across view mutations
- residual view debt still exists, but it is now concentrated in policy decisions about when view changes should refresh, not in duplicated recomputation code
- compatibility projection still exists for audit/tooling purposes, but no longer distorts the mainline read boundary
