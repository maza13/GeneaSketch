---
status: complete
priority: p1
issue_id: "073"
title: "create-todo-validate-standard-enforcement"
owner: "codex"
created_at: "2026-03-04"
updated_at: "2026-03-04"
target_date: null
tags: [todos, validation, quality-gate, automation]
dependencies: []
risk_level: medium
estimated_effort: m
---

# Create TODO Validator for Standard Enforcement

Use an automated validator to reject TODO files that do not satisfy the current file-todos standard.

## Problem Statement

Today the project has TODO files with inconsistent metadata and section depth. The workflow needs an automatic gate that fails fast when a TODO does not comply with the agreed standard.

### Context

- Current behavior: TODO quality is enforced manually and inconsistently.
- Expected behavior: an executable validator checks all TODO files and fails on non-compliance.
- Where this appears (file/feature/runtime flow): `todos/`, developer workflow, CI/preflight checks.

### Why This Matters

- User or business impact: prevents planning drift and improves traceability.
- Technical impact (stability, maintainability, performance, security): raises consistency and reduces review overhead.
- Cost of not fixing now: new TODOs may keep diverging from the standard.

### Scope

**In scope**
- Create `tools/todos/validate.mjs`.
- Add `npm run todo:validate`.
- Validate filename, frontmatter, required sections, detail sub-sections, and dependency integrity.

**Out of scope**
- Bulk migration of all historical TODO files to pass the new standard.
- CI integration in this same task.

### Definition of Done (Narrative)

A validator exists, runs from npm scripts, reports actionable errors, and exits with non-zero code when any TODO breaks the standard.

## Findings

Existing TODO contracts and templates were expanded recently, but there is no active automated validator for this standard.

### Evidence Summary

- Commands/logs reviewed: repository scripts and TODO folder inventory.
- Files inspected: `package.json`, `todos/*.md`, file-todos skill/template.
- Reproduction status: reproducible.

### Root Cause Analysis

| Finding | Evidence | Impact | Confidence (Low/Med/High) |
|---|---|---|---|
| No active TODO validator for new standard | `package.json` missing `todo:validate` script | Allows non-compliant TODOs | High |
| Existing TODOs are heterogeneous | legacy files vary in frontmatter and sections | Hard to enforce consistency manually | High |

### Unknowns / Open Questions

- Whether strict mode should be required immediately in CI.

## Proposed Solutions

Present options with pros, cons, effort, and risk.

### Option 1: Build strict validator in one pass (Recommended)

**Approach:**
- Implement a Node script that parses all TODO files and validates full standard.
- Fail immediately with detailed error list.

**Pros:**
- Deterministic and machine-enforced quality gate.
- Easy to run locally and in CI later.

**Cons:**
- Existing legacy TODOs may fail until normalized.

**Effort:** M

**Risk:** Medium

**Dependencies / Preconditions:**
- Access to `todos/` and npm scripts.

**Rollback Plan:**
- Keep script but avoid blocking CI until migration is complete.

---

### Option 2: Advisory-only validator (non-blocking)

**Approach:**
- Run checks but never return non-zero exit code.

**Pros:**
- No immediate disruption.

**Cons:**
- Does not enforce standard; drift continues.

**Effort:** S

**Risk:** High

**Dependencies / Preconditions:**
- None.

**Rollback Plan:**
- Upgrade later to strict mode.

## Recommended Action

Use Option 1 and keep strict behavior by default.

### Decision

- Chosen option: Option 1
- Why this option wins: fulfills the requirement to reject non-compliant TODOs automatically.
- Trade-offs accepted: temporary failures on legacy tasks until they are normalized.

### Execution Plan

1. Create TODO validator script.
2. Add npm script `todo:validate`.
3. Execute validator and capture baseline failures.

### Status Plan

- Planned transition: `pending -> ready -> complete`
- Blockers to move into `ready`: none.

## Technical Details

Affected files and workflows:
- `tools/todos/validate.mjs`
- `package.json`

### Change Matrix

| Area | Change Type (add/update/remove) | Notes |
|---|---|---|
| tools/todos/validate.mjs | add | New strict validator |
| package.json | update | Add `todo:validate` script |

### Verification Plan

- Unit/integration/manual checks:
  - Run `npm run todo:validate`
- Commands to run:
  - `npm run todo:validate`

## Resources

Relevant references:
- `todos/` current dataset
- file-todos skill and template in `.agent/.agents`

## Acceptance Criteria

Testable checklist for completion.

### Functional

- [x] Validator script exists and scans all TODO files.
- [x] Validator fails (`exit 1`) when any TODO is non-compliant.
- [x] Output includes file-specific actionable errors.

### Quality Gates

- [x] Script is deterministic and documented in npm scripts.
- [x] No runtime exceptions on malformed TODO input.

### Documentation / Traceability

- [x] This TODO work log updated with commands and outcome.
- [x] Dependency impact reviewed.

## Mandatory Closure Checklist

Complete this block whenever closing a task/chapter/phase/subphase.

- [x] Acceptance criteria updated for this milestone
- [x] Work Log entry added for this milestone
- [x] Commit recommendation documented
- [ ] Commit created (mandatory)
- [ ] Commit reference recorded (hash or message)

## Work Log

### 2026-03-04 - Task created

**By:** Codex

**Status Transition:**
- from: n/a
- to: pending

**Milestone Closed:**
- [x] Task
- [ ] Chapter
- [ ] Phase
- [ ] Subphase

**Actions:**
- Created task entry for strict TODO validator implementation.

**Evidence:**
- Command: file creation via workspace tooling
- Result: `073` task created in `todos/`
- Artifacts/paths: `todos/073-pending-p1-create-todo-validate-standard-enforcement.md`

**Dependency Update:**
- Newly unblocked tasks: none
- Newly blocked tasks: none

**Commit Recommendation:**
- Scope size: Small
- Suggested strategy: Single commit
- Suggested commit message(s):
  - `chore: add todo 073 for strict todo validator`
- User decision on strategy:

**Commit Applied (Mandatory):**
- Hash:
- Message:

**Learnings:**
- Task is now tracked before implementation, matching file-todos governance.

**Next Recommendation:**
- Implement `tools/todos/validate.mjs` and wire `npm run todo:validate`.

### 2026-03-04 - Validator implemented and baseline captured

**By:** Codex

**Status Transition:**
- from: pending
- to: pending

**Milestone Closed:**
- [x] Task
- [ ] Chapter
- [ ] Phase
- [ ] Subphase

**Actions:**
- Added strict validator at `tools/todos/validate.mjs`.
- Added npm script `todo:validate` in `package.json`.
- Executed `npm run todo:validate` to verify automatic rejection behavior.

**Evidence:**
- Command: `npm run todo:validate`
- Result: fail as expected with non-compliant TODO report (`69/70` files, `540` issues).
- Artifacts/paths:
  - `tools/todos/validate.mjs`
  - `package.json`

**Dependency Update:**
- Newly unblocked tasks: none
- Newly blocked tasks: none

**Commit Recommendation:**
- Scope size: Small
- Suggested strategy: Single commit
- Suggested commit message(s):
  - `feat: add strict todo validator and npm todo:validate script`
- User decision on strategy:

**Commit Applied (Mandatory):**
- Hash:
- Message:

**Learnings:**
- Strict validator is working; historical TODO corpus now needs normalization to pass the new standard.

**Next Recommendation:**
- Create a follow-up migration plan to normalize legacy TODO files incrementally by batches.

### 2026-03-04 - Task closed after validator delivery

**By:** Codex

**Status Transition:**
- from: pending
- to: complete

**Milestone Closed:**
- [x] Task
- [ ] Chapter
- [ ] Phase
- [ ] Subphase

**Actions:**
- Closed the task after delivering validator script and npm wiring.
- Kept explicit note that commit execution is pending user decision.

**Evidence:**
- Command: `npm run todo:validate`
- Result: strict rejection behavior confirmed.
- Artifacts/paths:
  - `tools/todos/validate.mjs`
  - `package.json`
  - `todos/073-complete-p1-create-todo-validate-standard-enforcement.md`

**Dependency Update:**
- Newly unblocked tasks: standard migration and backlog normalization tasks can proceed with an active gate.
- Newly blocked tasks: none

**Commit Recommendation:**
- Scope size: Small
- Suggested strategy: Single commit
- Suggested commit message(s):
  - `feat: add strict todo validator and close todo 073`
- User decision on strategy: pending

**Commit Applied (Mandatory):**
- Hash: pending user commit
- Message: pending user commit

**Learnings:**
- Enforcing a stricter template requires an explicit migration phase for historical TODO files.

**Next Recommendation:**
- Open a dedicated TODO to migrate historical files by batches to pass `todo:validate`.

## Notes

Legacy TODOs are expected to fail strict validation until migration is completed.
