# Super Analysis 0.5.0 executive summary

Release decision: `0.5.0 blocked`

## Baseline

- Branch: `release/pre-0.5.0`
- Baseline commit audited: `eb59201`
- Focused baseline bundle: green
- AI bundle: green

## Dimension status

| Dimension | Status | Release impact |
| --- | --- | --- |
| 1. AI-engine sync | pass | no blocker observed |
| 2. Read-model parity | fail | `0.5.0-blocking` |
| 3. Performance and scale | needs-followup | `0.5.0-blocking` |
| 4. UX integrity and interconnection | needs-followup | `0.5.0-postship` |
| 5. Hard-cut 0.6.0 readiness | pass-with-blockers-identified | `0.6.0-hardcut` |
| 6. Encoding and text integrity | needs-followup | mixed; includes `0.5.0-blocking` |

## Blocking issues

### 1. Direct vs legacy read-model parity is not release-safe yet

- Source: `dimension-2-read-model-parity`
- Severity: `high`
- Confidence: `high`
- Why blocking:
  - `24` semantic mismatches across `7` fixtures
  - failures hit canonical and compat scenarios
  - root cause is ID synthesis divergence between direct projection and legacy bridge fallback

### 2. Dense-tree projection and search are far outside the stated thresholds

- Source: `dimension-3-performance`
- Severity: `high`
- Confidence: `high`
- Why blocking:
  - projection p95 `14137.248 ms` vs threshold `250 ms`
  - search p95 `135.75 ms` vs threshold `80 ms`
  - layout is fine, but visible-node stress is not yet representative enough to offset the projection/search failure

### 3. Encoding corruption in `fastTrack.ts` affects runtime matching

- Source: `dimension-6-encoding-and-text-integrity`
- Severity: `high`
- Confidence: `high`
- Why blocking:
  - mojibake is present inside Spanish matching regexes
  - accented input such as `nació` / `murió` can be missed by the fast-track path

## Non-blocking but real follow-up

- Person workspace does not expose structured claim evidence as a first-class UI surface.
- Workspace profile hydration remains a two-phase flow with unproven flicker risk.
- Several user-facing strings in AI review/diagnostics remain mojibake-corrupted.
- 0.6.0 hard cut is feasible, but only after parity and graph-native boundary work.

## What is safe today

- Hardened AI-engine contracts are not reproducing current failures.
- Wiki navigation audited paths are green.
- Workspace profile precedence rules are functionally correct.
- Encoding risk is concentrated, not repo-wide.

## Recommendation

Do not declare `0.5.0 ready` yet. Fix parity, direct-read-model performance, and `fastTrack` encoding first. After those are corrected, rerun dimensions `091`, `092`, and `095` as the release gate subset.

