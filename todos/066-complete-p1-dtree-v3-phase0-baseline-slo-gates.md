---
status: complete
priority: p1
issue_id: "066"
tags: [dtree-v3, phase0, baseline, slo, perf, gates]
dependencies: ["065"]
---

# Fase 0 - Baseline, SLO y Gates de Rendimiento

## Problem Statement

No se puede migrar a V3 con seguridad sin una linea base reproducible de rendimiento y funcionalidad para layout y overlays.

## Findings

- Tests de layout/store/kinship ya pasan, pero faltan metricas de latencia por escenario.
- No existe benchmark estandarizado por overlay ni criterio p95 de salida.
- El rendimiento actual depende de recorridos completos de grafo en multiples overlays.

## Proposed Solutions

### Option 1: Baseline instrumentada + gates automaticos (Recommended)

**Approach:** definir dataset de benchmark, capturar metricas p50/p95 y establecer umbrales oficiales.

**Pros:**
- Evita regresiones silenciosas.
- Permite aprobar fases por evidencia.
- Convierte rendimiento en criterio objetivo.

**Cons:**
- Requiere agregar scripts y snapshots de metricas.

**Effort:** Medium  
**Risk:** Low

## Recommended Action

1. Crear harness de benchmark para layout y overlays.
2. Registrar baseline inicial.
3. Definir SLO moderado y gate de regresion por PR.

## Technical Details

### Implementation Targets

- `src/tests/perf/` (nuevo)
- `src/core/layout/` (timings hook minimo no intrusivo)
- `src/views/` (instrumentacion de overlay apply)
- `package.json` scripts:
  - `test:perf:layout`
  - `test:perf:overlays`

### Baseline Scenarios

1. Arbol mediano.
2. Arbol grande con colaterales.
3. Escenario con endogamia y multiples overlays activos.

### SLO Moderado (target inicial)

- `layout p95 <= 220ms`
- `overlay no-heatmap p95 <= 90ms`
- `heatmap first-run p95 <= 220ms`
- `heatmap target-switch p95 <= 35ms` sin relayout

### Measurement Protocol

1. Ejecutar cada benchmark en 3 corridas:
   - corrida 1: cold start
   - corrida 2-3: warm cache
2. Reportar `p50`, `p95`, `max` por escenario.
3. Persistir artefactos en `reports/perf/dtree-v3-phase0/` con:
   - `baseline-layout.json`
   - `baseline-overlays.json`
   - `summary.md`
4. Incluir hash de commit y fecha ISO en cada artefacto.

### Regression Gate Rule

1. Falla gate si cualquier metrica supera su umbral absoluto SLO.
2. Falla gate si `p95` empeora mas de `10%` contra baseline aprobada.
3. Si falla, abrir sub-task de correccion antes de continuar a `067/068`.

### In Scope / Out of Scope

**In Scope**
- Instrumentacion minima para medir layout y overlays.
- Scripts de benchmark y guardado de artefactos.
- Publicacion de baseline inicial.

**Out of Scope**
- Optimizaciones funcionales de overlays.
- Cambios de UX/render.

## Verification Commands

- `npm run test -- src/tests/layout src/tests/store.test.ts src/tests/kinship.nomenclature.test.ts`
- `npm run test:perf:layout`
- `npm run test:perf:overlays`

## Acceptance Criteria

- [x] Harness de benchmark agregado y documentado.
- [x] Baseline guardada con resultados reproducibles.
- [x] SLO moderado oficial publicado en docs tecnicas.
- [x] Gate de regresion listo para fases siguientes.
- [x] Artefactos `reports/perf/dtree-v3-phase0/*` creados y referenciados en Work Log.

## Work Log

### 2026-03-04 - Task created

**By:** Codex

**Actions:**
- Defined baseline and SLO gate as mandatory entry criteria for V3.
- Added measurement protocol and regression gate thresholds for objective approval.

### 2026-03-04 - Baseline + gates implemented

**By:** Codex

**Actions:**
- Added perf harness files:
  - `src/tests/perf/common/perfStats.ts`
  - `src/tests/perf/common/perfScenarios.ts`
  - `src/tests/perf/common/reportWriter.ts`
  - `src/tests/perf/layout.perf.test.ts`
  - `src/tests/perf/overlays.perf.test.ts`
- Added npm scripts:
  - `test:perf:layout`
  - `test:perf:overlays`
  - `test:perf:all`
- Versioned baseline artifacts:
  - `reports/perf/dtree-v3-phase0/baseline-layout.json`
  - `reports/perf/dtree-v3-phase0/baseline-overlays.json`
  - `reports/perf/dtree-v3-phase0/summary.md`
- Implemented gate logic in tests:
  - absolute SLO limits
  - regression gate `p95 <= baseline * 1.10`
- Executed commands:
  - `npm run test:perf:layout`
  - `npm run test:perf:overlays`
  - `npm run test:perf:all`
- Workspace commit reference: `2d0d03a`

**Metrics (latest run):**

| Group | Metric | p95 (ms) | Gate |
| :--- | :--- | ---: | :--- |
| Layout | S1_layout_fixture | 5.425 | pass (`<=220`) |
| Layout | S2_standard_tree | 0.330 | pass (`<=220`) |
| Layout | S3_endogamy_tree | 0.437 | pass (`<=220`) |
| Overlays | kinship (aggregate) | 0.376 | pass (`<=90`) |
| Overlays | heatmap_first_run (aggregate) | 20.652 | pass (`<=220`) |
| Overlays | heatmap_target_switch (aggregate) | 0.709 | pass (`<=35`) |
| Overlays | lineage (aggregate) | 0.186 | pass (`<=90`) |
| Overlays | layer_diagnostics (aggregate) | 2.775 | pass (`<=90`) |
| Overlays | timeline_inference (aggregate) | 43.174 | pass (`<=90`) |

### 2026-03-04 - Status updated

**By:** Codex

**Actions:**
- Updated issue status to `complete` after baseline, SLO gates, artifacts, and verification commands passed.
