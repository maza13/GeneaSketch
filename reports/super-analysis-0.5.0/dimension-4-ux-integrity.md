# Dimension 4: UX integrity and interconnection

Status: `needs-followup`

## Scope

- Person workspace evidence/citation behavior under the current read model.
- Wiki internal navigation under current strict assumptions.
- Workspace profile hydration order and flicker risk.

## Evidence

- Command:
  - `npx vitest run src/tests/wiki.panel-navigation.unit.test.ts src/tests/workspace-profile.integration.test.ts src/tests/workspace-profile.service.test.ts src/tests/person-events-binding.test.ts src/tests/person-family-links-binding.test.ts src/tests/gedcom.person-records-extended.test.ts`
- Result:
  - `6` files
  - `21` tests passed

## Journey matrix

| Journey | Status | Evidence |
| --- | --- | --- |
| Wiki relative links, cross-wiki links, anchors | pass | `src/tests/wiki.panel-navigation.unit.test.ts` |
| Workspace profile precedence and legacy dtree normalization | pass | `src/tests/workspace-profile.integration.test.ts`, `src/tests/workspace-profile.service.test.ts` |
| Person event source refs and note refs persistence contract | pass | `src/tests/gedcom.person-records-extended.test.ts`, `src/tests/person-events-binding.test.ts` |
| Person workspace visibility of structured claim citations/evidence metadata | needs-followup | code audit only |
| Theme/layout flicker on open | needs-followup | code audit only |

## Findings

### 1. Person workspace does not expose structured claim evidence as a first-class UI surface

- Severity: `medium`
- Confidence: `high`
- Release impact: `0.5.0-postship`
- Affected paths:
  - `src/ui/PersonWorkspacePanel.tsx`
  - `src/ui/person/sections/PersonSourcesSection.tsx`
  - `src/ui/person/sections/PersonEventsSection.tsx`
  - `src/core/read-model/directProjection.ts`
  - `src/core/gschema/GedcomBridge.ts`

What is true now:

- The read model does preserve claim citations into event-level `sourceRefs`.
- `PersonEventsSection` exposes `sourceRefs`, `noteRefs`, and `notesInline` for each event.
- `PersonSourcesSection` only edits `person.sourceRefs`.

Gap:

- Structured claim metadata such as `evidenceGate`, citation confidence, and citation transcription is flattened before reaching the UI.
- There is no first-class screen for reviewing claims/citations as claims; the workspace only shows projected legacy-compatible refs.

Conclusion:

- Basic evidence visibility survives through event `sourceRefs`.
- Full “citations and evidence” UX under the new claim model is not implemented as an explicit product surface.

### 2. Wiki navigation is release-safe under the current strict mode assumptions

- Severity: `low`
- Confidence: `high`
- Release impact: `0.5.0-postship`
- Affected paths:
  - `src/ui/WikiPanel.tsx`
  - `src/tests/wiki.panel-navigation.unit.test.ts`

Observed:

- Relative links resolve inside the same tab.
- Cross-wiki links resolve to the right tab.
- Hash-only and file-plus-hash anchors normalize correctly.
- Missing links fail closed with `null`.

Conclusion:

- No strict-mode regression was reproduced in the audited wiki path.

### 3. Workspace profile hydration is logically correct but still happens in two phases

- Severity: `medium`
- Confidence: `high`
- Release impact: `0.5.0-postship`
- Affected paths:
  - `src/hooks/useGskFile.ts`
  - `src/state/slices/docSlice.ts`
  - `src/tests/workspace-profile.integration.test.ts`

Observed:

- `loadGraph()` computes `viewConfig`, `selectedPersonId`, and `expandedGraph` immediately.
- `applyLoadedPayload()` then awaits `WorkspaceProfileService.load(graphId)` and applies hydrated `viewConfig`, `visualConfig`, and `expandedGraph` afterward.
- Precedence rules are covered and currently correct.

Risk:

- This ordering can briefly render default state before hydrated profile state on real app load.
- There is no automated visual assertion proving absence of flicker.

Conclusion:

- Functional correctness is covered.
- Visual no-flicker cannot be claimed yet; the risk is architectural, not proven as a user-visible bug in this audit.

## Release call for this dimension

- `wiki`: pass
- `workspace hydration`: pass with observability gap
- `person evidence/citations`: partial pass with UX-model gap

Overall status: `needs-followup`

