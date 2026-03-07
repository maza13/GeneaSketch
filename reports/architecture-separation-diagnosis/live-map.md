# Live Architecture Map

Generated: 2026-03-07
Execution phase: `117`
Current chain: `115`

## Current Status

- execution state: `phase-1-runtime-edge-untangled`
- strategy: `Guided Hard Cut`
- hotspot order: unchanged from diagnosis
- live-vs-base status: runtime-edge shell and file orchestration now partially separated from the base map

## Current Boundary Snapshot

At the end of `Phase 1`, the runtime no longer matches the pre-execution baseline at the shell/file edge:

- `App.tsx` no longer owns the local autosession/profile persistence effects directly
- file-load hydration now enters runtime through `useFileLoadRuntime.ts`
- `useGskFile.ts` is narrower and now focuses on file/package parsing, recent-file handling, import/export, and status/reporting
- `Workspace Profile` persistence remains local/private, but is now surfaced through `useWorkspacePersistenceEffects.ts` instead of staying hidden in `App.tsx`
- merge application runtime re-entry is now routed through the same runtime adapter family instead of a broader inline path
- `State Manager` remains mixed
- `GSK Package IO`, `GEDCOM IO`, `Read Model`, and `AI Assistant` remain transitional
- `GSchema Engine`, `Visual Engine`, `Workspace Profile`, and `Knowledge System` remain the strongest preserved boundaries

## Phase 1 Boundary Changes

The following changed in `Phase 1`:

- `App.tsx` shed direct responsibility for autosession persistence and workspace-profile autosave
- runtime hydration/profile application for loaded graphs moved behind a dedicated runtime adapter seam
- `useGskFile.ts` stopped mixing parse/package flow with workspace-profile IO and direct hydration orchestration
- the future temporary-repository sharing path is now less likely to re-enter through `App.tsx` or the file hook because the runtime apply seam is explicit

## Debt Still Intentionally Present

- residual orchestration concentration in `App.tsx`
- the `State Manager <-> GSchema Engine <-> Read Model` knot
- the broad AI write-back bridge
- the legacy read-model fallback in the central selector boundary

## Next Expected Change

If `118` completes successfully, this live map should show:

- a narrower `State Manager <-> GSchema Engine <-> Read Model` knot
- less semantic coupling in `docSlice.ts`
- a write path that is more reusable for import/apply/share without broad reprojection reloads
