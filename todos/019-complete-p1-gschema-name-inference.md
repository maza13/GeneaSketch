---
status: complete
priority: p1
issue_id: "019"
tags: [core-engine, gschema, gedcom, names]
dependencies: []
---

# Fix Structural GSchema Name Inference (Missing GIVN)

## Problem Statement
The application exhibits a persistent bug where the UI displays the full name inside the "Nombre(s)" (given name) text field. This occurs because when a GEDCOM file lacks the explicit `2 GIVN` tag, the system fails to create a `NAME_GIVEN` claim in the GSchema graph, causing the UI to fall back to the full name.

## Findings
Investigation into `parser.ts` and `GedcomBridge.ts` reveals:
- `parser.ts` regex extracts given name parts but only populates the internal `given` property if a `GIVN` tag is present in the source.
- `GedcomBridge.ts` skips adding the `PersonPredicates.NAME_GIVEN` claim if the `given` property is missing or undefined.
- As a result, the GSchema graph for such persons is semantically incomplete, lacking the mandatory given name claim.

## Proposed Solutions

### Option 1: Dynamic Cleaning in UI (Discarded)
Strip surnames from the display name at the UI bridge level.
- **Pros:** Fast fix for display.
- **Cons:** Leaves corrupted data in the graph, doesn't fix the root cause.

### Option 2: Robust Inference during Import (Recommended)
Synthesize the `NAME_GIVEN` and `NAME_SURNAME` claims during ingestion if sub-tags are missing.
- **Pros:** Fixes the data at the source, ensures GSchema completeness.
- **Cons:** Requires careful regex handling to avoid false splits.

## Recommended Action
Implement Option 2: Update the GEDCOM parser and the GSchema bridge to ensure that name parts are always inferred and stored as distinct claims, regardless of the presence of explicit GEDCOM sub-tags.

## Detailed Task Breakdown & Rationale

### 1. Update GSchema Wiki Protocol (Interoperability Contract)
**Task:** Update `docs/wiki-gsk/05_interoperabilidad_gedcom.md`.
- **Action:** Add a mandatory rule: "Structural name components (Given/Surname) MUST be synthesized from the `1 NAME` line if sub-tags (`2 GIVN`, `2 SURN`) are absent."
- **Rationale:** GSchema is designed to be a semantically rich graph, not a mirror of raw text. If we don't formalize this in the Wiki, future importers might return to the current lazy behavior, re-introducing the UI bug.

### 2. Update Parser Logic (Data Extraction)
**Task:** Modify `src/core/gedcom/parser.ts` inside `parseNameParts`.
- **Action:** Ensure that the `given` and `surname` fields of the `parsedName` object are populated using the regex results *even if* no sub-tags are found.
- **Rationale:** The parser already does the work of splitting the string with its regex. By not returning these values when the tags are missing, it's withholding valid information from the rest of the engine.

### 3. Update Bridge Ingestion (Structural Integrity)
**Task:** Modify `src/core/gschema/GedcomBridge.ts` inside `documentToGSchema`.
- **Action:** If `n.given` or `n.surname` are now available (thanks to Task 2) or obtainable through the canonical surname splitter, the bridge **MUST** dispatch a `addClaim` for `NAME_GIVEN` and `NAME_SURNAME`.
- **Rationale:** This ensures that the GSchema graph is populated with atomic name data. This is the only way to guarantee that the UI's "Nombre(s)" field (which queries `NAME_GIVEN`) finds its dedicated data without resorting to a "full name fallback".

### 4. Create Regression Payload Tests (Verification)
**Task:** Update `src/tests/gschema.golden.test.ts`.
- **Action:** Create a new test case that imports a GEDCOM string lacking `GIVN` and `SURN` tags but containing slashes (e.g., `1 NAME Juan /Perez/`).
- **Rationale:** We need to prove mathematically that given the raw string, the graph automatically generates the two missing assertions. This prevents the bug from ever returning.

## Acceptance Criteria
- [x] Wiki documentation updated with the new ingestion rule.
- [x] `parser.ts` extracts `given` and `surname` even without `GIVN`/`SURN` tags.
- [x] `GedcomBridge.ts` invariably creates `NAME_GIVEN` and `NAME_SURNAME` claims.
- [x] GSchema golden tests verify that `1 NAME Juan /Perez/` generates a `NAME_GIVEN` claim of `"Juan"`.
- [x] UI "Nombre(s)" field displays only given names for new imports.

## Technical Details
- Files: `src/core/gedcom/parser.ts`, `src/core/gschema/GedcomBridge.ts`.
- Predicates: `person.name.given`, `person.name.surname`.

## Work Log

### 2026-03-03 - Initial Diagnosis
**By:** Claude Code (Antigravity)
**Actions:** Performed deep audit of the parser and bridge. Identified that missing `GIVN` leads to missing graph claims.
**Learnings:** GSchema requires explicit given name claims to prevent UI degradation.

### 2026-03-03 - Wiki Protocol Update
**By:** Claude Code (Antigravity)
**Actions:** Updated GSK Wiki 05 to formalize name synthesis rules.

### 2026-03-03 - Code Implementation & Testing
**By:** Claude Code (Antigravity)
**Actions:** Implemented name part inference in `parser.ts` and `GedcomBridge.ts`. Added regression test in `gschema.golden.test.ts`.
**Results:** All 52 tests passed (including the new regression test).

