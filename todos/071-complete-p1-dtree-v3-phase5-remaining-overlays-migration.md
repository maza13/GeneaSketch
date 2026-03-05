---
status: complete
priority: p1
issue_id: "071"
tags: [dtree-v3, phase5, overlays, timeline, lineage, layers, parity]
dependencies: ["070"]
---

# Fase 5 - Migracion de overlays restantes y paridad completa

## Problem Statement

Sin migrar el resto de overlays, V3 no alcanza paridad completa ni puede reemplazar al flujo legado.

## Findings

- Overlays pendientes: `lineage`, `lineage_couple`, `origin`, `deepest`, `timeline`, `merge_focus`, `layer-*`.
- Leyendas y hover cards dependen de combinaciones de overlays activos.
- Se requiere consistencia visual con prioridad de overlays.

## Proposed Solutions

### Option 1: Migracion por bloques funcionales con validacion por bloque (Recommended)

**Approach:** completar overlays en 3 bloques y cerrar cada uno con pruebas de paridad.

**Pros:**
- Controla riesgo por lotes.
- Permite detectar regresiones tempranas.
- Mantiene trazabilidad de performance por overlay.

**Cons:**
- Requiere mas pruebas de integracion cruzada.

**Effort:** High  
**Risk:** Medium

## Recommended Action

1. Bloque A: `lineage`, `lineage_couple`, `origin`, `deepest`.
2. Bloque B: `layer-symmetry`, `layer-places`, `layer-warnings`, `layer-endogamy`.
3. Bloque C: `timeline`, `merge_focus` y leyendas asociadas.

## Technical Details

### Implementation Targets

- `src/views/dtree-v3/overlays/resolvers/lineage.ts`
- `src/views/dtree-v3/overlays/resolvers/origin-deepest.ts`
- `src/views/dtree-v3/overlays/resolvers/layers.ts`
- `src/views/dtree-v3/overlays/resolvers/timeline.ts`
- `src/views/dtree-v3/overlays/resolvers/merge-focus.ts`
- `src/ui/LayerPanel.tsx`
- `src/ui/TimelineRightPanel.tsx`

### Block Exit Rules

1. Bloque A cierra cuando:
   - lineage/origin/deepest tienen paridad visual + tests unitarios.
2. Bloque B cierra cuando:
   - `layer-*` renderiza igual que baseline y mantiene leyenda/hover.
3. Bloque C cierra cuando:
   - timeline y merge_focus no rompen paneles ni seleccion/foco.
4. No avanzar de bloque sin check verde de performance del bloque anterior.

### Overlay Priority Policy

1. Mantener prioridades actuales como contrato de compatibilidad.
2. Resolver conflictos en pipeline por `priority` ascendente con override final de seleccion/foco.
3. Cualquier cambio de prioridad debe documentarse en Work Log con razon funcional.

### In Scope / Out of Scope

**In Scope**
- Migracion completa de overlays pendientes.
- Paridad de leyendas, hover cards y comportamiento contextual.
- Validacion cruzada de overlays simultaneos.

**Out of Scope**
- Nuevos overlays no presentes en `OverlayType`.
- Cambios de semantica de diagnosticos.

## Verification Commands

- `npm run test -- src/tests/timeline.informal.test.ts`
- `npm run test -- src/tests/diagnostics/analyzer.test.ts src/tests/diagnostics/fixPlanner.test.ts`
- `npm run test -- src/tests/layout src/tests/store.test.ts`
- `npm run test:perf:overlays`

## Acceptance Criteria

- [x] Todos los overlays tipados funcionan en V3.
- [x] Leyendas y hover cards equivalentes al baseline.
- [x] Orden/prioridad de overlays consistente.
- [x] SLO moderado mantenido con multiples overlays activos.
- [x] Bloques A/B/C cerrados con evidencia separada en Work Log.

## Work Log

### 2026-03-04 - Task created

**By:** Codex

**Actions:**
- Defined complete overlay migration blocks to reach V3 parity.
- Added block exit rules and priority policy to avoid ambiguous sequencing.

### 2026-03-04 - Status updated

**By:** Codex

**Actions:**
- Updated issue status to `ready` pending completion of `070`.

### 2026-03-04 - Implementation completed

**By:** Codex

**Actions:**
- Completed V3 full-fork path for remaining overlays: `DTreeViewV3` now renders through V3 `RenderCore` and no longer depends on `DTreeView` bridge for V3 route.
- Added V3 contextual UI model/resolver:
  - `src/views/dtree-v3/ui/overlayUiModel.ts`
  - `src/views/dtree-v3/ui/overlayUiResolver.ts`
- Added V3 UI modules for remaining overlays:
  - `src/views/dtree-v3/ui/LayerLegendPanel.tsx`
  - `src/views/dtree-v3/ui/TimelineSimulationBadge.tsx`
  - `src/views/dtree-v3/ui/hover/LayerHoverCards.tsx`
  - `src/views/dtree-v3/ui/hover/OriginHoverCard.tsx`
  - `src/views/dtree-v3/ui/hover/DeepestHoverCard.tsx`
  - `src/views/dtree-v3/ui/hover/TimelineHoverCard.tsx`
- Integrated contextual UI resolution in `src/views/dtree-v3/RenderCore.tsx` and kept merge/priority behavior from pipeline with final selection/focus override unchanged.
- Hardened contextual hover priority for overlays in V3:
  - Added explicit `hoverMode` handling for `deepest` and `timeline`.
  - Preserved priority order `layer > origin > deepest > heatmap > timeline`.
- Expanded priority/parity coverage for multi-overlay conflicts in `src/tests/overlays/pipeline.priority.test.ts`.
- Added mandatory 071 test suites:
  - `src/tests/dtree-v3/overlay-ui-resolver.blockA.test.ts`
  - `src/tests/dtree-v3/overlay-ui-resolver.blockB.test.ts`
  - `src/tests/dtree-v3/overlay-ui-resolver.blockC.test.ts`
  - `src/tests/dtree-v3/rendercore-v3.smoke.test.tsx`
- Added deepest-only hover contract assertion and timeline hover expectation in block tests.
- Updated TODO validator expected chain for phase closure:
  - `tools/dtree-v3/validate-todo-chain.mjs` expects `071-complete-...`.
- Verification executed:
  - `npm run test -- src/tests/dtree-v3/overlay-ui-resolver.blockA.test.ts src/tests/dtree-v3/overlay-ui-resolver.blockB.test.ts src/tests/dtree-v3/overlay-ui-resolver.blockC.test.ts src/tests/dtree-v3/rendercore-v3.smoke.test.tsx src/tests/overlays/pipeline.priority.test.ts src/tests/overlays/pipeline.parity.test.ts` (pass)
  - `npm run test -- src/tests/timeline.informal.test.ts` (pass)
  - `npm run test -- src/tests/diagnostics/analyzer.test.ts src/tests/diagnostics/fixPlanner.test.ts` (pass)
  - `npm run test -- src/tests/layout src/tests/store.test.ts` (pass)
  - `npm run test:perf:overlays` (pass)
  - `npm run build` (pass)
  - `npm run plan:dtree-v3:validate` (pass)
- HEAD at execution time: `2d0d03a`.
