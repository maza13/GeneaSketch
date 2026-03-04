---
status: pending
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

- `src/views/dtree-v3/overlays/resolvers/kinship.ts`
- `src/views/dtree-v3/overlays/resolvers/heatmap.ts`
- `src/hooks/useNodeActions.ts` (integracion y UX state)
- `src/App.tsx` (click flow node/target)
- `src/core/graph/kinship.ts` (optimizacion/caching puntual si aplica)

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

- [ ] Parentesco visual y textual equivalente en V3.
- [ ] Heatmap colorea nodos/aristas igual que baseline.
- [ ] Cambiar target no dispara relayout.
- [ ] SLO de kinship/heatmap cumplido.
- [ ] Reglas de invalidacion de cache verificadas con tests de integracion.

## Work Log

### 2026-03-04 - Task created

**By:** Codex

**Actions:**
- Prioritized migration of kinship+heatmap as first functional block on V3.
- Added interaction and cache invalidation contracts for deterministic implementation.
