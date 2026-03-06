# Dimension 6: encoding and text integrity

Status: `needs-followup`

## Scope

- Signature scan for visible mojibake in `src/`, `docs/`, `tools/`, `todos/`, and `notes/`.
- UTF-8 BOM check in tracked text files under active scopes.
- Classification of active-source risk vs historical/documental noise.

## Evidence

- Signature scan command:
  - `rg -n --hidden -g '!node_modules/**' -g '!dist/**' -g '!src-tauri/target/**' -e 'Ã' -e 'Â·' -e 'â€' -e 'Ã±' -e 'tÃ©' -e 'DiseÃ±' -e 'artÃ' src docs tools todos notes`
- BOM check command:
  - PowerShell scan over tracked text files in `src`, `docs`, `tools`, `todos`, `notes`
- Inventory:
  - `reports/super-analysis-0.5.0/encoding-audit.csv`

## High-level result

- No UTF-8 BOM files were detected in the audited text scopes.
- No active files under `docs/` were flagged by the mojibake signature scan.
- Active runtime/tooling findings are concentrated in `4` files under `src/` and `1` file under `tools/`.
- Historical/documental mojibake exists in older `todos/` and `notes/` entries, but those do not currently block release.

## Active findings

### 1. `src/core/ai/fastTrack.ts` contains mojibake in matching regexes and user-facing strings

- Severity: `high`
- Confidence: `high`
- Release impact: `0.5.0-blocking`

Why it matters:

- Regexes such as `naci[oÃ³]`, `muri[oÃ³]`, and `falleci[oÃ³]` do not correctly match properly encoded accented input like `nació` or `murió`.
- This is not only cosmetic text corruption; it can reduce AI fast-track detection quality for normal Spanish input.

### 2. `src/core/ai/review.ts` and `src/core/ai/safety.ts` contain user-facing mojibake

- Severity: `medium` for `review.ts`
- Severity: `low` for `safety.ts`
- Confidence: `high`
- Release impact: `0.5.0-postship`

Why it matters:

- Strings like `relaciÃ³n`, `vÃ­nculo`, and `selecciÃ³n` surface directly in review UX.
- This does not appear to break logic, but it degrades trust and polish in a release-facing workflow.

### 3. `src/core/diagnostics/analyzer.ts` contains widespread mojibake in diagnostic messages

- Severity: `medium`
- Confidence: `high`
- Release impact: `0.5.0-postship`

Why it matters:

- Diagnostic output shown to users or copied into reports contains many corrupted Spanish strings.
- The analyzer logic itself is not implicated, but its visible messages are degraded.

### 4. `tools/notes/cli.mjs` contains mojibake patterns intentionally

- Severity: `low`
- Confidence: `high`
- Release impact: `0.5.0-postship`

Why it matters:

- This file includes an explicit repair map for sequences like `Ã¡ -> á` and a detector regex.
- It should not be classified as corruption requiring normalization.

## Historical/documental findings

- Multiple completed TODOs contain mojibake in historical text.
- Several notes and generated note reports also contain mojibake.
- These findings are inventory-worthy but are not release blockers unless those documents become normative or user-facing at runtime.

## Release call for this dimension

- `active-source runtime risk`: present
- `tooling integrity risk`: low
- `historical noise`: present but non-blocking

Overall status: `needs-followup`

## Recommended remediation order

1. Normalize `src/core/ai/fastTrack.ts` first because it affects text matching behavior.
2. Normalize `src/core/ai/review.ts`, `src/core/ai/safety.ts`, and `src/core/diagnostics/analyzer.ts`.
3. Leave `tools/notes/cli.mjs` unchanged unless the repair table itself is verified incorrect.
4. Treat `todos/` and `notes/` cleanup as separate hygiene work, not release gating.

