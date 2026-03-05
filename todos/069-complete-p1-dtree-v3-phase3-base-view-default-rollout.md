---
status: complete
priority: p1
issue_id: "069"
tags: [dtree-v3, phase3, view, rollout, default, fallback]
dependencies: ["067", "068"]
---

# Fase 3 - Base DTreeViewV3 y rollout por defecto

## Problem Statement

Se necesita una base V3 operativa para dejar de extender el monolito actual y soportar migracion incremental de overlays.

## Findings

- `App.tsx` y `DTreeView.tsx` concentran flujo principal.
- Falta una frontera clara entre render core y presentacion.
- El rollout acordado es V3 por defecto con fallback temporal.

## Proposed Solutions

### Option 1: Introducir DTreeViewV3 y hacerlo default (Recommended)

**Approach:** crear vista V3 minima funcional y activarla por defecto con fallback configurable.

**Pros:**
- Alinea pronto la app al camino futuro.
- Reduce deuda incremental.
- Permite migrar overlays sin bloquear releases.

**Cons:**
- Requiere feature toggle de seguridad temporal.

**Effort:** Medium  
**Risk:** Medium

## Recommended Action

1. Crear `DTreeViewV3` con base de render y eventos.
2. Agregar `renderVersion` en `ViewConfig.dtree`.
3. Activar `renderVersion="v3"` por default y fallback temporal a v2.

## Technical Details

### Implementation Targets

- `src/views/DTreeViewV3.tsx` (nuevo)
- `src/views/dtree-v3/RenderCore.ts` (nuevo)
- `src/App.tsx` (switch principal v3 default)
- `src/state/slices/viewSlice.ts` (normalizacion restore/default)
- `src/types/domain.ts` (`renderVersion`)

### Runtime Defaults

- Default: `v3`
- Fallback: `v2` solo para contingencia y por ventana temporal definida.

### Rollout Controls

1. Agregar `renderVersion?: "v2" | "v3"` en `ViewConfig.dtree`.
2. Si snapshot restaurada no contiene `renderVersion`, normalizar a `v3`.
3. Mantener override de emergencia temporal via config de runtime para volver a `v2`.
4. Registrar en status/footer el engine de render efectivo durante ventana de transicion.

### In Scope / Out of Scope

**In Scope**
- Vista V3 minima funcional.
- Switch central en `App` y normalizacion de estado.
- Fallback temporal operable.

**Out of Scope**
- Portado de todos los overlays complejos (se hace en `070/071`).
- Eliminacion de codigo legacy (se hace en `072`).

### Rollback Plan

1. Si aparecen regresiones bloqueantes, forzar default temporal `renderVersion = "v2"`.
2. Mantener V3 habilitable para test interno mientras se corrige.
3. Reabrir `069` con issue de bloqueo y evidencia en Work Log.

## Verification Commands

- `npm run test -- src/tests/store.test.ts`
- `npm run test -- src/tests/globalShortcuts.test.ts src/tests/panel-error-boundary.test.tsx`
- `npm run test -- src/tests/layout`
- `npm run test -- src/tests/dtree.render-version.test.ts src/tests/workspace-profile.integration.test.ts`
- `npm run build`
- `npm run plan:dtree-v3:validate`

## Acceptance Criteria

- [x] `DTreeViewV3` renderiza arbol base, seleccion, foco y colapso.
- [x] `App` usa V3 por defecto.
- [x] `renderVersion` persiste y restaura correctamente.
- [x] Existe fallback temporal operativo y probado.
- [x] Rollback a `v2` puede activarse sin romper session restore.

## Work Log

### 2026-03-04 - Task created

**By:** Codex

**Actions:**
- Defined V3 default rollout with controlled fallback path.
- Added rollout controls and rollback protocol to make release behavior explicit.

### 2026-03-04 - Status updated

**By:** Codex

**Actions:**
- Updated issue status to `ready` for implementation once `068` closes.

### 2026-03-04 - Implementation completed

**By:** Codex

**Actions:**
- Added `renderVersion` contract in `ViewConfig.dtree` with runtime default `v3`.
- Added `src/core/dtree/renderVersion.ts` helper (`isRenderVersion`, `normalizeRenderVersion`, `readRenderVersionOverride`, `resolveEffectiveRenderVersion`).
- Added fallback control via localStorage key `gsk.dtree.renderVersion.override`.
- Created `DTreeViewV3` and `dtree-v3/RenderCore` as V3 entrypoint with temporary legacy render bridge.
- Updated `App.tsx` to switch `DTreeViewV3`/`DTreeView` by effective render version and show `engineMode` status.
- Normalized renderVersion in session restore and profile hydration (`sessionSlice`, `useGskFile`).
- Added/updated tests for renderVersion resolution and hydration/restore behavior.
- Executed verification commands:
  - `npm run test -- src/tests/dtree.render-version.test.ts` (pass)
  - `npm run test -- src/tests/store.test.ts src/tests/globalShortcuts.test.ts src/tests/panel-error-boundary.test.tsx` (pass)
  - `npm run test -- src/tests/layout` (pass)
  - `npm run test -- src/tests/workspace-profile.integration.test.ts` (pass)
  - `npm run build` (pass)
  - `npm run plan:dtree-v3:validate` (pass)
- Override smoke command documented for ops/QA:
  - `localStorage.setItem("gsk.dtree.renderVersion.override","v2")` + reload.
  - `localStorage.removeItem("gsk.dtree.renderVersion.override")` + reload.
- HEAD at execution time: `2d0d03a`.
