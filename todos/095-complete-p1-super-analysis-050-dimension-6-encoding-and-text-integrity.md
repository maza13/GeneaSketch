---
status: "complete"
priority: "p1"
issue_id: "095"
title: "super-analysis-050-dimension-6-encoding-and-text-integrity"
tags: ["analysis", "release-0.5.0", "encoding", "text-integrity", "mojibake"]
dependencies: ["089"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: true
commit_message: "Complete 095: audit encoding and text integrity"
closed_at: "2026-03-06"
---

# Super Analysis 0.5.0 dimension 6 encoding and text integrity

Audit the repo for real encoding or mojibake problems and separate product risk from historical noise.

## Problem Statement

There is concern that files such as UI sections may contain bad encoding or text corruption. The release does not need a blind mass re-save; it needs a focused audit that identifies which files are actually affected, what the impact is, and whether the issue touches product code, tooling, tests, or only historical artifacts.

## Findings

- `src/ui/person/sections/PersonSummarySection.tsx` did not show immediate invalid-text evidence in the initial byte check.
- Mojibake is visible in some repo content, including test strings rendered with corrupted accent sequences.
- Historical outputs like `diff.txt` and `test_output.txt` may contain old degraded text and should not automatically count as release blockers.

## Proposed Solutions

### Option 1 (Recommended)

- Approach:
  - Run a repo-wide scan, then narrow remediation only to files with confirmed issues.
- Pros:
  - Avoids unnecessary churn.
  - Produces an evidence-based correction list.
- Cons:
  - Requires careful exclusion of generated or historical artifacts.
- Effort: M
- Risk: Low

## Recommended Action

Create an encoding audit inventory that classifies every confirmed issue by scope and impact before any normalization is attempted.

### Execution Plan

1. Scan source, docs, tools, and tests for mojibake signatures and non-UTF8 content.
2. Separate active source files from generated/historical artifacts.
3. Record each affected file with probable issue type and impact.
4. Recommend a targeted normalization plan only for confirmed active-file problems.
5. Write a summary and machine-readable inventory.

## User Action Required (Only if unavoidable)

- Needed from user:
- Why automation cannot do it:
- Blocking condition:

## Acceptance Criteria

- [x] Repo-wide scan produces an inventory of confirmed affected files.
- [x] Historical/generated artifacts are separated from active-source risk.
- [x] Product-impacting encoding issues are explicitly called out.
- [x] Work log updated with scan commands and inventory paths.

## Work Log

### 2026-03-06 - Task created from approved plan

**By:** Codex / Developer

**Status Transition:**
- from: not-tracked
- to: pending

**Actions:**
- Created the encoding/text-integrity audit task.
- Recorded that the current evidence supports a focused scan rather than a blanket re-save.

**Evidence:**
- Command: `Get-Content src/ui/person/sections/PersonSummarySection.tsx -Encoding Byte | Select-Object -First 32`
- Result: no immediate invalid-text evidence at file start during planning
- Artifacts/paths:
  - `todos/095-pending-p1-super-analysis-050-dimension-6-encoding-and-text-integrity.md`

### 2026-03-06 - Encoding/text integrity audit executed

**By:** Codex

**Status Transition:**
- from: ready
- to: complete

**Actions:**
- Ran a signature scan for common mojibake sequences across `src`, `docs`, `tools`, `todos`, and `notes`.
- Ran a BOM check over tracked text-file scopes.
- Classified active product code, active tooling, and historical/documental noise separately.
- Wrote machine-readable and human-readable inventory artifacts.

**Findings:**
- No UTF-8 BOM files were detected in the audited text scopes.
- Active-source findings are concentrated in `src/core/ai/fastTrack.ts`, `src/core/ai/review.ts`, `src/core/ai/safety.ts`, and `src/core/diagnostics/analyzer.ts`.
- `src/core/ai/fastTrack.ts` is the highest-risk file because mojibake appears inside runtime regexes used to detect Spanish phrasing.
- `tools/notes/cli.mjs` contains mojibake sequences intentionally as part of a repair table and should not be treated as corruption.
- Older `todos/` and `notes/` entries contain historical mojibake but are not current release blockers.

**Evidence:**
- Command: `rg -n --hidden -g '!node_modules/**' -g '!dist/**' -g '!src-tauri/target/**' -e 'Ã' -e 'Â·' -e 'â€' -e 'Ã±' -e 'tÃ©' -e 'DiseÃ±' -e 'artÃ' src docs tools todos notes`
- Result: active hits only in `src/core/ai/*`, `src/core/diagnostics/analyzer.ts`, and `tools/notes/cli.mjs`; additional historical hits in `todos/` and `notes/`
- Command: PowerShell BOM scan over tracked text files in `src`, `docs`, `tools`, `todos`, `notes`
- Result: no UTF-8 BOM files detected
- Artifacts/paths:
  - `reports/super-analysis-0.5.0/encoding-audit.csv`
  - `reports/super-analysis-0.5.0/dimension-6-encoding-and-text-integrity.md`
  - `reports/super-analysis-0.5.0/dimension-6-encoding-and-text-integrity.json`

## Notes

Treat generated or historical outputs as secondary unless they are consumed by active tooling.

