# Master System Map

Generated: 2026-03-07
Task: `108`
Baseline consumed: `100`, `101`, `102`

## Scope

This artifact operationalizes the existing architecture taxonomy. It does not redefine the systems; it maps where they currently live in code, what they consume, what they emit, and how separated they appear in the current runtime.

Boundary status vocabulary used here:

- `stable boundary`: the system has a clear role and a mostly clean observable boundary.
- `transitional`: the system role is clear, but one or more bridges remain intentional and temporary.
- `mixed`: the system exists, but current orchestration still mixes responsibilities with adjacent systems.
- `unclear`: the system exists conceptually, but code anchors or public boundaries are still too diffuse.

## Master Flow

```text
.gsk / GED files
  -> GSK Package IO / GEDCOM IO
  -> bridge/projection into GSchema Engine
  -> Read Model
  -> Visual Engine + App Shell

Cross-cutting systems:
  - State Manager coordinates runtime/session/view state
  - AI Assistant consumes Read Model and routes changes back into runtime
  - Workspace Profile persists local preferences outside .gsk
  - Knowledge System loads docs and surfaces them in the shell
```

## System Map

### 1. GSchema Engine

- Canonical name: `GSchema Engine`
- Current aliases: `motor`, `GSchemaGraph`, `graph core`
- Responsibility:
  - own in-memory graph semantics
  - enforce invariants
  - maintain journal-backed state and mutations
- Inputs:
  - graph imports from `.gsk`
  - bridge output from GEDCOM/GeneaDocument conversion
  - mutation requests from store and AI application flows
- Outputs:
  - graph state
  - journal stream
  - validation/integrity results
  - node/edge/claim APIs consumed by projection and mutation paths
- Incoming dependencies:
  - `GSK Package IO`
  - `GEDCOM IO`
  - `State Manager`
  - `AI Assistant`
- Outgoing dependencies:
  - `Read Model`
- Implementation anchors:
  - `src/core/gschema/GSchemaGraph.ts`
  - `src/core/gschema/GraphMutations.ts`
  - `src/core/gschema/validation.ts`
  - `src/core/gschema/Journal.ts`
- Observable APIs / boundaries:
  - `GSchemaGraph.create() / fromData() / toData()`
  - graph validation and journal access APIs
  - mutation facade in `GraphMutations`
- Boundary status: `stable boundary`

### 2. GSK Package IO

- Canonical name: `GSK Package IO`
- Current aliases: `formato GSK`, `package IO`, `file IO`
- Responsibility:
  - import/export `.gsk`
  - package manifest, journal, integrity, quarantine, media handling
- Inputs:
  - `.gsk` blobs/files
  - `GSchemaGraph` for export
- Outputs:
  - imported `GSchemaGraph`
  - package warnings and metadata
  - exported `.gsk` blobs
- Incoming dependencies:
  - file picker / shell workflows
  - export flows
- Outgoing dependencies:
  - `GSchema Engine`
  - `Workspace Profile` hydration path through `useGskFile`
- Implementation anchors:
  - `src/core/gschema/GskPackage.ts`
  - `src/io/fileIOService.ts`
  - `src/hooks/useGskFile.ts`
- Observable APIs / boundaries:
  - `FileIOService.importGsk(...)`
  - `FileIOService.exportGsk(...)`
  - `importGskPackage(...) / exportGskPackage(...)`
- Boundary status: `transitional`

### 3. GEDCOM IO

- Canonical name: `GEDCOM IO`
- Current aliases: `GED import/export`, `bridge`
- Responsibility:
  - parse GEDCOM text
  - serialize GEDCOM text
  - bridge external interchange into current runtime
- Inputs:
  - GED text/files
  - projected document export input
- Outputs:
  - `GeneaDocument`
  - parse errors/warnings
  - GED text export
  - bridge conversions to/from graph
- Incoming dependencies:
  - shell open/import/export flows
- Outgoing dependencies:
  - `GSchema Engine` via `GedcomBridge`
  - `Read Model` indirectly when projecting to document for export/UI parity
- Implementation anchors:
  - `src/core/gedcom/parser.ts`
  - `src/core/gedcom/serializer.ts`
  - `src/core/gschema/GedcomBridge.ts`
  - `src/io/fileIOService.ts`
- Observable APIs / boundaries:
  - `parseGedcomAnyVersion(...)`
  - `serializeGedcom(...)`
  - `documentToGSchema(...)`
  - `gschemaToDocument(...)`
- Boundary status: `transitional`

### 4. Read Model

- Canonical name: `Read Model`
- Current aliases: `selectors`, `projection layer`, `direct/legacy projection`
- Responsibility:
  - project graph state into consumer-facing document and selector outputs
  - provide stable read-side inputs for UI and AI
- Inputs:
  - `GSchemaGraph`
  - read model mode (`direct` / `legacy`)
- Outputs:
  - `GraphProjectionDocument`
  - persons/families/search/timeline/stats selectors
- Incoming dependencies:
  - `GSchema Engine`
  - `State Manager`
- Outgoing dependencies:
  - `Visual Engine`
  - `App Shell`
  - `AI Assistant`
- Implementation anchors:
  - `src/core/read-model/selectors.ts`
  - `src/core/read-model/directProjection.ts`
  - `src/core/read-model/types.ts`
  - `src/core/read-model/cache.ts`
- Observable APIs / boundaries:
  - `projectGraphDocument(...)`
  - `selectPersons(...)`
  - `selectFamilies(...)`
  - `selectSearchEntries(...)`
  - `setReadModelMode(...)`
- Boundary status: `transitional`

### 5. Visual Engine

- Canonical name: `Visual Engine`
- Current aliases: `DTree V3`, `canvas`, `tree renderer`
- Responsibility:
  - layout and render the tree/canvas runtime
  - expose interaction events from graph visualization
- Inputs:
  - projected document
  - expanded graph
  - visual config
  - overlays / focus ids / callbacks
- Outputs:
  - rendered canvas
  - node click/context events
  - SVG export surface
- Incoming dependencies:
  - `Read Model`
  - `State Manager`
  - `App Shell`
- Outgoing dependencies:
  - `App Shell` callbacks
- Implementation anchors:
  - `src/views/DTreeViewV3.tsx`
  - `src/views/dtree-v3/RenderCore.tsx`
  - `src/views/dtree-v3/*`
  - `src/core/dtree/*`
- Observable APIs / boundaries:
  - `DTreeViewV3(props)`
  - render-core event callbacks and SVG readiness
- Boundary status: `stable boundary`

### 6. App Shell

- Canonical name: `App Shell`
- Current aliases: `UI`, `shell`, `panels`
- Responsibility:
  - compose panels, modals, menus, navigation, and chrome around the canvas
  - orchestrate user interaction flows
- Inputs:
  - projected document
  - state selectors and actions
  - shell component props
  - modal/panel visibility state
- Outputs:
  - user intent events
  - panel flows
  - file open/import/export triggers
- Incoming dependencies:
  - `State Manager`
  - `Read Model`
  - `Workspace Profile`
  - `Knowledge System`
  - `Visual Engine`
- Outgoing dependencies:
  - `State Manager`
  - `Visual Engine`
  - `AI Assistant`
  - `GSK Package IO`
- Implementation anchors:
  - `src/App.tsx`
  - `src/ui/*`
  - `src/ui/shell/AppShell.tsx`
  - `src/ui/shell/AppFooter.tsx`
- Observable APIs / boundaries:
  - `App()`
  - `AppShell(...)`
  - panel/modal props and event callbacks
- Boundary status: `mixed`

### 7. State Manager

- Canonical name: `State Manager`
- Current aliases: `Zustand store`, `store`, `app state`
- Responsibility:
  - coordinate runtime/session/view state
  - hold selected ids, shell config, expanded graph, recents, session restore, AI settings
- Inputs:
  - UI actions
  - load/import flows
  - mutation requests
  - profile/session hydration
- Outputs:
  - reactive state slices
  - derived expanded graph
  - stable action surface for UI
- Incoming dependencies:
  - `App Shell`
  - `GSK Package IO`
  - `Workspace Profile`
  - `AI Assistant`
- Outgoing dependencies:
  - `GSchema Engine`
  - `Read Model`
  - `Visual Engine`
  - `App Shell`
- Implementation anchors:
  - `src/state/store.ts`
  - `src/state/slices/docSlice.ts`
  - `src/state/slices/viewSlice.ts`
  - `src/state/slices/sessionSlice.ts`
  - `src/state/slices/aiSlice.ts`
- Observable APIs / boundaries:
  - `useAppStore`
  - slice action surfaces such as `loadGraph`, `setSelectedPerson`, `setAiSettings`, `restoreSession`
- Boundary status: `mixed`

### 8. AI Assistant

- Canonical name: `AI Assistant`
- Current aliases: `IA`, `copiloto`, `AI layer`
- Responsibility:
  - orchestrate AI review, matching, refinement, safety, provider access, and application of changes
- Inputs:
  - projected document
  - AI settings
  - local/global AI context
  - provider credentials and requests
- Outputs:
  - reviewed/modified document batches
  - undo snapshots
  - provider responses
  - diagnostic logs
- Incoming dependencies:
  - `Read Model`
  - `App Shell`
  - `State Manager`
  - desktop/web provider runtime
- Outgoing dependencies:
  - `GSchema Engine` via document application flow
  - `State Manager`
  - `App Shell`
- Implementation anchors:
  - `src/core/ai/*`
  - `src/hooks/useAiAssistant.ts`
  - `src/services/aiRuntime.ts`
  - `src/services/tauriBridge.ts`
  - `src/ui/ai/*`
  - `src-tauri/src/ai_commands.rs`
- Observable APIs / boundaries:
  - `useAiAssistant(...)`
  - `aiInvokeProvider(...)`
  - `aiValidateCredentials(...)`
  - Tauri commands `ai_*`
- Boundary status: `transitional`

### 9. Workspace Profile

- Canonical name: `Workspace Profile`
- Current aliases: `local profile`, `persisted view prefs`
- Responsibility:
  - persist local per-graph preferences outside `.gsk`
  - normalize/migrate local profile payloads
- Inputs:
  - `graphId`
  - `viewConfig`
  - `visualConfig`
  - `readModelMode`
  - `colorTheme`
- Outputs:
  - persisted local profile
  - hydrated runtime profile
- Incoming dependencies:
  - `App Shell`
  - `State Manager`
  - load/hydration flow
- Outgoing dependencies:
  - `State Manager`
  - `App Shell`
- Implementation anchors:
  - `src/io/workspaceProfileService.ts`
  - `src/types/workspaceProfile.ts`
- Observable APIs / boundaries:
  - `WorkspaceProfileService.load(...)`
  - `WorkspaceProfileService.save(...)`
  - `WorkspaceProfileService.clear(...)`
- Boundary status: `stable boundary`

### 10. Knowledge System

- Canonical name: `Knowledge System`
- Current aliases: `wiki`, `docs`
- Responsibility:
  - load embedded project documentation
  - surface operational and technical knowledge in-app
- Inputs:
  - markdown files from docs trees
  - modal open/close state
- Outputs:
  - rendered wiki/help content inside the shell
- Incoming dependencies:
  - `App Shell`
- Outgoing dependencies:
  - `App Shell`
- Implementation anchors:
  - `src/ui/WikiPanel.tsx`
  - `src/ui/WikiPanel.helpers.tsx`
  - `docs/wiki-software/*`
  - `docs/wiki-gsk/*`
  - `docs/wiki-uxdesign/*`
- Observable APIs / boundaries:
  - `WikiPanel(...)`
  - `import.meta.glob(...)` document loading
- Boundary status: `stable boundary`

## Current Boundary Snapshot

### Stable boundaries already visible

- `GSchema Engine`
- `Visual Engine`
- `Workspace Profile`
- `Knowledge System`

### Transitional boundaries still carrying bridge logic

- `GSK Package IO`
- `GEDCOM IO`
- `Read Model`
- `AI Assistant`

### Mixed systems with concentrated orchestration

- `App Shell`
- `State Manager`

## Immediate Relevance for `109`

The next task should treat the following as prime candidates for runtime boundary audit:

1. `App Shell <-> State Manager`
2. `State Manager <-> GSchema Engine`
3. `State Manager <-> Read Model`
4. `GSK Package IO <-> Workspace Profile` through `useGskFile`
5. `AI Assistant <-> engine mutation path`
6. `Read Model <-> legacy projection fallback`

## Notes

- This map intentionally does not classify severity. That belongs to `109` and `110`.
- The baseline taxonomy remains the source of canonical names; this file only binds those names to current code reality.
