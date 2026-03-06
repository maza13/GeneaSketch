# Super Analysis 0.5.0 - Dimension 3 Performance and scale

- generatedAt: 2026-03-06T07:04:47.214Z
- classification: pass
- persons: 2765
- families: 1023
- visibleNodes: 24
- visibleEdges: 16

| Metric | p50 (ms) | p95 (ms) | max (ms) | threshold p95 |
| :--- | ---: | ---: | ---: | ---: |
| projection | 58.891 | 69.875 | 69.875 | 250 |
| ttvProxy | 478.625 | 500.441 | 500.441 | n/a |
| layout | 0.947 | 1.038 | 1.038 | 450 |
| search | 3.515 | 20.181 | 20.181 | 80 |

## Rationale

- All measured p95 values are within first-pass thresholds for the generated dense scenario.
