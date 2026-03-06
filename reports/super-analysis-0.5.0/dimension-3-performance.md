# Super Analysis 0.5.0 - Dimension 3 Performance and scale

- generatedAt: 2026-03-06T05:57:39.214Z
- classification: needs-followup
- persons: 2765
- families: 1023
- visibleNodes: 24
- visibleEdges: 16

| Metric | p50 (ms) | p95 (ms) | max (ms) | threshold p95 |
| :--- | ---: | ---: | ---: | ---: |
| projection | 13267.057 | 14137.248 | 14137.248 | 250 |
| ttvProxy | 15003.817 | 15248.563 | 15248.563 | n/a |
| layout | 3.272 | 3.922 | 3.922 | 450 |
| search | 95.828 | 135.75 | 135.75 | 80 |

## Rationale

- projection p95 14137.248ms exceeds threshold 250ms
- search p95 135.75ms exceeds threshold 80ms
