# Separation Sequence Options

Generated: 2026-03-07
Task: `111`
Inputs consumed:

- `master-system-map.md`
- `boundary-audit.md`
- `hotspots.json`

## Decision Frame

The current system does not need a generic refactor backlog. It needs a separation sequence that:

1. reduces the highest-risk orchestration knots first;
2. preserves already-stable boundaries;
3. avoids opening too many high-risk cuts at once;
4. keeps the future hard-cut path explicit instead of improvised.

## Decision Criteria

The three candidate sequences are compared against the current evidence using these criteria:

- `risk containment`: how well the sequence limits regression risk while structural work is underway.
- `hotspot coverage`: how directly it addresses the top hotspots from `110`.
- `architectural clarity gain`: how much structural clarity it creates by the end of the sequence.
- `execution realism`: how plausible it is given the current code concentration in `App.tsx`, `useGskFile.ts`, and `docSlice.ts`.
- `hard-cut readiness`: how well it prepares the project for a later explicit execution phase.

## Option A - Conservative Path

### What gets separated first

- isolate the heaviest shell orchestration in `App.tsx`
- split `useGskFile.ts` into cleaner shell-facing and IO-facing responsibilities

### What gets frozen

- no major renderer changes
- no new AI write-surface expansion
- no deeper engine/store contract changes during this option

### What gets deferred

- state-manager vs engine disentangling
- state-manager vs read-model cleanup
- legacy projection fallback retirement
- AI write-path narrowing

### Benefits

- lowest immediate regression pressure
- easiest to start
- quickly improves readability around the shell and file flows

### Risks

- leaves the `State Manager <-> GSchema Engine <-> Read Model` knot substantially alive
- postpones the highest structural leverage point
- can create a false sense of progress because the architecture becomes cleaner at the edges but not at the center

### Prerequisites

- current baseline and hotspot inventory only
- no additional architecture preconditions beyond existing outputs

### Why yes

- good if the team wants minimal disruption before a release hardening period

### Why no

- does not reduce the most important systemic hotspot cluster enough to justify the delay it introduces

### Assessment

- risk containment: `high`
- hotspot coverage: `medium-low`
- architectural clarity gain: `medium`
- execution realism: `high`
- hard-cut readiness: `medium-low`

## Option B - Guided Hard Cut

### What gets separated first

1. reduce orchestration concentration in `App.tsx`
2. split `useGskFile.ts` into clearer package IO vs runtime hydration responsibilities
3. narrow the `State Manager <-> GSchema Engine <-> Read Model` knot by reducing mutation/projection overlap
4. preserve AI read-side boundary while narrowing the write-back bridge
5. isolate and retire the legacy read-model fallback only after the prior boundaries are cleaner

### What gets frozen

- no renderer rewrite
- no new large shell subsystems that deepen `App.tsx`
- no expansion of AI write flows before the mutation boundary is narrowed

### What gets deferred

- optional provider-runtime cleanup beyond the current AI facade
- broader visualization experimentation
- any second-wave naming or docs cleanup not required for the boundary work

### Benefits

- addresses the highest-risk hotspots in dependency order
- preserves stable boundaries already observed in `108`
- turns the future hard cut into a prepared phase instead of a leap
- creates direct input for `112` without overcommitting to implementation detail yet

### Risks

- still requires coordinated refactor planning
- slower than an aggressive cut
- demands discipline to stop after boundary cleanup and not sprawl into opportunistic rewrites

### Prerequisites

- stable baseline from `108-110`
- willingness to sequence work around boundary cleanup before broader feature expansion in affected runtime areas

### Why yes

- this is the best fit for the actual hotspot profile:
  - `App.tsx` concentration is high-risk
  - `useGskFile.ts` is structurally mixed
  - the store/engine/read-model knot is the highest leverage internal cleanup
  - the legacy fallback should be retired, but not before the upstream seams are cleaner

### Why no

- it is not the fastest possible route if the sole objective were immediate simplification at any cost

### Assessment

- risk containment: `medium-high`
- hotspot coverage: `high`
- architectural clarity gain: `high`
- execution realism: `high`
- hard-cut readiness: `high`

## Option C - Aggressive Cut

### What gets separated first

- immediate disentangling of state manager, engine, and read model
- rapid retirement of the legacy projection fallback
- rapid narrowing or replacement of the AI write-back bridge
- simultaneous shell/file-flow cleanup

### What gets frozen

- most feature work in the affected runtime areas
- UI expansion
- any optional cleanup unrelated to separation

### What gets deferred

- almost nothing meaningful; this option tries to compress the architecture shift into one concentrated window

### Benefits

- fastest route to a cleaner target architecture
- minimizes time spent in transitional states if executed flawlessly

### Risks

- highest regression risk by far
- stacks too many `high` removal-difficulty edges in the same window
- current code concentration makes the blast radius too broad
- failure mode is expensive because rollback would be conceptually simple but operationally messy

### Prerequisites

- strong test and rollback discipline
- dedicated architecture execution window
- explicit willingness to absorb short-term delivery slowdown

### Why yes

- only makes sense if architecture separation becomes the dominant project priority and normal feature rhythm is intentionally paused

### Why no

- current evidence does not justify taking all high-risk cuts at once
- the present system is still too concentrated in a few orchestration loci for this to be the safest next move

### Assessment

- risk containment: `low`
- hotspot coverage: `high`
- architectural clarity gain: `high`
- execution realism: `medium-low`
- hard-cut readiness: `medium`

## Comparative Summary

| Option | Risk containment | Hotspot coverage | Clarity gain | Execution realism | Hard-cut readiness | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Conservative path | High | Medium-low | Medium | High | Medium-low | Too cautious for the current hotspot profile |
| Guided hard cut | Medium-high | High | High | High | High | Best balance |
| Aggressive cut | Low | High | High | Medium-low | Medium | Too risky for current concentration level |

## Recommended Sequence

### Recommendation

Choose **Option B - Guided Hard Cut**.

### Why it wins on current evidence

- It addresses the actual hotspot order revealed by `110`, instead of treating every cleanup as equal.
- It keeps the clean boundaries intact:
  - `GSchema Engine -> Read Model`
  - `Read Model -> Visual Engine`
  - `Workspace Profile`
  - `Knowledge System`
- It attacks the mixed areas in the right order:
  - shell concentration
  - file/hydration orchestration
  - state/engine/read-model knot
  - AI write bridge
  - legacy projection fallback
- It prepares a real hard cut later, but does not pretend the system is ready for an immediate aggressive cut now.

### What this means for `112`

`112` should not reopen the strategy debate. It should take Option B as fixed and formalize it into:

- phases
- gates
- dependencies
- temporary freezes
- readiness signals for opening a future execution phase

## Notes

- This recommendation is evidence-driven from `108-110`; it is not a commitment to immediate implementation.
- The aggressive route remains a theoretical option, but current runtime concentration makes it the wrong next move.
