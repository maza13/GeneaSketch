---
status: complete
priority: p1
issue_id: "038"
tags: [governance, todos, hygiene, blockers]
dependencies: []
---

# Normalize Todo ID Collisions

## Problem Statement

The `todos/` backlog currently contains duplicated `issue_id` values, which breaks deterministic dependency tracking and blocks the new GSK core program.

## Findings

- Duplicate issue IDs exist in the current backlog:
  - `019` appears in two files.
  - `020` appears in two files.
  - `021` appears in two files.
- The `file-todos` workflow assumes a unique and monotonic issue index.
- The master program `039..047` depends on clean dependency resolution.

## Proposed Solutions

### Option 1: Surgical renumbering and dependency repair (Recommended)

**Approach:** Renumber duplicate files to new unique IDs, update frontmatter `issue_id`, and repair dependency references.

**Pros:**
- Restores deterministic planning.
- Keeps historical content and audit trail.
- Unblocks the entire initiative.

**Cons:**
- Requires careful dependency rewrite.
- Requires consistency check after rename.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Keep duplicates and add alias map

**Approach:** Keep duplicate IDs and maintain a manual mapping layer.

**Pros:**
- Minimal immediate edits.

**Cons:**
- Ongoing operational complexity.
- High risk of planning mistakes.
- Conflicts with `file-todos` conventions.

**Effort:** 30 minutes now, high recurring overhead

**Risk:** High

## Recommended Action

Execute Option 1 and treat this task as a hard blocker. Do not start any `039+` execution task until IDs and dependencies are unique.

## Technical Details

**Affected scope:**
- `todos/*.md` (duplicate IDs and dependency references)

**Expected outputs:**
- Unique `issue_id` values across all todo files.
- Filename prefixes and frontmatter IDs aligned.
- Dependency references updated to new IDs.

## Contract/Wiki Sync

- No direct `docs/wiki-gsk/*` edits expected.
- Update `039` master file with final renumber mapping and completion evidence.

## Acceptance Criteria

- [x] No duplicated `issue_id` values remain in `todos/`.
- [x] All renamed files preserve content and status.
- [x] All `dependencies` references point to valid, unique IDs.
- [x] `039` master task updated with normalization results.
- [x] Closing checklist completed:
- [x] Skill `file-todos` applied (explicit confirmation in Work Log).
- [x] Skill `gsk-engine-architect` applied OR justified as `N/A` (explicit).
- [x] Contract/Wiki Sync section updated.

## Work Log

### 2026-03-04 - Task creation

**By:** Codex

**Actions:**
- Created blocker task for backlog index normalization.
- Captured detected collisions and required outputs.

**Learnings:**
- Duplicate IDs directly reduce reliability of dependency-based execution.

### 2026-03-04 - Renumber execution and closure

**By:** Codex

**Actions:**
- Restored "real place" IDs:
  - `045 -> 019` (`gschema-name-inference`)
  - `046 -> 020` (`gschema-title-prefix-inference`)
  - `047 -> 021` (`gschema-date-place-coercion`)
- Renumbered all subsequent tasks sequentially:
  - `019 -> 022`, `020 -> 023`, `021 -> 024`, `022 -> 025`, `023 -> 026`, `024 -> 027`, `025 -> 028`, `026 -> 029`, `027 -> 030`, `028 -> 031`, `029 -> 032`, `030 -> 033`, `031 -> 034`, `032 -> 035`, `033 -> 036`, `034 -> 037`, `035 -> 038`, `036 -> 039`, `037 -> 040`, `038 -> 041`, `039 -> 042`, `040 -> 043`, `041 -> 044`, `042 -> 045`, `043 -> 046`, `044 -> 047`.
- Updated `issue_id` and `dependencies` for all `todos/*.md` according to mapping.
- Validation results:
  - `NO_DUPLICATE_IDS`
  - `FILENAME_FRONTMATTER_PARITY_OK`
  - `ALL_DEPENDENCIES_RESOLVE_UNIQUELY`

**Skill application:**
- Skill `file-todos` applied.
- Skill `gsk-engine-architect`: `N/A` (no changes under `src/core/gschema/**` or `docs/wiki-gsk/**`).

**Learnings:**
- Bulk deterministic renumbering is safer than ad-hoc per-file edits when dependency density is high.


