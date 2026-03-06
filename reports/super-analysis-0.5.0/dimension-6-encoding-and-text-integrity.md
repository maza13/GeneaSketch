# Dimension 6: encoding and text integrity

Status: `needs-followup`

## Scope

- Signature scan for visible mojibake in `src/`, `docs/`, `tools/`, `todos/`, and `notes/`.
- UTF-8 BOM check in tracked text files under active scopes.
- Classification of active-source risk vs historical/documental noise.

## Evidence

- Signature scan command:
  - `rg -n 'Ã|â€”|â†|ΓÇ|varÃ|naci\[oÃ|muri\[oÃ|falleci\[oÃ' src/core/ai src/core/diagnostics tools/notes/cli.mjs`
- AI fast-track regression suite:
  - `npx vitest run src/tests/ai.fast-track-encoding.test.ts src/tests/ai.orchestrator.test.ts src/tests/ai.apply-selection.test.ts src/tests/ai.apply-dependencies.test.ts`
- Inventory:
  - `reports/super-analysis-0.5.0/encoding-audit.csv`

## High-level result

- No UTF-8 BOM files were detected in the audited text scopes.
- `src/core/ai/fastTrack.ts` no longer appears in the mojibake scan and its accented-input regression suite is green.
- Active runtime/tooling findings are now concentrated in `3` source files under `src/` and `1` tooling file under `tools/`.
- Historical/documental mojibake still exists in older `todos/` and `notes/` entries, but those do not currently block release.

## Active findings

### 1. `src/core/ai/review.ts` and `src/core/ai/safety.ts` contain user-facing mojibake

- Severity: `medium` for `review.ts`
- Severity: `low` for `safety.ts`
- Confidence: `high`
- Release impact: `0.5.0-postship`

Why it matters:

- Strings like `relación`, `vínculo`, and `selección` surface directly in review UX.
- This does not appear to break logic, but it degrades trust and polish in a release-facing workflow.

### 2. `src/core/diagnostics/analyzer.ts` contains widespread mojibake in diagnostic messages

- Severity: `medium`
- Confidence: `high`
- Release impact: `0.5.0-postship`

Why it matters:

- Diagnostic output shown to users or copied into reports contains many corrupted Spanish strings.
- The analyzer logic itself is not implicated, but its visible messages are degraded.

### 3. `tools/notes/cli.mjs` contains mojibake patterns intentionally

- Severity: `low`
- Confidence: `high`
- Release impact: `0.5.0-postship`

Why it matters:

- This file includes an explicit repair map for corrupted sequences and a detector regex.
- It should not be classified as corruption requiring normalization.

## Resolved blocker

### `src/core/ai/fastTrack.ts`

- Previous issue: mojibake in matching regexes and user-facing strings caused incorrect handling of accented Spanish input.
- Current state:
  - regexes now accept accented and plain variants such as `nació`, `nacio`, `murió`, `murio`, `falleció`, `fallecio`, `varón`, and `varon`
  - the fast-track description string is UTF-8 clean
  - regression coverage is green
- Release impact: blocker removed

## Release call for this dimension

- `active-source runtime blocker`: not reproduced after the `fastTrack` fix
- `active-source polish debt`: present
- `tooling integrity risk`: low
- `historical noise`: present but non-blocking

Overall status: `needs-followup`

## Recommended remediation order

1. Normalize `src/core/ai/review.ts`, `src/core/ai/safety.ts`, and `src/core/diagnostics/analyzer.ts`.
2. Leave `tools/notes/cli.mjs` unchanged unless the repair table itself is verified incorrect.
3. Treat `todos/` and `notes/` cleanup as separate hygiene work, not release gating.
