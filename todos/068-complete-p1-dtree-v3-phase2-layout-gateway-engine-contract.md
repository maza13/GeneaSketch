---
status: complete
priority: p1
issue_id: "068"
tags: [dtree-v3, phase2, layout, engine, diagnostics, contract]
dependencies: ["066"]
---

# Fase 2 - LayoutGateway y contrato real de engine

## Problem Statement

El selector `layoutEngine` esta expuesto en UI/store pero el runtime de layout fuerza `vnext`, creando inconsistencia de contrato.

## Findings

- `ViewConfig.dtree.layoutEngine` existe y se persiste.
- `computeLayout()` actualmente ignora ese valor y fuerza `vnext`.
- Tests de layout etiquetados `v2` pueden inducir falsa percepcion del engine efectivo.

## Proposed Solutions

### Option 1: Gateway de layout con engine efectivo explicito (Recommended)

**Approach:** crear seleccion real de engine + diagnostico de engine efectivo y tiempos.

**Pros:**
- Corrige deuda de contrato.
- Permite fallback controlado.
- Mejora observabilidad de performance/layout.

**Cons:**
- Exige ajuste de tests para alinear semantica.

**Effort:** Medium  
**Risk:** Medium

## Recommended Action

1. Implementar `LayoutGateway` con dispatch por `layoutEngine`.
2. Ampliar `LayoutDiagnostics` con `effectiveEngine` y `timingsMs`.
3. Normalizar tests/layout fixtures al contrato real.

## Technical Details

### Implementation Targets

- `src/core/layout/index.ts`
- `src/core/layout/types.ts`
- `src/core/layout/vnext/index.ts`
- `src/tests/layout/*`
- `src/tests/collateral_vnext.test.ts`

### API Contract Additions

- `LayoutDiagnostics.effectiveEngine: "vnext" | "v2"`
- `LayoutDiagnostics.timingsMs: { total: number; buildVirtualTree?: number; solve?: number }`

### Engine Dispatch Rules

1. Si `input.layoutEngine` es `undefined`, usar `vnext`.
2. Si `input.layoutEngine` es `vnext`, ejecutar gateway `vnext`.
3. Si `input.layoutEngine` es `v2` y existe implementacion, ejecutar `v2`.
4. Si `input.layoutEngine` es `v2` y no hay implementacion habilitada, fallback a `vnext` con:
   - `effectiveEngine = "vnext"`
   - `fallbackFrom = "v2"`
   - warning explicita en `diagnostics.warnings`.

### Test Migration Rules

1. Mantener tests de estabilidad/determinismo actuales.
2. Agregar asserts de `effectiveEngine` para cada escenario.
3. Renombrar descripcion de tests donde diga "v2" si ya no representa engine real.
4. No cambiar snapshots de coordenadas sin evidencia de mejora aceptada.

### In Scope / Out of Scope

**In Scope**
- Contrato real de engine y diagnosticos.
- Telemetria de timings.
- Realineacion de pruebas de layout.

**Out of Scope**
- Reescritura del solver de layout.
- Cambios de UX en nodos/aristas.

## Verification Commands

- `npm run test -- src/tests/layout`
- `npm run test -- src/tests/collateral_vnext.test.ts`
- `npm run test -- src/tests/store.test.ts`
- `npm run test:perf:layout`
- `npm run plan:dtree-v3:validate`

## Acceptance Criteria

- [x] `computeLayout` respeta `input.layoutEngine`.
- [x] Diagnosticos exponen engine efectivo y timings.
- [x] Tests reflejan semantica real de engine.
- [x] Sin regresion funcional en coordenadas deterministas.
- [x] Fallback `v2 -> vnext` deja traza explicita en diagnostics.

## Work Log

### 2026-03-04 - Task created

**By:** Codex

**Actions:**
- Defined engine contract correction and diagnostics as independent phase.
- Added dispatch/fallback rules and test migration constraints.

### 2026-03-04 - Status updated

**By:** Codex

**Actions:**
- Updated issue status to `ready` per execution sequencing after `066` complete and `067` complete.

### 2026-03-04 - Implementation completed

**By:** Codex

**Actions:**
- Implemented layout gateway dispatch to honor `input.layoutEngine` with explicit fallback `v2 -> vnext`.
- Extended `LayoutDiagnostics` with `effectiveEngine` and `timingsMs`.
- Added vnext timing instrumentation (`total`, `buildVirtualTree`, `solve`).
- Updated `DTreeView` warning logs to use `diagnostics.effectiveEngine`.
- Added engine contract tests and migrated layout assertions to real engine semantics.
- Executed verification commands:
  - `npm run test -- src/tests/layout` (pass)
  - `npm run test -- src/tests/collateral_vnext.test.ts` (pass)
  - `npm run test -- src/tests/store.test.ts` (pass)
  - `npm run test:perf:layout` (pass)
  - `npm run plan:dtree-v3:validate` (pass)
- HEAD at execution time: `2d0d03a`.
