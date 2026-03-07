# Live Map Operating Model

Generated: 2026-03-07
Execution phase: `116`

## Objective

Define how the architecture packet should stay operationally current once the guided hard-cut execution chain is underway.

The diagnosis packet is no longer enough as a one-time snapshot. From this point forward, the project should maintain:

- a **base map** of the validated starting state
- a **live map** of the current execution state
- a **target map** of the intended post-cleanup shape
- a **consideration log** for future-facing scenarios that may constrain boundaries without expanding scope

## Artifact Roles

### Base map

- Source of truth: `master-system-map.md`
- Role: preserve the validated pre-execution architecture state
- Mutation rule: do not rewrite it to reflect execution progress; it stays historical

### Live map

- Source of truth: `live-map.md`
- Role: describe the current architecture state reached by the execution chain
- Mutation rule: update it at the end of each completed phase with the real achieved boundary state

### Target map

- Source of truth: `target-map.md`
- Role: describe the intended post-cleanup reference shape after the current hard-cut chain
- Mutation rule: change only if a later explicit architecture decision changes the intended destination

### Consideration log

- Source of truth: `consideration-log.md`
- Role: classify future-facing scenarios so they remain visible without silently expanding implementation scope
- Mutation rule: append or update dispositions only when a scenario materially affects the current plan

## Required Live Map Update Cycle

Update `live-map.md` when any of the following happens:

- a phase closes successfully
- a planned boundary becomes clearer or measurably different from the base map
- a phase fails and execution reverts to the last valid boundary state

Each live-map update should include:

- current phase
- current overall execution status
- boundaries clarified in that phase
- debt intentionally left in place
- whether hotspot order or strategy changed

## Disallowed Drift

The following are not valid reasons to change the live map or target map casually:

- speculative cloud architecture
- speculative P2P transport design
- speculative mobile implementation details
- feature ideation that does not change current boundaries

If one of those concerns becomes relevant, record it in `consideration-log.md` first and then update the plan only if the scenario changes a present boundary or execution gate.

## Evidence Standard Per Phase

No phase should close without:

- updated `live-map.md`
- updated work log in the corresponding TODO
- verification notes or artifacts proving the phase exit gates were satisfied
- explicit statement that the chosen strategy and hotspot order either remained unchanged or were intentionally revised

## Rollback Rule

If a phase fails or reveals hidden coupling that invalidates its exit gates:

- restore the last valid boundary state
- reflect that state in `live-map.md`
- record the failure or reversion in the phase work log
- do not advance the chain by compensating elsewhere
