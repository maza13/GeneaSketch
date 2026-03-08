# Read-Model Direct Contract (N0009 / TODO-086)

## Purpose
Define the minimum direct projection contract from `GenraphGraph` for `Person`, `Family`, and `Timeline` without relying on `genraphToDocument` in critical selectors.

## Scope
- In: `projectGraphDocument`, `selectPersons`, `selectFamilies`, `selectTimelineInput`, `selectSearchEntries`, `selectGraphStats`.
- Out: GED export pipeline, merge serialization, and non-selector legacy bridge usage.

## Runtime Mode
- `readModelMode: "direct" | "legacy"`
- Default: `direct`
- Rollback: `legacy` through central store flag.

## ID Rules
1. Prefer node `xref` when present.
2. Fallback to node `uid` when `xref` is absent.
3. Keep `xrefToUid` and `uidToXref` maps in projection output.

## Person Projection
Sources:
- Node type `Person`
- Preferred claims under `PersonPredicates.*`
- Parent/union links from edges

Required fields:
- `id`, `name`, `sex`, `lifeStatus`, `events`, `famc`, `fams`
- `birthDate`, `birthPlace`, `deathDate`, `deathPlace`, `residence` when available
- `names`, `surname*` canonicalized
- `noteRefs` and inline note mirror (`rawTags.NOTE`) when available
- `gschemaMeta?: { uid, source: "direct" }`

## Family Projection
Sources:
- Node type `Union`
- `Member` + `ParentChild` edges
- Preferred claims under `UnionPredicates.*`

Required fields:
- `id`, `husbandId`, `wifeId`, `childrenIds`, `events`
- `noteRefs` / `rawTags.NOTE` when available
- `gschemaMeta?: { uid, source: "direct" }`

## Timeline Projection
- Returns arrays derived from direct person/family projection.
- Must preserve parity for counts and relation traversals used by timeline panel.

## Fallback and Limits
- No automatic per-selector fallback.
- Rollback only via central mode switch (`readModelMode = legacy`).
- Unknown or missing claims degrade to existing defaults (no throw).

## Acceptance Mapping
- 086: Contract defined in this document.
- 087: Direct projection wired as default in selectors with central rollback switch.

