---
name: geneasketch-docs-manager
description: Document manager for keeping code, wiki-gsk, wiki-software, and wiki-uxdesign synchronized under wiki-first policy. Use this skill for docs/changelog updates and hand off to UX or GSK skills when path/keyword scope indicates.
---

# GeneaSketch Docs Manager

Use this skill when changing docs, changelogs, or user-visible behavior that impacts documentation.

## Scope discipline
- `docs/wiki-gsk/` => technical contract, format `.gsk`, engine behavior.
- `docs/wiki-software/` => user guide and product workflows.
- `docs/wiki-uxdesign/` => UX standards, design system, and interaction patterns.
- `CHANGELOG.md` root => release-level public notes + About parser source.

## Golden rules
1. Validate against code before documenting behavior.
2. Use relative markdown links for internal docs.
3. Keep changelog scope separated (technical vs user vs release-global).
4. Keep software/wiki versions aligned with `package.json` and release metadata.
5. For recovery/format claims, validate with `src/core/genraph/*` and tests.

## Required checks for substantial docs updates
- `python .agents/skills/geneasketch-docs-manager/scripts/check_links.py`
- If release notes touched:
  - `python .agents/skills/geneasketch-build-process/scripts/sync_about_release.py --check`
  - `python .agents/skills/geneasketch-build-process/scripts/preflight_build.py`

## Coordination
- If docs imply contract/runtime changes, create/update corresponding tests in `src/tests/*`.
- If runtime changed first, docs must be updated in the same implementation cycle.
- If docs task touches UI behavior or styling, hand off to `geneasketch-ux-governor`.
- If docs task touches `.gsk` contract/runtime semantics, hand off to `gsk-engine-architect`.

## Skill orchestration matrix (routes + keywords)
- Lead `gsk-engine-architect`:
  - Paths: `src/core/genraph/**`, `docs/wiki-gsk/**`
  - Keywords: schema, journal, opSeq, claim lifecycle, GEDCOM contract
- Lead `geneasketch-ux-governor`:
  - Paths: `src/ui/**`, `src/styles/**`, `index.html`, `docs/wiki-uxdesign/**`
  - Keywords: panel, modal, button, layout, theme, icon, interaction, UX
- Lead `geneasketch-docs-manager`:
  - Paths: `docs/wiki-software/**`, root release/user changelogs
  - Keywords: user guide, docs normalization, release note, product docs

For mixed-scope work, the leading skill must explicitly hand off to impacted skills and enforce consistency checks before closing.
