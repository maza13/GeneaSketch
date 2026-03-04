---
name: gsk-engine-architect
description: Guardrails for GeneaSketch GSchema engine, `.gsk` format contract, and wiki-first discipline. Use this skill for schema/runtime contract work and hand off to UX/docs skills when scope extends beyond GSK internals.
---

# GSK Engine Architect

Use this skill when working in:
- `src/core/gschema/*`
- `docs/wiki-gsk/*`

## Mandatory checks before changes
1. Read `docs/wiki-gsk/02_formato.md`, `03_modelo.md`, `04_operaciones.md`.
2. Cross-check operation/type names in `src/core/gschema/types.ts`.
3. Confirm changelog scope policy before updating docs.

## Non-negotiable contract rules
1. `graph.json` is canonical snapshot.
2. `journal.jsonl` is audit/recovery, append-only, gap-less `opSeq`.
3. Fast-forward is incremental (`opSeq > graphDerivedFromOpSeq`), replay completo only for invalid snapshot.
4. Claims use `quality + lifecycle`; no legacy `status` in new writes.
5. Quarantine is lossless AST; unknown GEDCOM tags are never silently dropped.
6. `quarantine.json` is required iff `graph.quarantine.length > 0`.
7. Canonical op codes in docs/code: `SET_PREF_CLAIM`, `RETRACT_CLAIM`.
8. Internal docs links must be relative.
9. Changelog split is strict:
   - `docs/wiki-gsk/CHANGELOG.md` => format/schema/wiki tecnica only
   - `docs/wiki-software/CHANGELOG.md` => product/wiki usuario
   - `CHANGELOG.md` => release global/public

## Verification protocol
- `npx vitest run src/tests/gschema.golden.test.ts src/tests/gschema.strict.test.ts src/tests/gschema.regression.test.ts`
- `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py`
- If release metadata changed, run preflight/build-process checks.

## Coordination and handoff
- If GSK/runtime changes impact UI components, interaction behavior, themes, or UX docs, hand off to `geneasketch-ux-governor`.
- If task scope includes user-facing docs/changelog normalization, hand off to `geneasketch-docs-manager`.

## Skill orchestration matrix (routes + keywords)
- Lead `gsk-engine-architect`:
  - Paths: `src/core/gschema/**`, `docs/wiki-gsk/**`
  - Keywords: schema, journal, opSeq, claim lifecycle, GEDCOM contract
- Lead `geneasketch-ux-governor`:
  - Paths: `src/ui/**`, `src/styles/**`, `index.html`, `docs/wiki-uxdesign/**`
  - Keywords: panel, modal, button, layout, theme, icon, interaction, UX
- Lead `geneasketch-docs-manager`:
  - Paths: `docs/wiki-software/**`, root release/user changelogs
  - Keywords: user guide, docs normalization, release note, product docs

For mixed-scope work, the leading skill must explicitly hand off to impacted skills and enforce consistency checks before closing.
