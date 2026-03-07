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

## Opening Criteria for the Next Phase

Do not open the execution phase until all of the following are true:

- the guided hard-cut route remains the accepted architecture strategy
- the hotspot order is accepted as the execution order
- the stable boundaries to preserve are explicit and non-negotiable during the cut
- no hidden dependency discovered in code review is strong enough to reorder the phases
- adjacent feature expansion in the affected runtime areas can be frozen while boundary cleanup runs

## Closing Statement

The project is no longer at the stage of asking what the systems are. It is at the stage of deciding how to separate them safely.

That decision is now explicit:

- preserve the real boundaries already present
- attack the mixed orchestration seams in the order established by the hotspot analysis
- open implementation only through a phased guided hard cut, not through an immediate aggressive cut
