# DTree V3 Phase0 Baseline Summary

- phase: `066`
- generatedAt: `2026-03-04T00:00:00.000Z`
- commit: `2d0d03a`
- policy: fail on absolute SLO breach or p95 regression >10% vs baseline

## Layout Baseline

| Scenario | p50 (ms) | p95 (ms) | max (ms) |
| :--- | ---: | ---: | ---: |
| S1_layout_fixture | 36 | 80 | 94 |
| S2_standard_tree | 124 | 195 | 212 |
| S3_endogamy_tree | 132 | 200 | 218 |

SLO: `layout p95 <= 220ms`

## Overlay Baseline (Aggregate by Family)

| Family | p50 (ms) | p95 (ms) | max (ms) | Gate |
| :--- | ---: | ---: | ---: | :--- |
| kinship | 46 | 80 | 88 | p95 <= 90 |
| heatmap_first_run | 126 | 200 | 217 | p95 <= 220 |
| heatmap_target_switch | 18 | 31.5 | 34 | p95 <= 35 |
| lineage | 40 | 80 | 87 | p95 <= 90 |
| layer_diagnostics | 38 | 80 | 86 | p95 <= 90 |
| timeline_inference | 44 | 80 | 89 | p95 <= 90 |

## Commands

```bash
npm run test:perf:layout
npm run test:perf:overlays
npm run test:perf:all
```
