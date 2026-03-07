# Target Architecture Map

Generated: 2026-03-07
Execution phase baseline: `116`

## Objective

Describe the intended destination of the current guided hard-cut chain without overspecifying future infrastructure.

## Intended Post-Cleanup Shape

### Preserved boundaries

These boundaries should remain clear and protected:

- `GSchema Engine -> Read Model`
- `Read Model -> Visual Engine`
- `Workspace Profile` as local/private preference state outside `.gsk`
- `Knowledge System` as a separate documentation surface

### Runtime-edge target shape

- `App Shell` should stop acting as the dominant cross-system integration knot
- file/package handling should be distinguishable from runtime hydration and shell orchestration
- `Workspace Profile` should remain a runtime-local boundary, not a package-side side effect

### Core-runtime target shape

- `State Manager` should act primarily as coordinator rather than as fused mutation/projection locus
- graph mutation and read refresh behavior should be less structurally entangled
- the write path should be narrower, more auditable, and reusable by future validated apply flows

### AI target shape

- AI should continue reasoning on the read-model boundary
- AI write-back should use a narrower and auditable mutation/application surface
- AI should not remain a structural exception relative to future external or shared mutation flows

### Read-model target shape

- the main read-model entrypoint should be singular and explicit
- compatibility behavior should be isolated behind a narrower edge or retired

## Explicit Non-Goals of This Target Map

This target map does not define:

- cloud backend architecture
- P2P topology
- mobile app architecture
- external API connector implementation
- full shared-tree product design

Those concerns only matter here if they change present cleanup boundaries or invariants.
