---
name: geneasketch-ux-governor
description: Governance skill for GeneaSketch UX/UI standards. Use this skill whenever tasks touch UI components, styling, layout, themes, icons, interaction patterns, or UX docs (for example changes in `src/ui/**`, `src/styles/**`, `*.module.css`, `index.html`, or `docs/wiki-uxdesign/**`). Always anchor decisions to `docs/wiki-uxdesign/12_instrucciones_agentes_ia.md` and the chapterized UX wiki before implementing.
---

# GeneaSketch UX Governor

Use this skill when working in:
- `src/ui/**`
- `src/styles/**`
- `*.module.css`
- `index.html` (fonts/icons/theme-related)
- `docs/wiki-uxdesign/**`

## Preflight (required)
1. Read `docs/wiki-uxdesign/12_instrucciones_agentes_ia.md`.
2. Read relevant chapters in `docs/wiki-uxdesign/01_*.md` to `12_*.md`.
3. Confirm token source as `src/styles/tokens.css`.
4. Load operational contract: `references/ux-operational-contract.md`.
5. Load rule map: `references/ux-rule-map.yaml`.

## Classification flow
Classify the change before editing:
- `ui_layout` -> component structure, panels, modal anatomy
- `ui_style` -> CSS modules, token usage, theme behavior
- `ui_icons_typography` -> icon family, typographic hierarchy
- `d3_surface` -> visual encoding, labels, interactions in D3 surfaces
- `tauri_window_ui` -> titlebar/menu/window controls that affect UI shell
- `motion_interaction` -> transitions, motion, reduced motion
- `mixed_scope` -> any combination requiring multi-skill handoff

## Delegation matrix
- `d3_surface` -> delegate to `d3-viz` for layout/interaction mechanics.
- `tauri_window_ui` -> delegate to `customizing-tauri-windows` for desktop shell mechanics.
- `motion_interaction` -> delegate to `ui-animation` for animation quality/perf.
- `mixed_scope` -> orchestrate multiple delegates and enforce UX rules at final pass.

## Enforcement rules
Always enforce `UX-RULE-*` from `docs/wiki-uxdesign/12_instrucciones_agentes_ia.md`.
Minimum enforcement checks before close:
- Tokenized visuals (no forbidden hardcoded styles)
- Material Symbols icon policy
- Inline editing + destructive confirmation patterns (where applicable)
- Dark/light theme support integrity
- Z-index discipline
- Wiki update required when introducing a new UX pattern

## Conflict policy
If specialized skill guidance conflicts with wiki UX:
1. Reject conflicting guidance.
2. Apply wiki-compliant alternative.
3. Document the decision and cite affected `UX-RULE-*` IDs.

## Outputs required from this skill
For any non-trivial UX change, provide:
1. `classification` (one or more classes)
2. `delegates_invoked`
3. `ux_rules_checked` (list of IDs)
4. `exceptions_or_deviations` (if any, with justification)

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

