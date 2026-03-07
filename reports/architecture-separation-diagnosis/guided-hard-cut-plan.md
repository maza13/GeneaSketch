# Guided Hard-Cut Secondary Plan

Generated: 2026-03-07
Task: `112`
Strategy consumed: `Option B - Guided Hard Cut` from `separation-options.md`

## Objective

Prepare the project for a future hard-cut execution phase by sequencing the architecture cleanup around the highest-risk orchestration knots first, while preserving the stable boundaries already observed in the current system.

This is a **secondary plan**, not an execution backlog. Its role is to define the structure, gates, dependencies, and opening criteria of a later implementation phase.

## Guiding Principle

Do not cut by intuition. Clean the mixed orchestration seams first, preserve the stable boundaries, and only open a true hard-cut execution phase once the runtime has fewer ambiguous crossing points.

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

## Phase Plan

### Phase 0 - Scope Freeze and Boundary Guardrails

#### Goal

Lock the intended architecture direction so follow-up implementation work does not reintroduce new coupling while cleanup is being prepared.

#### Main focus

- reaffirm the target systems and frozen systems
- prevent new runtime expansion inside the current hotspot loci
- treat `108-111` as the active architecture substrate

#### Dependencies

- completed outputs from `108`, `109`, `110`, and `111`

#### Exit gates

- the project accepts the guided hard-cut route as the chosen architecture strategy
- no competing sequence remains unresolved
- stable boundaries to preserve are explicitly named in the final packet

### Phase 1 - Shell and File-Orchestration Untangling

#### Goal

Reduce orchestration concentration at the runtime edge before touching the deepest central knot.

#### Main focus

- reduce the central integration load of `App.tsx`
- split `useGskFile.ts` into:
  - package/file concerns
  - runtime hydration/orchestration concerns
- narrow the `GSK Package IO <-> Workspace Profile` coupling

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

### Phase 2 - State, Engine, and Read-Model Boundary Narrowing

#### Goal

Reduce the highest-leverage internal knot: `State Manager <-> GSchema Engine <-> Read Model`.

#### Main focus

- reduce mutation orchestration inside `docSlice`
- narrow where reprojection and expanded-graph refresh happen
- make read-side refresh behavior less entangled with write-side graph mutation

#### Why this phase comes second

- this is the most important structural hotspot, but it should not be attacked while shell/file orchestration is still fully mixed
- Phase 1 lowers the blast radius for this work

#### Dependencies

- Phase 1 complete

#### Exit gates

- graph mutation flow is less coupled to immediate store-side projection refresh
- the store acts more as coordinator than as the place where graph semantics and reprojection are fused
- the read-model boundary is measurably clearer than at the start of `109`

### Phase 3 - AI Write-Bridge Narrowing

#### Goal

Preserve AI on the read side while reducing the heaviness of its write-back route.

#### Main focus

- keep AI reasoning on the projected document boundary
- reduce dependence on broad document reapplication where a narrower audited surface is possible
- preserve traceability and reversibility for AI-applied changes

#### Why this phase comes third

- AI currently depends on the same mixed runtime seams identified earlier
- cleaning those seams first makes it easier to narrow the AI write bridge without destabilizing the rest of the runtime

#### Dependencies

- Phase 2 complete

#### Exit gates

- AI read-side contract remains stable
- AI write-back no longer depends on the broadest available runtime path by default
- the mutation surface used by AI is conceptually narrower and easier to audit

### Phase 4 - Legacy Read-Model Fallback Retirement Preparation

#### Goal

Prepare the system to retire or isolate the legacy read-model fallback only after the upstream seams are cleaner.

#### Main focus

- isolate the compatibility responsibility around legacy projection
- move toward a single explicit mainline read-model entrypoint
- avoid carrying compatibility ambiguity inside the central selector boundary forever

#### Why this phase comes last

- the legacy fallback is real debt, but retiring it too early would stack risk on top of already-mixed orchestration
- once shell/file/state seams are cleaner, fallback retirement becomes more surgical and less destabilizing

#### Dependencies

- Phases 1 through 3 complete

#### Exit gates

- legacy fallback behavior is isolated or retired behind a narrower compatibility edge
- the main read-model boundary is singular and explicit enough to support a future hard cut

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

## Signals That the Project Is Not Ready Yet

Do **not** open a real hard-cut execution phase if:

- the team still wants to expand shell behavior inside `App.tsx`
- file loading/hydration logic is still expected to absorb new responsibilities
- AI write flows are growing while their runtime bridge remains broad
- legacy fallback retirement is being treated as a first move instead of a late move

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
