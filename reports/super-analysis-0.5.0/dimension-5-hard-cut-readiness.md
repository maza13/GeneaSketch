# Super Analysis 0.5.0 - Dimension 5 Hard-cut 0.6.0 readiness

## Summary

This audit inventories non-test legacy dependencies related to `GedcomBridge` and the central read-model selector boundary. The result is decision-complete enough to refine the 0.6.0 hard cut without guessing.

## Key finding

The repo is not blocked by broad legacy import/export sprawl. The real 0.6.0 blockers are concentrated in two areas:

1. `src/core/read-model/selectors.ts` still imports `gschemaToDocument` as the legacy fallback path.
2. Several UI/application flows still convert `GraphDocument -> GSchemaGraph` through `documentToGSchema` instead of staying graph-native end to end.

## Classification matrix

| Path | Current dependency | Classification | Can replace now | Replacement / target state | Priority | Release impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/core/read-model/selectors.ts` | `gschemaToDocument` | removable debt / hard-cut blocker | yes | remove legacy fallback after direct projection parity fix; depend only on `buildDirectDocument` | p1 | 0.6.0-hardcut |
| `src/hooks/useGskFile.ts` | `documentToGSchema`, `gschemaToDocument` | mixed boundary: import/export legit + UI bridge debt | partial | keep file import/export conversion; replace branch extraction and merge/apply document loops with graph-native APIs where feasible | p1 | 0.6.0-hardcut |
| `src/App.tsx` | `documentToGSchema` | temporary UI bridge | yes | route diagnostics/mock/merge apply through graph-native mutation/load helpers instead of document re-projection in app shell | p2 | 0.6.0-hardcut |
| `src/state/slices/docSlice.ts` | `documentToGSchema` | temporary UI/state bridge | yes | move remaining doc-originating flows to graph-native creation/update APIs; keep projection only at read boundary | p1 | 0.6.0-hardcut |
| `src/ui/MockToolsPanel.tsx` | `documentToGSchema` | removable tooling debt | yes | generate `GSchemaGraph` directly or route through a dedicated mock graph builder | p3 | 0.5.x-postship |
| `src/core/gschema/LegacyMigrator.ts` | `documentToGSchema`, `gschemaToDocument` | legitimate migration boundary | no immediate | keep through 0.5.x and review separately during 0.6.0 migration policy decision | p2 | keep / explicit policy |
| `src/core/gschema/GraphMutations.ts` | `parseGedDate` from `GedcomBridge` | removable utility coupling | yes | extract date parsing utility to neutral module and remove bridge import | p2 | 0.6.0-hardcut |
| `src/core/gschema/index.ts` | re-export of `GedcomBridge` | public boundary / review required | maybe later | keep only if import/export bridge remains part of public core API; otherwise narrow exports in 0.6.0 | p3 | policy decision |

## Interpretation

### Legitimate boundaries to keep under explicit policy

- `src/hooks/useGskFile.ts` for file import/export conversion remains legitimate in 0.5.x.
- `src/core/gschema/LegacyMigrator.ts` is explicitly a migration boundary and should not be removed accidentally with UI-focused legacy cleanup.

### Temporary bridges that should be removed before or during 0.6.0

- `src/App.tsx`
- `src/state/slices/docSlice.ts`
- `src/ui/MockToolsPanel.tsx`
- `src/core/gschema/GraphMutations.ts`

These do not represent file-format boundaries; they exist because parts of the app still bounce through `GeneaDocument` during product flows.

### Blockers already evidenced by other analysis work

- `src/core/read-model/selectors.ts` is the clearest hard-cut blocker because it still contains the central legacy fallback.
- Dimension 2 parity audit already proved a high-severity direct-vs-legacy mismatch when IDs are synthesized differently in fallback vs direct mode.

## Explicit blockers linked to follow-up work

- Blocker A: central legacy fallback in `src/core/read-model/selectors.ts`
  - linked follow-up: TODO `091` findings (`read-model parity`)
  - linked hard-cut umbrella: TODO `048`
- Blocker B: remaining app/state bridges through `documentToGSchema`
  - linked follow-up: TODO `048`
- Blocker C: utility-level coupling in `src/core/gschema/GraphMutations.ts`
  - linked follow-up: TODO `048`

## Recommendation

Refine TODO `048` into a staged 0.6.0 execution sequence:

1. remove legacy fallback from `selectors.ts` only after parity fix,
2. replace app/state document-to-graph bridges with graph-native helpers,
3. extract neutral utilities from `GedcomBridge` (for example GED date parsing),
4. then decide whether `LegacyMigrator` and `GedcomBridge` remain as explicit import/export-only boundaries.

## Conclusion

The hard cut is feasible, but not as a single blind deletion. The dependency inventory shows a small set of concentrated blockers rather than widespread legacy entanglement. The most important precondition is fixing the direct/legacy parity gap uncovered in dimension 2.
