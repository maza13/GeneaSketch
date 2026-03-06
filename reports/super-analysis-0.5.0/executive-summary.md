# Super Analysis 0.5.0 executive summary

Release decision: `0.5.0 ready with postship debt`

## Baseline

- Branch: `release/pre-0.5.0`
- Baseline commit audited: `eb59201`
- Focused baseline bundle: green
- AI bundle: green
- Release-gate rerun after blocker fixes: green

## Dimension status

| Dimension | Status | Release impact |
| --- | --- | --- |
| 1. AI-engine sync | pass | no blocker observed |
| 2. Read-model parity | pass | blocker removed |
| 3. Performance and scale | pass | blocker removed |
| 4. UX integrity and interconnection | needs-followup | `0.5.0-postship` |
| 5. Hard-cut 0.6.0 readiness | pass-with-blockers-identified | `0.6.0-hardcut` |
| 6. Encoding and text integrity | needs-followup | `0.5.0-postship` |

## Resolved release blockers

### 1. Direct vs legacy read-model parity

- Source: `dimension-2-read-model-parity`
- Current state:
  - `0` semantic mismatches across `7` fixtures
  - canonical, compat, synthetic, and real sample cases are aligned
- Root fix:
  - synthetic XREF generation is now shared between direct projection and the legacy bridge

### 2. Dense-tree projection and search

- Source: `dimension-3-performance`
- Current state:
  - projection p95 `69.328 ms` vs threshold `250 ms`
  - search p95 `13.535 ms` vs threshold `80 ms`
  - layout p95 `1.071 ms` vs threshold `450 ms`
- Root fix:
  - `buildDirectDocument()` no longer serializes the full graph on the normal path
  - projection now uses local node/edge indexes instead of repeated graph-wide scans
  - search now uses a cached normalized index per projected document

### 3. Encoding corruption in `fastTrack.ts`

- Source: `dimension-6-encoding-and-text-integrity`
- Current state:
  - accented Spanish inputs are covered by regression tests and pass
  - `fastTrack.ts` no longer appears in the mojibake scan
- Root fix:
  - regexes and visible strings were normalized to UTF-8 and extended to accept accented and plain variants

## Remaining postship debt

- Person workspace still flattens structured claim evidence before first-class UI display.
- Workspace profile hydration remains a two-phase flow with unproven no-flicker behavior.
- User-facing mojibake remains in `review.ts`, `safety.ts`, and `analyzer.ts`.
- The 0.6.0 hard cut still requires removing the central legacy fallback and remaining graph/document bridge paths.

## Recommendation

`0.5.0` is release-eligible if postship debt is accepted explicitly. The blocker set from dimensions `091`, `092`, and `095` has been cleared by code and regression reruns.
