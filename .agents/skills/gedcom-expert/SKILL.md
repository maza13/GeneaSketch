---
name: gedcom-expert
description: Specialist in handling GEDCOM genealogical data, including parsing, serialization, conversion between versions (5.5.1 vs 7.0), duplicate detection, and merging best practices. Use this skill whenever the user wants to implement or improve data import/export, handle complex genealogical structures, or ensure compliance with international standards.
---

# GEDCOM Expert Skill

Specialized guidance for working with GEDCOM (GEnealogical Data COMmunication) data structures, following the latest industry standards and best practices.

## Core Standards

### GEDCOM 7.0 (Modern Standard)
- **Encoding**: STRICTLY UTF-8. Must include the Byte Order Mark (BOM) `U+FEFF` at the start.
- **Multimedia**: Use **GEDZip** (.gdz) to package media files with the data.
- **No Line Length Limits**: Stop using `CONT` and `CONC` tags for splitting long strings; 7.0 allows infinite line lengths (though some systems still prefer reasonable limits).
- **Semantic Versioning**: Follow `major.minor.patch`.
- **Extensions**: Use official URIs/URLs for custom tags (e.g., `_TAG { SCHEMA "https://example.com/schema.yaml" }`).

### GEDCOM 5.5.1 (Legacy Standard)
- **Encoding**: Often ANSEL, but UTF-8 is widely supported now.
- **Line Length**: Lines are traditionally limited to 255 characters, using `CONT` (continue with newline) and `CONC` (concatenate) for longer text.

## Best Practices for Data Handling

### 1. Robust Parsing & Serialization
- **Level Checking**: Always maintain context of the hierarchy levels (0, 1, 2...).
- **Tag Normalization**: Convert tags to uppercase and handle both standard and custom (prefixed with `_`) tags.
- **Cross-references**: Properly map identifiers (e.g., `@I1@`) to internal objects. Note that in 7.0, only the *initial* `@` in a value is doubled.

### 2. Version Conversion
- **5.5.1 to 7.0**:
    - Convert `NOTE_RECORD` to `SHARED_NOTE_RECORD`.
    - Map `SEX` values: `M`, `F`, `X`, `U`. Convert legacy strings to these single letters.
    - Remove or convert legacy tags: `ROMN`, `FONE`, `AFN`, `RFN`, `RIN`.
    - Convert non-pointer `OBJE` substructures to `OBJE` pointers + records.
- **Dates**: Favor the standard `DATE` format (e.g., `12 MAY 1850`). For dual dates or complex ranges, use the `PHRASE` substructure in 7.0.

### 3. Duplicate Detection & Merging
- **Verify Before Merge**: Never merge based on name alone.
- **Identity Signals**:
    - **Tier 1 (Critical)**: Parents (full names), Spouses, Children (order and names).
    - **Tier 2 (Temporal)**: Birth/Death dates (allow ±1-5 years for fuzzy matching).
    - **Tier 3 (Geographic)**: Locations of major life events.
- **Conflict Resolution**:
    - **Additive**: Keep both pieces of information (e.g., two different birth dates as alternate events).
    - **Preferential**: Let the user choose which record is the "master".
- **Audit Trail**: Always record why a merge occurred and provide an undo mechanism.

### 4. Search Implementation
- **Fuzzy Search**: Use algorithms like Soundex or Metaphone for phonetic name matching.
- **Relationship Search**: Allow searching for "Descendants of X" or "Ancestors of Y" rather than just flat entity searches.

## Implementation Patterns

### Mapping GEDCOM X to GEDCOM 7.0
GEDCOM X is a model/API, whereas 7.0 is a file format.
- **Person Identification**: Map `baseId` and `identifiers` from GEDCOM X to `@I...#` pointers.
- **Relationship Mappings**: Convert `Couple` and `ParentChild` relationships to standard `FAM` and `INDI` link structures.
- **Evidence/Sources**: Map `SourceDescription` to `SOUR` records, maintaining the `SourceRef` links.

## Verification Checklist
- [ ] Is the file encoded in UTF-8 (and has BOM if 7.0)?
- [ ] Are all cross-references valid and existing?
- [ ] Are custom tags properly prefixed or registered?
- [ ] Does the merge logic provide a preview/risk report?
- [ ] Are dates formatted according to the spec?
