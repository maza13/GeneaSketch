---
status: complete
priority: p1
issue_id: "070"
tags: [dtree-v3, phase4, kinship, heatmap, consanguinity, priority]
dependencies: ["069"]
---

# Fase 4 - Migracion prioritaria Parentesco + Heatmap

## Problem Statement

La funcionalidad de mayor valor genealogico es parentesco/consanguinidad; debe migrarse primero para validar la base V3.

## Findings

- Activacion desde menu contextual de nodo.
- Uso intensivo de `findKinship` y `calculateGeneticHeatmap`.
- Requisito critico: cambio de target rapido sin recomputar layout.

## Proposed Solutions

### Option 1: Migracion completa de kinship/heatmap sobre pipeline V3 (Recommended)

**Approach:** portar resolvers, badges, cards y rutas de interaccion al flujo V3.

**Pros:**
- Valida el nucleo diferencial del producto.
- Permite medir impacto real de caches.
- Reduce riesgo en fases posteriores.

**Cons:**
- Puede requerir ajustes finos de UX y tooltips.

**Effort:** Medium-High  
**Risk:** Medium

## Recommended Action

1. Migrar overlays `kinship` y `heatmap` a V3.
2. Cachear resultados de heatmap por persona base.
3. Evitar relayout al cambiar `targetId`.
4. Mantener paridad de badges/tarjetas contextuales.

## Technical Details

### Implementation Targets

- `src/views/dtree-v3/overlays/kinshipHeatmapRuntime.ts` (nuevo)
- `src/views/dtree-v3/overlays/contextBuilders.ts`
- `src/views/dtree-v3/overlays/types.ts`
- `src/views/dtree-v3/overlays/resolvers/kinship.ts`
- `src/views/dtree-v3/overlays/resolvers/heatmap.ts`
- `src/views/dtree-v3/ui/KinshipBadgePanel.tsx` (nuevo)
- `src/views/dtree-v3/ui/HeatmapHoverCard.tsx` (nuevo)
- `src/views/dtree-v3/ui/kinshipHeatmapModel.ts` (nuevo)
- `src/views/dtree-v3/layout/layoutTriggerSignature.ts` (nuevo)
- `src/hooks/useNodeActions.ts` (integracion y UX state)
- `src/App.tsx` (click flow node/target)
- `src/core/dtree/nodeClickRouting.ts` (nuevo)
- `src/views/DTreeView.tsx` (slots V3 + firma de trigger de layout)
- `src/views/dtree-v3/RenderCore.tsx` (inyeccion UI V3)

### Performance Contract

- `heatmap first-run p95 <= 220ms`
- `target-switch p95 <= 35ms`
- `layout recompute count = 0` al cambiar solo target

### Interaction Contract

1. Activar heatmap desde menu contextual de persona.
2. Con heatmap activo, click en otra persona actualiza `targetId` y conserva `personId` base.
3. Limpiar overlay elimina highlight y cards asociadas.
4. Si `personId` o `targetId` no existe en documento actual, resolver debe no-op seguro.

### Cache Invalidation Rules

1. Invalidar cache de heatmap cuando cambia `graphId` o `journalLength`.
2. Invalidar por `personId` base distinto.
3. No invalidar por cambio de `targetId` dentro de misma base.
4. Invalidar por cambio de modo de color si afecta salida visual.

### In Scope / Out of Scope

**In Scope**
- Overlay `kinship` y `heatmap` en V3 con paridad funcional.
- Tarjetas, badges y rutas de interaccion relacionadas.
- Optimizacion de cambio de target sin relayout.

**Out of Scope**
- Rediseño de nomenclatura de parentesco.
- Nuevos tipos de analisis genetico no existentes.

## Verification Commands

- `npm run test -- src/tests/kinship.nomenclature.test.ts`
- `npm run test -- src/tests/endogamy-visual-scale.test.ts`
- `npm run test -- src/tests/store.test.ts`
- `npm run test:perf:overlays`

## Acceptance Criteria

- [x] Parentesco visual y textual equivalente en V3.
- [x] Heatmap colorea nodos/aristas igual que baseline.
- [x] Cambiar target no dispara relayout.
- [x] SLO de kinship/heatmap cumplido.
- [x] Reglas de invalidacion de cache verificadas con tests de integracion.

## Work Log

### 2026-03-04 - Task created

**By:** Codex

**Actions:**
- Prioritized migration of kinship+heatmap as first functional block on V3.
- Added interaction and cache invalidation contracts for deterministic implementation.

### 2026-03-04 - Status updated

**By:** Codex

**Actions:**
- Updated issue status to `ready` as next functional priority after base view rollout.

### 2026-03-04 - Implementation completed

**By:** Codex

**Actions:**
- Added shared `kinshipHeatmapRuntime` in precompute context and wired resolvers to runtime lookups.
- Added safe no-op warnings for invalid kinship/heatmap ids in resolver path.
- Extracted kinship/heatmap V3 UI into `KinshipBadgePanel` and `HeatmapHoverCard` with pure `kinshipHeatmapModel`.
- Added renderer slots in `DTreeView` and injected V3 UI from `RenderCore` while preserving legacy fallback path.
- Added `nodeClickRouting` helper and migrated `App` click flow to helper-based routing.
- Added layout trigger signature helper and connected `DTreeView` layout effect dependency contract.
- Added tests:
  - `src/tests/dtree/kinship-heatmap-runtime.test.ts`
  - `src/tests/dtree/node-click-routing.test.ts`
  - `src/tests/dtree/layout-trigger-signature.test.ts`
  - `src/tests/overlays/kinship-heatmap.resolvers.test.ts`
  - updated `src/tests/overlays/pipeline.parity.test.ts`
- Updated TODO chain validator to expect `070-complete-...`.
- Verification executed:
  - `npm run test -- src/tests/dtree/kinship-heatmap-runtime.test.ts src/tests/dtree/node-click-routing.test.ts src/tests/dtree/layout-trigger-signature.test.ts src/tests/overlays/kinship-heatmap.resolvers.test.ts src/tests/overlays/pipeline.parity.test.ts` (pass)
  - `npm run test -- src/tests/kinship.nomenclature.test.ts src/tests/endogamy-visual-scale.test.ts src/tests/layout src/tests/store.test.ts` (pass)
  - `npm run test:perf:overlays` (pass)
  - `npm run build` (pass)
- HEAD at execution time: `2d0d03a`.
