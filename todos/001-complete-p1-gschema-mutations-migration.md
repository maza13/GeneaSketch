status: complete

priority: p1
issue_id: "001"
tags: [gschema, engine, migration]
dependencies: []
---

# Migrate mutations to GSchemaGraph

Complete the transition from legacy `GeneaDocument` mutations to the new `GSchemaGraph` architecture.

## Problem Statement

While the GSchema engine is active in `DocSlice`, some mutations like `updatePerson` and `linkRelation` still operate primarily on the legacy `document` structure rather than using the `GSchemaGraph` as the primary source for state changes. This creates a split authority and risks data synchronization issues.

## Findings

- `DocSlice.ts` maintains both the legacy `document` and the new `gschema` graph.
- Projections from GSchema to the legacy format are working, but the reverse path (mutations) needs to be shifted to the Graph.
- Current progress: 60% of Phase 3 is completed.

## Proposed Solutions

### Phased Migration via GraphMutations.ts
Instead of migrating one-by-one inside `DocSlice`, introduce a dedicated translation layer (`GraphMutations`) that transforms UI intents into atomic Graph Operations, then projects the whole graph back to the legacy document.

**Effort:** 6-8 hours
**Risk:** Medium (requires atomic testing to avoid data corruption)

## Recommended Action

Execute the migration in 4 distinct phases (E1 to E4) as defined in `docs/TODO.md` and `implementation_plan_001.md`:
1. **E1:** Wiki Documentation (Doc Gate)
2. **E2:** Graph Mutations Layer Construction (`GraphMutations.ts` & Tests)
3. **E3:** DocSlice Integration (Refactor global Zustand actions)
4. **E4:** QA & Todo Cleanup (Deprecate old engine calls)

## Acceptance Criteria

- [ ] `04_operaciones.md` is updated to define the UI-Graph mutation flow.
- [ ] `GraphMutations.ts` exists and maps UI patches (`PersonPatch`, etc.) to `addClaim`/`addEdge`.
- [ ] `gschema.mutations.test.ts` validates that UI patches generate strictly monotonic `opSeq` operations in the Journal.
- [ ] `DocSlice` relies solely on `GraphMutations` to update the graph state, projecting it sequentially via `gschemaToDocument`.
- [ ] Legacy Engine mutation methods are marked as `@deprecated`.

## Work Log

### 2026-03-02 - Audit & Phased Planning

**By:** Antigravity

**Actions:**
- Identified this as the last remaining blocker for GSchema 0.4.0 parity.
- Drafted a detailed 4-phase implementation plan (`implementation_plan_001.md`).
- Integrated the new phases (E1-E4) into the master backlog (`docs/TODO.md`).
- Recommended introducing `GraphMutations.ts` as an explicit translation layer rather than mixing logic inside `DocSlice`.

