---
status: pending
priority: p2
issue_id: "048"
tags: [gsk-core, deprecation, legacy, 0.6.0, compatibility]
dependencies: ["044", "046", "047"]
---

# Hard Cut Legacy Compatibility in 0.6.0

## Problem Statement

Legacy compatibility paths (`<0.5.0`) should not remain indefinitely. The project needs an explicit removal task to avoid carrying legacy complexity long-term.

## Findings

- `0.5.x` keeps minimal compatibility for controlled transition.
- Core strategy is already established (`.gsk` public core-only).
- A breaking cut must be explicit, tested, and documented.

## Proposed Solutions

### Option 1: Single hard-cut release task for `0.6.0` (Recommended)

**Approach:** Remove legacy compatibility in one controlled release wave, with runtime + tests + docs updated together.

**Pros:**
- Cleans technical debt decisively.
- Simplifies import logic and support burden.
- Clarifies standard boundary for future integrations.

**Cons:**
- Breaking change by definition.
- Requires coordinated docs/test updates.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Execute in `0.6.0`:
1. remove legacy `<0.5.0` import compatibility paths,
2. remove temporary legacy metadata fallback paths,
3. update wiki/changelog to no-retrocompat policy,
4. enforce gate tests for contract and compatibility expectations.

## Technical Details

**Expected implementation targets:**
- `src/core/gschema/GskPackage.ts`
- `src/hooks/useGskFile.ts`
- related regression/strict tests
- `docs/wiki-gsk/02_formato.md`
- `docs/wiki-gsk/06_versionado_y_migraciones.md`
- `docs/wiki-gsk/CHANGELOG.md`

## Contract/Wiki Sync

- Mandatory full sync (runtime + wiki + tests) because this is a breaking compatibility change.

## Acceptance Criteria

- [ ] Legacy `<0.5.0` compatibility paths are removed.
- [ ] Runtime/tests/wiki are aligned with no-retrocompat policy.
- [ ] Breaking change is documented in changelog with migration guidance.
- [ ] Closing checklist completed:
- [ ] Skill `file-todos` applied (explicit confirmation in Work Log).
- [ ] Skill `gsk-engine-architect` applied (explicit confirmation in Work Log).
- [ ] Contract/Wiki Sync section updated with exact file refs.

## Work Log

### 2026-03-04 - Task created from 044 scope refinement

**By:** Codex

**Actions:**
- Created explicit post-`0.5.x` hard-cut task to avoid silent/implicit compatibility drift.
- Linked dependencies to minimum compatibility closure and wiki sync cycle.

**Learnings:**
- Declaring the breaking cut early reduces future ambiguity and rework.

