# Runtime Boundary and Coupling Audit

Generated: 2026-03-07
Task: `109`
Baseline consumed: `100`, `102`, `103`, `104`
Master map consumed: `108`

## Scope

This audit translates the system map into concrete runtime relationships. Each edge below is classified by current legitimacy, not by desired future state.

Legitimacy vocabulary used here:

- `legitimate boundary`: expected architectural edge that should remain in some form.
- `transitional bridge`: valid for now, but should eventually be tightened, encapsulated, or reduced.
- `technical debt / coupling`: current dependency is too mixed or concentrated and should be structurally reduced.
- `ambiguous`: edge exists, but current code is not yet clean enough to judge whether it should remain as-is.

Removal difficulty vocabulary:

- `low`: can likely be isolated without major graph/runtime redesign.
- `medium`: requires coordinated refactor across multiple modules.
- `high`: touches central runtime orchestration or cross-cutting state.

## Audit Table

| Source system | Target system | Concrete path/files | Dependency kind | Why it exists | Current legitimacy | Removal difficulty | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GSK Package IO` | `GSchema Engine` | `src/io/fileIOService.ts`, `src/core/gschema/GskPackage.ts`, `src/hooks/useGskFile.ts` | persistence materialization | `.gsk` import/export must materialize engine state | `legitimate boundary` | `low` | Keep the edge, but avoid leaking runtime hydration concerns into the package layer. |
| `GEDCOM IO` | `GSchema Engine` | `src/core/gedcom/parser.ts`, `src/core/gedcom/serializer.ts`, `src/core/gschema/GedcomBridge.ts`, `src/hooks/useGskFile.ts` | interchange translation | GEDCOM is external interchange and must bridge into the internal graph | `transitional bridge` | `medium` | Needed, but `GedcomBridge` still carries too much semantic translation weight for long-term purity. |
| `GSchema Engine` | `Read Model` | `src/core/read-model/selectors.ts`, `src/core/read-model/directProjection.ts` | read-side projection | UI/AI/tooling need a consumer-facing document shape | `legitimate boundary` | `medium` | This boundary should remain, but the projection strategy behind it still needs cleanup. |
| `Read Model` | `Visual Engine` | `src/App.tsx`, `src/views/DTreeViewV3.tsx`, `src/views/dtree-v3/RenderCore.tsx` | render input boundary | Tree rendering should consume projected document and derived graph state | `legitimate boundary` | `low` | This is one of the cleanest boundaries in the current runtime. |
| `Read Model` | `App Shell` | `src/App.tsx`, `src/ui/*`, `src/ui/search/SearchCenterPanel.tsx`, `src/ui/RightPanel.tsx` | panel/view consumption | Panels, search, workspace, and detail views need projected read-side data | `legitimate boundary` | `low` | Keep the boundary; the issue is not the edge itself but where orchestration lives. |
| `State Manager` | `GSchema Engine` | `src/state/slices/docSlice.ts`, `src/state/store.ts` | mutation orchestration | The store holds graph state and routes mutation commands into graph operations | `transitional bridge` | `high` | Valid today, but this is a major hotspot because mutations and graph refresh happen inside the store slice. |
| `State Manager` | `Read Model` | `src/state/slices/docSlice.ts`, `src/hooks/useGskFile.ts`, `src/core/read-model/selectors.ts` | projection refresh / cache hydration | Store flows need projected data for selection, expansion, and hydration | `transitional bridge` | `high` | Acceptable short-term, but current reprojection and expansion coupling make this one of the main structural tensions. |
| `App Shell` | `State Manager` | `src/App.tsx`, `src/state/store.ts`, `src/hooks/useMenuConfig.tsx`, `src/hooks/useNodeActions.ts` | root orchestration | Shell controls most runtime actions through the global store | `technical debt / coupling` | `high` | `App.tsx` concentrates too many store reads/actions and blurs shell orchestration with runtime control. |
| `App Shell` | `GSK Package IO` | `src/App.tsx`, `src/hooks/useGskFile.ts`, `src/io/fileIOService.ts` | file workflow orchestration | Open/import/save/export flows are initiated from UI and need IO services | `transitional bridge` | `medium` | The edge is normal, but `useGskFile` currently mixes IO, hydration, profile, and merge orchestration. |
| `App Shell` | `Workspace Profile` | `src/App.tsx`, `src/io/workspaceProfileService.ts`, `src/hooks/useGskFile.ts` | local preference persistence | Shell/runtime need to persist and hydrate per-graph local preferences outside `.gsk` | `legitimate boundary` | `low` | The boundary is correct, but persistence calls in `App.tsx` make the shell heavier than ideal. |
| `GSK Package IO` | `Workspace Profile` | `src/hooks/useGskFile.ts`, `src/io/workspaceProfileService.ts` | hydration bridge | File loading also hydrates local profile and applies local view/theme state | `technical debt / coupling` | `medium` | This is not a clean package concern; it is orchestration coupling inside `useGskFile`. |
| `AI Assistant` | `Read Model` | `src/hooks/useAiAssistant.ts`, `src/App.tsx`, `src/core/read-model/types.ts` | AI reasoning input | AI flows need a stable projected document rather than raw graph internals | `legitimate boundary` | `low` | This is the correct read-side contract for AI reasoning. |
| `AI Assistant` | `GSchema Engine` | `src/App.tsx`, `src/hooks/useAiAssistant.ts`, `src/core/gschema/GedcomBridge.ts`, `src/state/slices/docSlice.ts` | document reapplication / mutation path | AI-reviewed document changes must eventually re-enter the graph runtime | `transitional bridge` | `high` | Valid, but currently routed through document conversion plus store load, which is heavier than an eventual stable mutation surface. |
| `AI Assistant` | `Desktop/Web provider bridge` | `src/services/aiRuntime.ts`, `src/services/tauriBridge.ts`, `src/services/aiWebBridge.ts`, `src-tauri/src/ai_commands.rs` | provider runtime bridge | AI provider access must switch between browser and Tauri runtime capabilities | `legitimate boundary` | `medium` | This edge should remain, though diagnostics/logging and provider surface may later need a narrower facade. |
| `Knowledge System` | `App Shell` | `src/ui/WikiPanel.tsx`, `src/ui/WikiPanel.helpers.tsx`, `src/App.tsx` | embedded documentation surface | Shell surfaces the wiki/help system as modal content | `legitimate boundary` | `low` | Low-risk edge; not currently a structural hotspot. |
| `App Shell` | `Visual Engine` | `src/App.tsx`, `src/views/DTreeViewV3.tsx`, `src/ui/shell/AppShell.tsx` | canvas composition / interaction wiring | Shell hosts the canvas and wires node actions, overlays, focus, and export hooks | `transitional bridge` | `medium` | Expected edge, but still too centralized in `App.tsx`; composition is valid, concentration is the issue. |
| `Read Model` | `Legacy projection fallback` | `src/core/read-model/selectors.ts`, `src/core/gschema/GedcomBridge.ts` | compatibility fallback | Projection can still switch from `direct` to legacy document projection | `technical debt / coupling` | `medium` | This is the clearest read-model debt edge and should be escalated directly into `110`. |

## Relationship Summary

### Legitimate boundaries

- `GSK Package IO -> GSchema Engine`
- `GSchema Engine -> Read Model`
- `Read Model -> Visual Engine`
- `Read Model -> App Shell`
- `App Shell -> Workspace Profile`
- `AI Assistant -> Read Model`
- `AI Assistant -> Desktop/Web provider bridge`
- `Knowledge System -> App Shell`

### Transitional bridges

- `GEDCOM IO -> GSchema Engine`
- `State Manager -> GSchema Engine`
- `State Manager -> Read Model`
- `App Shell -> GSK Package IO`
- `AI Assistant -> GSchema Engine`
- `App Shell -> Visual Engine`

### Technical debt / coupling

- `App Shell -> State Manager`
- `GSK Package IO -> Workspace Profile` through `useGskFile`
- `Read Model -> Legacy projection fallback`

## Escalations for `110`

The next task should treat these as the highest-value hotspot candidates:

1. `App Shell -> State Manager`
2. `State Manager -> GSchema Engine`
3. `State Manager -> Read Model`
4. `GSK Package IO -> Workspace Profile`
5. `AI Assistant -> GSchema Engine`
6. `Read Model -> Legacy projection fallback`

## Notes

- This audit intentionally stops at legitimacy and removal difficulty; severity ranking belongs in `110`.
- Several edges are legitimate in principle but still poor in current concentration. In those cases, the dependency itself is not the problem; the current orchestration locus is.
