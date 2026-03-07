# Live Architecture Map

Generated: 2026-03-07
Execution phase: `118`
Current chain: `115`

## Current Status

- execution state: `phase-2-store-mutation-contract-narrowed`
- strategy: `Guided Hard Cut`
- hotspot order: unchanged from diagnosis
- live-vs-base status: runtime-edge and store-side mutation coordination are now both narrower than the base map

## Current Boundary Snapshot

At the end of `Phase 2`, the runtime no longer matches the pre-execution baseline at the shell/file edge or store mutation edge:

- `App.tsx` no longer owns the local autosession/profile persistence effects directly
- file-load hydration now enters runtime through `useFileLoadRuntime.ts`
- `useGskFile.ts` is narrower and now focuses on file/package parsing, recent-file handling, import/export, and status/reporting
- `Workspace Profile` persistence remains local/private, but is now surfaced through `useWorkspacePersistenceEffects.ts` instead of staying hidden in `App.tsx`
- merge application runtime re-entry is now routed through the same runtime adapter family instead of a broader inline path
- `docSlice.ts` now routes graph writes through an explicit reconciliation helper instead of repeating mutation + projection + refresh logic per action
- load-time reconciliation and post-mutation reconciliation are now explicit store helpers in `graphStateTransitions.ts`
- the store is closer to a coordinator role for graph writes, while `projectGraphDocument` and `ensureExpanded` sit behind a narrower reconciliation contract
- `GSK Package IO`, `GEDCOM IO`, `Read Model`, and `AI Assistant` remain transitional
- `GSchema Engine`, `Visual Engine`, `Workspace Profile`, and `Knowledge System` remain the strongest preserved boundaries

## Phase 2 Boundary Changes

The following changed in `Phase 2`:

- graph replacement (`loadGraph`) and graph mutation refresh now use explicit store-side transition helpers instead of open-coded reprojection sequences
- `docSlice.ts` mutation actions no longer each own their own projection/xref/expanded-graph refresh logic
- the mutation path is narrower and easier to reuse for future validated apply/share/import flows because the refresh contract is centralized
- the stable `GSchema Engine -> Read Model` boundary remains intact; the change happened in the store coordination layer, not inside the engine or selector internals

## Debt Still Intentionally Present

- residual orchestration concentration in `App.tsx`
- residual coupling between `State Manager <-> GSchema Engine <-> Read Model`, especially around view-triggered reprojection in `viewSlice.ts`
- the broad AI write-back bridge
- the legacy read-model fallback in the central selector boundary

## Next Expected Change

If `119` completes successfully, this live map should show:

- AI still operating on the projected boundary, but writing back through a narrower and more auditable mutation bridge
- less dependence on broad document reapplication for AI write-back
- closer alignment between AI-originated changes and the same mutation discipline expected for external/shared changes
