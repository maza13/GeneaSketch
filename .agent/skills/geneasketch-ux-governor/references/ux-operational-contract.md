# UX Operational Contract (Derived, Non-Canonical)

This file defines the operational behavior of `geneasketch-ux-governor`.
Canonical policy remains in `docs/wiki-uxdesign/*`.

## Pipeline
1. Preflight read (`12_instrucciones_agentes_ia.md` + relevant chapters)
2. Change classification
3. Delegation to specialized skill(s) if needed
4. Rule enforcement using `UX-RULE-*`
5. Close with explicit validation summary

## Delegate boundaries
### d3-viz
Can decide:
- D3 scales, geometry, interaction implementation details
Cannot decide:
- Product token palette, icon system, typography contract

### customizing-tauri-windows
Can decide:
- Window chrome mechanics, menu wiring, drag behavior
Cannot decide:
- Product visual identity and component style system

### ui-animation
Can decide:
- Motion timing/easing/accessibility/performance behavior
Cannot decide:
- Non-motion visual design baseline or iconography policy

## Required closeout
Every mixed or delegated change should include:
- `classification`
- `delegates_invoked`
- `ux_rules_checked`
- `conflicts_resolved`

