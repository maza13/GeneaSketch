# Guided Hard-Cut Secondary Plan

Generated: 2026-03-07
Task: `112`
Strategy consumed: `Option B - Guided Hard Cut` from `separation-options.md`

## Objective

Prepare the project for a future hard-cut execution phase by sequencing the architecture cleanup around the highest-risk orchestration knots first, while preserving the stable boundaries already observed in the current system.

This is a **secondary plan**, not an execution backlog. Its role is to define the structure, gates, dependencies, and opening criteria of a later implementation phase.

## Scope and Non-Goals

This plan is about architectural separation readiness. It is **not** yet the plan for:

- cloud infrastructure selection
- P2P transport or peer discovery
- external API connector implementation
- mobile app implementation
- shared-tree feature delivery
- turning phases into executable child TODOs

Those lines may become relevant later, but they should only influence this plan where they change present-day boundaries, invariants, or cleanup priorities.

## Guiding Principle

Do not cut by intuition. Clean the mixed orchestration seams first, preserve the stable boundaries, and only open a true hard-cut execution phase once the runtime has fewer ambiguous crossing points.

## Cross-Phase Invariants

The following rules apply across every phase and should be treated as non-negotiable unless a later explicit decision packet replaces them:

- preserve the already-valid boundaries: `GSchema Engine -> Read Model`, `Read Model -> Visual Engine`, `Workspace Profile`, and `Knowledge System`
- keep `.gsk` as a persistence/package boundary, not as the center of runtime orchestration
- reduce hidden cross-system writes; where possible, move toward journal-safe and auditable mutation paths
- keep external, imported, AI-produced, or future shared data on validated entry paths rather than allowing broad runtime re-entry shortcuts
- keep secrets, credentials, and local-only user metadata outside the shareable tree/package boundary
- maintain a clear distinction between shareable tree data and local/private workspace state whenever touched by cleanup
- avoid speculative abstractions for cloud, P2P, APIs, or mobile unless the current phase proves they change a real boundary

## Operating Artifacts

This plan should be operated with explicit artifacts, not only prose:

- **Base map**: the validated starting map from `108` in `master-system-map.md`
- **Live map**: the current architecture state after each phase-relevant change in `live-map.md`
- **Target map**: the intended post-cleanup reference shape in `target-map.md`
- **Consideration log**: a lightweight decision log for future-facing scenarios in `consideration-log.md`

The consideration log exists to classify scenarios such as cloud sync, P2P/local-first collaboration, external APIs, mobile shell expansion, and temporary-repository shared trees into one of three outcomes:

- changes the current plan
- does not change the current plan
- explicitly out of scope for this stage

This keeps future concerns visible without allowing them to silently expand the cleanup scope.

The operating model for maintaining those artifacts is defined in `live-map-operating-model.md`.

## Target Systems

Primary target systems for separation work:

- `App Shell`
- `State Manager`
- `GSK Package IO`
- `Read Model`
- `AI Assistant`

Supporting systems touched indirectly:

- `GSchema Engine`
- `Workspace Profile`
- `GEDCOM IO`

## Systems to Keep Stable During This Plan

These systems should remain operationally stable while the guided hard-cut preparation is executed:

- `Visual Engine`
- `Workspace Profile`
- `Knowledge System`
- core `GSchema Engine` invariants and package integrity behavior

## Temporary Freezes

Until the guided hard-cut preparation is complete, avoid:

- major `Visual Engine` rewrites
- new shell subsystems that deepen `App.tsx`
- broader AI write-path expansion
- read-model compatibility widening
- opportunistic runtime cleanups unrelated to the target hotspot chain
- premature sharing/cloud abstractions that bypass current runtime boundaries

## Phase Completion Standard

No phase should be considered complete based only on code movement. A phase closes only when it can produce:

- an updated live map that reflects the new boundary state
- an explicit statement of what boundary became clearer and what debt remains
- a rollback point clear enough to preserve if the next phase fails
- a decision on whether any reviewed future-facing consideration changes the plan or stays out of scope

## Phase Plan

### Phase 0 - Scope Freeze and Boundary Guardrails

#### Goal

Lock the intended architecture direction so follow-up implementation work does not reintroduce new coupling while cleanup is being prepared.

#### Main focus

- reaffirm the target systems and frozen systems
- prevent new runtime expansion inside the current hotspot loci
- treat `108-111` as the active architecture substrate
- define the operating artifacts for the plan: base map, live map, target map, and consideration log
- record which future-facing scenarios are current constraints versus deferred concerns
- capture the near/mid-term constraint that shared-tree support may later arrive through a temporary repository flow, without turning that into immediate feature scope

#### Required guardrails

- entity and operation identity should remain stable where cleanup touches them
- write paths should move toward auditable and reversible mutation surfaces
- local/private workspace state must stay distinguishable from future shareable tree state
- no credential or secret handling should leak into `.gsk`, workspace profile payloads, or ad hoc runtime bridges

#### Dependencies

- completed outputs from `108`, `109`, `110`, and `111`

#### Exit gates

- the project accepts the guided hard-cut route as the chosen architecture strategy
- no competing sequence remains unresolved
- stable boundaries to preserve are explicitly named in the final packet
- the plan has an explicit live-map operating model instead of relying only on the original diagnosis map
- reviewed future-facing scenarios have been classified in the consideration log
- shared-tree support is acknowledged as a real near/mid-term architectural constraint, but infrastructure choice remains deferred

### Phase 1 - Shell and File-Orchestration Untangling

#### Goal

Reduce orchestration concentration at the runtime edge before touching the deepest central knot.

#### Main focus

- reduce the central integration load of `App.tsx`
- split `useGskFile.ts` into:
  - package/file concerns
  - runtime hydration/orchestration concerns
- narrow the `GSK Package IO <-> Workspace Profile` coupling
- make it harder for future sharing/import flows to smuggle extra orchestration back into `App.tsx` or `useGskFile.ts`

#### Why this phase comes first

- it attacks `hotspot-001` and `hotspot-003`
- it creates cleaner seams before deeper state/engine/read-model refactors
- it lowers coordination pressure on every later phase

#### Dependencies

- Phase 0 complete

#### Exit gates

- `App.tsx` is no longer the dominant cross-system integration knot
- package IO concerns are more clearly separated from runtime hydration concerns
- workspace profile application is no longer embedded as a hidden package-side concern
- the resulting boundary is clean enough that future temporary-repository sharing could enter through a separate adapter flow rather than through file-package orchestration sprawl

### Phase 2 - State, Engine, and Read-Model Boundary Narrowing

#### Goal

Reduce the highest-leverage internal knot: `State Manager <-> GSchema Engine <-> Read Model`.

#### Main focus

- reduce mutation orchestration inside `docSlice`
- narrow where reprojection and expanded-graph refresh happen
- make read-side refresh behavior less entangled with write-side graph mutation
- preserve or improve the conditions needed for future audited import/apply flows, including shared-tree reconciliation and external-source application

#### Why this phase comes second

- this is the most important structural hotspot, but it should not be attacked while shell/file orchestration is still fully mixed
- Phase 1 lowers the blast radius for this work

#### Dependencies

- Phase 1 complete

#### Exit gates

- graph mutation flow is less coupled to immediate store-side projection refresh
- the store acts more as coordinator than as the place where graph semantics and reprojection are fused
- the read-model boundary is measurably clearer than at the start of `109`
- the write path is conceptually closer to something that future sharing, sync, or import features could reuse without routing through broad document reload patterns

### Phase 3 - AI Write-Bridge Narrowing

#### Goal

Preserve AI on the read side while reducing the heaviness of its write-back route.

#### Main focus

- keep AI reasoning on the projected document boundary
- reduce dependence on broad document reapplication where a narrower audited surface is possible
- preserve traceability and reversibility for AI-applied changes
- avoid creating a special-case AI mutation bridge that would later conflict with shared-tree, import, or sync mutation rules

#### Why this phase comes third

- AI currently depends on the same mixed runtime seams identified earlier
- cleaning those seams first makes it easier to narrow the AI write bridge without destabilizing the rest of the runtime

#### Dependencies

- Phase 2 complete

#### Exit gates

- AI read-side contract remains stable
- AI write-back no longer depends on the broadest available runtime path by default
- the mutation surface used by AI is conceptually narrower and easier to audit
- AI mutation behavior does not bypass the same trust and audit expectations that future external or shared changes would need to satisfy

### Phase 4 - Legacy Read-Model Fallback Retirement Preparation

#### Goal

Prepare the system to retire or isolate the legacy read-model fallback only after the upstream seams are cleaner.

#### Main focus

- isolate the compatibility responsibility around legacy projection
- move toward a single explicit mainline read-model entrypoint
- avoid carrying compatibility ambiguity inside the central selector boundary forever
- leave the read side clear enough that future platform shells or sharing surfaces do not inherit legacy ambiguity by default

#### Why this phase comes last

- the legacy fallback is real debt, but retiring it too early would stack risk on top of already-mixed orchestration
- once shell/file/state seams are cleaner, fallback retirement becomes more surgical and less destabilizing

#### Dependencies

- Phases 1 through 3 complete

#### Exit gates

- legacy fallback behavior is isolated or retired behind a narrower compatibility edge
- the main read-model boundary is singular and explicit enough to support a future hard cut
- the surviving read-model entrypoint is clear enough to support future adapters without reopening legacy branching in the center

## Dependency Order Summary

```text
Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4
```

Critical logic:

- Do not start Phase 2 before shell/file orchestration is cleaner.
- Do not narrow the AI write bridge before the state/engine/read-model knot is reduced.
- Do not retire the legacy read-model fallback before the upstream boundaries are cleaner.

## Rollback Concept

This plan assumes rollback at the **phase boundary**, not at arbitrary mid-refactor checkpoints.

Rollback principle:

- if a phase cannot satisfy its exit gates without destabilizing adjacent systems, stop and preserve the previous stable boundary state
- do not compensate for a failed phase by opening additional cuts elsewhere
- if a later phase fails, revert to the last phase whose gates were clearly satisfied

This keeps the plan robust even if execution later discovers hidden constraints.

## Signals That a Real Execution Phase Can Be Opened

The project is ready to open a true implementation phase only when:

- the guided hard-cut route remains the chosen strategy in the final diagnosis packet
- the hotspot order is accepted as the execution order
- stable boundaries to preserve are explicit and agreed
- no hidden dependency is strong enough to reorder the planned phases
- the project is willing to freeze adjacent expansion in the affected runtime areas while boundary cleanup runs
- the live-map operating model is active and maintained
- reviewed future-facing considerations have explicit dispositions instead of remaining implicit assumptions
- the near/mid-term need for shareable trees is covered by architectural guardrails, even though transport/infrastructure remains undecided

## Signals That the Project Is Not Ready Yet

Do **not** open a real hard-cut execution phase if:

- the team still wants to expand shell behavior inside `App.tsx`
- file loading/hydration logic is still expected to absorb new responsibilities
- AI write flows are growing while their runtime bridge remains broad
- legacy fallback retirement is being treated as a first move instead of a late move
- future-sharing concerns are being answered by speculative infrastructure work instead of boundary cleanup
- there is still no explicit distinction between shareable tree state and local/private workspace state

## What `113` Should Verify

The final diagnosis packet should confirm:

- that the guided hard-cut route remains the best strategic choice
- that the phase order above still matches the hotspot and audit evidence
- that the project is either:
  - `usable but structurally mixed`, or
  - `stable enough for phased separation`
- and under what exact conditions it becomes safe to open execution

## Notes

- This plan deliberately avoids turning phases into executable TODO children. That decision belongs to a later intentional planning pass.
- The plan is successful if it removes ambiguity from the next phase, not if it prescribes every implementation move in advance.
- The plan now assumes that future-facing ideas only matter when they change current architectural constraints. Visibility and decision hygiene are part of the plan, not optional documentation extras.
