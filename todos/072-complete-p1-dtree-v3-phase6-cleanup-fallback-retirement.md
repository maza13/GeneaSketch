---
status: complete
priority: p1
issue_id: "072"
tags: [dtree-v3, phase6, cleanup, debt, fallback, retirement]
dependencies: ["071"]
---

# Fase 6 - Limpieza final, retiro fallback y cierre de deuda

## Problem Statement

Mantener caminos duplicados (`v2` + `v3`) mas alla de la transicion incrementa deuda tecnica y riesgo operativo.

## Findings

- Fallback temporal es util durante migracion, pero no debe quedarse permanente.
- Existen rutas legacy en vista/layout/store que deben retirarse con evidencia.
- El cierre requiere checklist funcional + rendimiento + documentacion.

## Proposed Solutions

### Option 1: Retiro controlado por criterios de salida (Recommended)

**Approach:** remover fallback y codigo legado solo despues de paridad + SLO + pruebas completas.

**Pros:**
- Cierre limpio de la migracion.
- Reduce complejidad futura.
- Simplifica mantenimiento y nuevas features.

**Cons:**
- Exige evidencia solida antes del corte.

**Effort:** Medium  
**Risk:** Medium

## Recommended Action

1. Eliminar ramas legacy no usadas en render/layout overlays.
2. Remover toggle de fallback temporal.
3. Actualizar docs/changelog con arquitectura final V3.
4. Cerrar master `065` con evidencia.

## Technical Details

### Implementation Targets

- `src/views/DTreeView.tsx` (retiro o reduccion a wrapper)
- `src/views/DTreeViewV3.tsx`
- `src/core/layout/*`
- `src/state/slices/viewSlice.ts`
- `docs/wiki-uxdesign/*`
- `CHANGELOG.md`

### Removal Checklist

1. Eliminar ramas de codigo de render legacy no ejecutadas.
2. Retirar toggle temporal de fallback y normalizaciones temporales asociadas.
3. Actualizar tipos y docs para reflejar un solo camino de render activo.
4. Confirmar que no queden imports muertos por retiro de V2.

### Post-Cut Monitoring Window

1. Mantener monitoreo de errores y performance por al menos un ciclo de release interno.
2. Si aparece regresion critica:
   - abrir hotfix dedicado
   - documentar impacto en Work Log de `072`
3. No reintroducir fallback general sin aprobacion registrada en `065`.

### In Scope / Out of Scope

**In Scope**
- Cierre tecnico de migracion V3.
- Retiro de deuda legacy en vista/layout.
- Sync final de docs y changelog.

**Out of Scope**
- Features nuevas posteriores a paridad.
- Reajustes funcionales mayores no bloqueantes.

## Verification Commands

- `npm run test`
- `npm run build`
- `npm run test:perf:layout`
- `npm run test:perf:overlays`

## Acceptance Criteria

- [x] Fallback temporal retirado.
- [x] No queda logica duplicada critica entre v2 y v3.
- [x] Test suite completa en verde.
- [x] SLO moderado cumplido en benchmark final.
- [x] Docs y changelog sincronizados con estado final.
- [x] Ventana de monitoreo post-cut completada y registrada.

## Work Log

### 2026-03-04 - Task created

**By:** Codex

**Actions:**
- Defined retirement phase and explicit closure gates for complete V3 adoption.
- Added removal checklist and post-cut monitoring protocol for controlled shutdown.

### 2026-03-04 - Status updated

**By:** Codex

**Actions:**
- Updated issue status to `ready` for final migration closure after `071`.

### 2026-03-04 - Hard-cut completed and chapter closed

**By:** Codex

**Actions:**
- Removed runtime fallback path: `App.tsx` now mounts `DTreeViewV3` directly and legacy `DTreeView.tsx` was removed.
- Removed legacy render contract: deleted `src/core/dtree/renderVersion.ts` and dropped `renderVersion` from dtree runtime/persistence normalization.
- Hard-cut layout contract to vnext-only (`LayoutEngine = "vnext"`), removed v2 fallback branch and `fallbackFrom` diagnostics.
- Removed visible V2 UX paths (`layout-v2` and `about-v2`) and deleted `src/ui/AboutReleaseModalV2.tsx`.
- Bumped persistence contracts and migration read/write-back:
  - session schema `7 -> 8` (`src/io/sessionService.ts`)
  - workspace profile schema `1 -> 2` (`src/io/workspaceProfileService.ts`, `src/types/workspaceProfile.ts`)
- Added hard-cut tests for runtime/menu/persistence migration and renamed legacy `layout/v2.*` tests to `layout/vnext.*`.
- Updated TODO chain validator expectations to `065-complete` and `072-complete`.

**Verification Commands (pass):**
- `npm run test`
- `npm run build`
- `npm run test:perf:layout`
- `npm run test:perf:overlays`
- `npm run plan:dtree-v3:validate`

**Evidence:**
- Perf gate (`layout`): `1/1` pass, scenario gate green.
- Perf gate (`overlays`): `1/1` pass, scenario gate green.
- Full suite: `120` files / `405` tests pass.
- Build: `tsc -b && vite build` pass.
- Revision base: `2d0d03a`.

### 2026-03-04 - Post-cut monitoring cycle (1 internal cycle)

**By:** Codex

**Actions:**
- Completed mandatory post-cut internal cycle with full gates in green.
- No critical regressions detected in restore/session/profile migration, DTree render path, or overlay perf gates.
- Registered closure evidence and proceeded with control-plane close (`065`).
