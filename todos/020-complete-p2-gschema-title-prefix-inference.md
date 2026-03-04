---
status: complete
priority: p2
issue_id: "020"
tags: [core-engine, gschema, gedcom, metadata]
dependencies: ["019"]
---

# Support for Name Prefixes, Suffixes, and Titles (NPFX, NSFX, TITL)

## Problem Statement
Many GEDCOM files include prefixes (e.g., "Dr.", "Sir") or suffixes (e.g., "Jr.") inside the `1 NAME` string but omit explicit hierarchical tags like `2 NPFX` or `2 NSFX`. These metadata bits are currently either lost or incorrectly merged into the given name or surname fields.

## Findings
- `PersonPredicates` likely lacks active handling for these specific sub-fields during the bridge phase.
- `parser.ts` does not attempt to isolate these parts from the main name string.

## Proposed Solutions

### Option 1: Simple Preservation
Store the entire string and let the user split them manually.
- **Pros:** No risk of incorrect splitting.
- **Cons:** Poor data quality; breaks sorting and semantics.

### Option 2: Heuristic Extraction (Recommended)
Add common prefix/suffix patterns to the name parser to isolate these tokens and store them in dedicated GSchema predicates.

## Recommended Action
TBD after Phase 1 audit of `PersonPredicates`.

## Acceptance Criteria
- [x] Audit of `PersonPredicates` for NPFX/NSFX/TITL items completed.
- [x] Bridge logic updated to handle these tags if present.
- [x] Test case with `1 NAME Dr. Juan /Perez/ Jr.` verified.

## Work Log

### 2026-03-04 - Implementation and Verification
**By:** Antigravity (Assistant)
**Actions:**
- Added `NAME_PREFIX`, `NAME_SUFFIX`, `NAME_TITLE` to GSchema.
- Implemented heuristic extraction in `parser.ts`.
- Updated `GedcomBridge.ts` to persist metadata.
- Verified with 54/54 tests in `gschema.golden.test.ts`.


