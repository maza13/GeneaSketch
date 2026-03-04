---
status: pending
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

- [ ] Fallback temporal retirado.
- [ ] No queda logica duplicada critica entre v2 y v3.
- [ ] Test suite completa en verde.
- [ ] SLO moderado cumplido en benchmark final.
- [ ] Docs y changelog sincronizados con estado final.
- [ ] Ventana de monitoreo post-cut completada y registrada.

## Work Log

### 2026-03-04 - Task created

**By:** Codex

**Actions:**
- Defined retirement phase and explicit closure gates for complete V3 adoption.
- Added removal checklist and post-cut monitoring protocol for controlled shutdown.
