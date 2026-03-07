# Executive Summary

Generated: 2026-03-07
Task: `113`

## Final Verdict

Current architecture condition: `stable enough for phased separation`.

Supporting verdict:

- the system is still `usable but structurally mixed`
- it is **not** safe for an immediate aggressive hard cut
- it **is** safe to open a later execution phase if the guided hard-cut sequence and its gates are respected

## What the Diagnosis Confirms

The baseline architecture defined upstream remains valid. The project already has real system boundaries worth preserving, but several runtime loci still behave as mixed orchestration bridges instead of clean boundaries.

The evidence from `108` through `112` converges on one conclusion:

- the architecture does not need a new taxonomy pass
- it does need a disciplined separation sequence that removes the highest-risk integration knots before any deeper cut is attempted
- it also needs plan-governance discipline so later decisions do not quietly reintroduce scope drift

## Top Hotspots

1. `App.tsx` remains the dominant orchestration knot across shell, state, file flow, AI, and profile concerns.
2. `docSlice.ts` and adjacent store/runtime wiring keep `State Manager`, `GSchema Engine`, and `Read Model` too tightly coupled.
3. `useGskFile.ts` mixes package IO, runtime hydration, profile application, and merge preparation in one runtime seam.
4. AI write-back still re-enters through a heavier bridge than the desired long-term mutation surface.
5. Legacy fallback logic still sits too close to the central read-model entrypoint.

## Boundaries to Preserve

These boundaries are already strong enough to preserve during separation work:

- `GSchema Engine -> Read Model`
- `Read Model -> Visual Engine`
- `Workspace Profile` as a local preference boundary outside `.gsk`
- `Knowledge System` as a separate documentation/knowledge surface

## Bridges to Remove or Encapsulate

These bridges are the main structural debt to reduce:

- `App Shell -> State Manager -> runtime orchestration` concentrated in `src/App.tsx`
- `GSK Package IO -> Workspace Profile -> runtime hydration` concentrated in `src/hooks/useGskFile.ts`
- `State Manager <-> GSchema Engine <-> Read Model` concentrated in `src/state/slices/docSlice.ts`
- `AI Assistant -> broad document reapplication bridge`
- `Read Model -> legacy fallback switch` inside the central selector path

## Recommended Sequence

Recommended architecture strategy: `Guided Hard Cut`.

Recommended order:

1. reduce shell orchestration concentration in `App.tsx`
2. split package IO from runtime hydration/profile application in `useGskFile.ts`
3. narrow the `State Manager <-> GSchema Engine <-> Read Model` knot
4. preserve AI on the read side while narrowing the write-back bridge
5. isolate or retire the legacy read-model fallback last

This sequence wins because it addresses the highest-risk hotspots in dependency order without stacking too many high-risk cuts into one window.

## Residual Plan Weaknesses That Had To Be Closed

The original packet already had the right hotspot order, but it still left several plan-level weaknesses under-specified:

- it assumed the diagnosis map alone would be enough, without defining a live-map operating model during later phases
- it did not yet separate present architectural constraints from speculative future implementation lines clearly enough
- it did not state strongly enough that local/private workspace state must remain distinct from future shareable tree state
- it did not yet formalize that external, imported, AI-produced, or future shared changes should converge toward validated and auditable entry paths

Those are not reasons to change the chosen sequence. They are reasons to strengthen phase 0 and the cross-phase invariants of the plan.

## Refined Guardrails

The hard-cut route is only solid if the following remain explicit:

- `.gsk` stays a persistence boundary rather than a runtime orchestration center
- already-valid boundaries remain protected during cleanup
- future concerns such as cloud, P2P, external APIs, mobile shells, or temporary-repository shared trees only affect the plan where they change current boundaries
- secrets, credentials, and local-only metadata stay outside the future shareable-tree/package boundary
- future sharing readiness is treated as a near/mid-term architectural constraint, but transport and infrastructure remain deferred decisions

## Phase 0 Operationalization

Phase 0 of the execution chain now has concrete operating artifacts:

- `live-map-operating-model.md`
- `live-map.md`
- `target-map.md`
- `consideration-log.md`

Those artifacts convert the refined guardrails into execution prerequisites instead of leaving them only as prose expectations inside the plan.

## Opening Criteria for the Next Phase

Do not open the execution phase until all of the following are true:

- the guided hard-cut route remains the accepted architecture strategy
- the hotspot order is accepted as the execution order
- the stable boundaries to preserve are explicit and non-negotiable during the cut
- no hidden dependency discovered in code review is strong enough to reorder the phases
- adjacent feature expansion in the affected runtime areas can be frozen while boundary cleanup runs
- a live-map operating model is active instead of relying only on the one-time diagnosis map
- future-facing considerations have explicit dispositions rather than remaining implicit assumptions
- the distinction between shareable tree state and local/private workspace state is preserved wherever cleanup touches those boundaries

## Closing Statement

The project is no longer at the stage of asking what the systems are. It is at the stage of deciding how to separate them safely.

That decision is now explicit:

- preserve the real boundaries already present
- attack the mixed orchestration seams in the order established by the hotspot analysis
- strengthen the plan with explicit invariants, live artifacts, and scope discipline
- open implementation only through a phased guided hard cut, not through an immediate aggressive cut
