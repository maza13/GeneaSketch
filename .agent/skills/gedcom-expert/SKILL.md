---
name: gedcom-expert
description: Specialist guidance for GEDCOM parsing, conversion, and lossless interoperability.
---

# GEDCOM Expert Skill

Use for GEDCOM import/export and interoperability decisions.

## Core standards
- GEDCOM 7.x: UTF-8, modern extensions.
- GEDCOM 5.5.1: legacy compatibility with `CONC/CONT` constraints.

## GeneaSketch project overrides (mandatory)
1. Unknown/non-mapped GEDCOM tags must go to quarantine AST (lossless).
2. Non-preferred claims must be preserved through `GSK_CONFLICT|v1` / `_GSK_ALT` strategy.
3. Evidence hierarchy is dual:
   - Primary: `claim.citations[]`
   - Secondary: `EvidenceRef`
4. No silent data loss in import/export downgrade paths.
5. Keep operation and timestamp semantics aligned with GSchema docs.

## Verification checklist
- Round-trip preserves source references and conflict payloads.
- Quarantine includes hierarchy (`level/tag/value/children/sourceLines`).
- Export behavior matches selected GEDCOM target constraints.
