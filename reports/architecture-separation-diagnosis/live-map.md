# Live Architecture Map

Generated: 2026-03-07
Execution phase: `119`
Current chain: `115`

## Current Status

- execution state: `phase-3-ai-write-bridge-narrowed`
- strategy: `Guided Hard Cut`
- hotspot order: unchanged from diagnosis
- live-vs-base status: runtime-edge, store mutation coordination, and AI document re-entry are now all narrower than the base map

## Current Boundary Snapshot

At the end of `Phase 3`, the runtime no longer matches the pre-execution baseline at the shell/file edge, store mutation edge, or AI write-back edge:

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
- `GSK Package IO`, `GEDCOM IO`, `Read Model`, and `AI Assistant` remain transitional
- `GSchema Engine`, `Visual Engine`, `Workspace Profile`, and `Knowledge System` remain the strongest preserved boundaries

## Phase 3 Boundary Changes

The following changed in `Phase 3`:

- AI preserved the read-side document contract for reasoning
- AI no longer owns a special broad write-back bridge in `App.tsx`; it uses the same projected-document apply surface as other full-document re-entry cases
- projected-document application is now source-tagged (`"ai"`, `"merge"`, `"mock"`) through a shared store action, which is a better fit for future auditability and trust rules
- the stable `GSchema Engine -> Read Model` boundary remains intact; the narrowing happened in the runtime/store application surface, not inside the read model itself

## Debt Still Intentionally Present

- residual orchestration concentration in `App.tsx`
- residual coupling between `State Manager <-> GSchema Engine <-> Read Model`, especially around view-triggered reprojection in `viewSlice.ts`
- the legacy read-model fallback in the central selector boundary

## Next Expected Change

If `120` completes successfully, this live map should show:

- the legacy read-model fallback isolated behind a thinner compatibility edge or removed from the mainline boundary
- a more singular and explicit read-model entrypoint
- clearer residual debt after the main hard-cut chain
