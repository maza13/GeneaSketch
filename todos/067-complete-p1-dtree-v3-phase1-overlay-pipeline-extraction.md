---
status: complete
priority: p1
issue_id: "067"
tags: [dtree-v3, phase1, overlays, refactor, resolver]
dependencies: ["066"]
---

# Fase 1 - Extraccion de OverlayPipeline y Resolvers

## Problem Statement

La resolucion de overlays esta acoplada a `DTreeView`, aumentando costo de mantenimiento y recalculo global innecesario.

## Findings

- Overlays criticos se resuelven con condicionales extensos en el componente de vista.
- Existe prioridad de overlays, pero sin pipeline modular.
- Hover cards y leyendas dependen de la misma logica monolitica.

## Proposed Solutions

### Option 1: Pipeline de overlays modular por tipo (Recommended)

**Approach:** mover la logica a resolvers puros y componerla en un pipeline con prioridad.

**Pros:**
- Aisla logica genealogica de presentacion.
- Facilita tests unitarios por overlay.
- Abre puerta a caching por resolver.

**Cons:**
- Requiere mover y estabilizar contratos internos.

**Effort:** Medium  
**Risk:** Medium

## Recommended Action

1. Crear `OverlayResolver` por tipo.
2. Crear `OverlayPipeline` con orden por prioridad.
3. Conectar `DTreeView` actual al pipeline para paridad temprana.

## Technical Details

### Implementation Targets

- `src/views/dtree-v3/overlays/types.ts`
- `src/views/dtree-v3/overlays/pipeline.ts`
- `src/views/dtree-v3/overlays/resolvers/kinship.ts`
- `src/views/dtree-v3/overlays/resolvers/heatmap.ts`
- `src/views/dtree-v3/overlays/resolvers/lineage.ts`
- `src/views/dtree-v3/overlays/resolvers/layers.ts`
- `src/views/dtree-v3/overlays/resolvers/timeline.ts`
- `src/views/DTreeView.tsx` (adaptador temporal)

### Resolver Output Contract

- `nodeStyles`
- `edgeStyles`
- `badges`
- `legend`
- `hoverCards`
- `perfMeta`

### Resolver Interface (Implementation Contract)

1. Cada resolver recibe un contexto inmutable con:
   - `document`
   - `graph`
   - `viewConfig`
   - `colorTheme`
   - `selectedPersonId`
   - `focusPersonId`
2. Cada resolver retorna solo su contribucion de estilos y metadatos.
3. `OverlayPipeline` es responsable de merge por prioridad y conflicto.
4. Resolvers no deben tocar estado de UI ni disparar side effects.

### Migration Sequence

1. Crear tipos compartidos y contrato de salida.
2. Implementar pipeline vacio con pruebas de orden/prioridad.
3. Migrar resolvers uno por uno preservando snapshots de salida.
4. Conectar `DTreeView` legacy como adaptador temporal.
5. Validar paridad visual antes de pasar a `068/069`.

### In Scope / Out of Scope

**In Scope**
- Desacople de logica overlay desde `DTreeView`.
- Contratos testeables por resolver.
- Merge por prioridad en un solo punto.

**Out of Scope**
- Cambio de prioridades funcionales.
- Redefinir semantica de overlays.

## Verification Commands

- `npm run test -- src/tests/layout src/tests/store.test.ts`
- `npm run test -- src/tests/kinship.nomenclature.test.ts src/tests/endogamy-visual-scale.test.ts`
- `npm run test -- src/tests/timeline.informal.test.ts`

## Acceptance Criteria

- [x] Logica de overlays movida a resolvers puros.
- [x] `DTreeView` usa pipeline sin perder comportamiento actual.
- [x] Prioridades de overlays equivalentes a comportamiento previo.
- [x] Tests de paridad de estilos y badges agregados/pasando.
- [x] Cada resolver tiene al menos 1 prueba unitaria de contrato.

## Work Log

### 2026-03-04 - Task created

**By:** Codex

**Actions:**
- Defined extraction of overlay logic as first architecture hardening step.
- Added resolver interface contract and migration sequence to avoid ambiguous implementation.

### 2026-03-04 - Overlay pipeline extraction implemented (all overlay types)

**By:** Codex

**Actions:**
- Added V3 overlay architecture:
  - `src/views/dtree-v3/overlays/types.ts`
  - `src/views/dtree-v3/overlays/palette.ts`
  - `src/views/dtree-v3/overlays/contextBuilders.ts`
  - `src/views/dtree-v3/overlays/pipeline.ts`
- Added resolvers for all overlays:
  - `resolvers/lineage.ts` (`lineage` + `lineage_couple`)
  - `resolvers/kinship.ts`
  - `resolvers/heatmap.ts`
  - `resolvers/origin.ts`
  - `resolvers/deepest.ts`
  - `resolvers/timeline.ts`
  - `resolvers/mergeFocus.ts`
  - `resolvers/layers.ts`
- Connected `src/views/DTreeView.tsx` to pipeline (`resolveOverlayPipeline`) and moved precompute logic to `contextBuilders`.
- Preserved selection/focus override after overlay merge and added `perfMeta` per resolver execution.
- Implemented failure policy in pipeline: warning + continue when one resolver throws.
- Added tests:
  - `src/tests/overlays/pipeline.priority.test.ts`
  - `src/tests/overlays/pipeline.parity.test.ts`
- Executed verification commands:
  - `npm run test -- src/tests/overlays/pipeline.priority.test.ts src/tests/overlays/pipeline.parity.test.ts`
  - `npm run test -- src/tests/layout src/tests/store.test.ts src/tests/kinship.nomenclature.test.ts src/tests/endogamy-visual-scale.test.ts src/tests/timeline.informal.test.ts`
  - `npm run build`
- Workspace commit reference: `2d0d03a`

### 2026-03-04 - Status updated

**By:** Codex

**Actions:**
- Updated issue status to `complete` after full pipeline extraction and green verification suite.
