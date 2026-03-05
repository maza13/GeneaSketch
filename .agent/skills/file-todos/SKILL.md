---
name: file-todos
description: Manage file-based todo tracking in the `todos/` directory with end-to-end execution by default, automatic validation, and automatic close+commit flow. Use when creating, triaging, executing, reporting, or closing todo files, including `plan todo` requests.
disable-model-invocation: true
---

# File-Based Todo Tracking Skill

## Overview

The `todos/` directory is the project task tracker for findings, technical debt,
feature work, and execution planning.

Default behavior:
- Execute each TODO from start to finish.
- Do not leave partial work unless blocked by something external.
- Only request user intervention when strictly unavoidable.

## Core Principles

1. End-to-end execution first.
2. User action only when unavoidable and explicitly documented.
3. Prefer automation over manual closure steps.
4. Keep TODO content clear and pragmatic.
5. Add next-step recommendations at task closure, not at task creation.

## Activation Rules

- Strong trigger: user text contains `plan todo`.
- Also use for create/update/triage/status/recommend/close tasks in `todos/`.

## File Naming Convention

Todo files must use:

`{issue_id}-{status}-{priority}-{description}.md`

- `issue_id`: sequential, never reused (`001`, `002`, ...)
- `status`: `pending` | `ready` | `complete`
- `priority`: `p1` | `p2` | `p3`
- `description`: kebab-case summary

## File Structure

Use template: [todo-template.md](./assets/todo-template.md)

Required frontmatter fields (base):
- `status`, `priority`, `issue_id`

Recommended frontmatter fields:
- `title`, `tags`, `dependencies`, `owner`, `created_at`, `updated_at`
- `risk_level`, `estimated_effort`, `target_date`
- `complexity` (`simple` | `standard` | `complex`)
- `auto_closure`, `commit_confirmed`, `commit_message`, `closed_at`

Required sections (base):
- `## Problem Statement`
- `## Acceptance Criteria`
- `## Work Log`

Recommended sections:
- `## Findings`
- `## Proposed Solutions`
- `## Recommended Action`

## Adaptive Complexity Mode

The system must support both small and large tasks without forcing one style.

- `simple`: minimal operational task.
  - Required: Problem Statement, Acceptance Criteria, Work Log.
  - Recommended: concise Recommended Action.
- `standard` (default): normal engineering task.
  - Required: Problem Statement, Recommended Action, Acceptance Criteria, Work Log.
  - Recommended: Findings and Proposed Solutions.
- `complex`: architecture/migration/high-risk task.
  - Required: Problem Statement, Findings, Proposed Solutions, Recommended Action, Acceptance Criteria, Work Log.
  - Include dependency strategy and tradeoff rationale.

## End-to-End Execution Protocol

When a TODO is being executed:

1. Run implementation from start to finish in one flow whenever feasible.
2. Keep status progression aligned with real execution state.
3. Update Work Log during execution, not afterward.
4. Close task automatically with commit using `todo:close`.

## User Intervention Protocol (Explicit Only)

If user action is truly required:

1. Add/update `## User Action Required (Only if unavoidable)`.
2. List exactly:
- what the user must do,
- why automation cannot do it,
- what is blocked until it is done.
3. Keep task in `pending` or `ready` with a clear blocker note.

If no unavoidable blocker exists, do not delegate work to the user.

## PlanTodo Flow

When user requests `plan todo`:

1. Build phased plan.
2. Materialize umbrella + child TODO files immediately.
3. Set default status to `pending` unless user requests otherwise.
4. Wire dependencies explicitly.
5. Include initial Work Log entry.

## Validation and Quality Gate

Run base validation:

`npm run todo:validate`

Default behavior is scoped validation (changed or targeted TODO files), to avoid
historical debt blocking active execution.

For explicit scope:
- `npm run todo:validate -- --todo 074`
- `npm run todo:validate -- --files todos/074-pending-p2-example.md`

For full historical audit:
- `npm run todo:validate:all`

Validation rejects TODOs that break base contract (naming, identity/status sync,
core sections, dependency integrity, and cycle rules) for the selected scope.

## Automatic Close and Commit

Close tasks with automation:

`npm run todo:close -- --todo <issue_id_or_path> --files <path1,path2,...> [--summary "..."] [--message "..."]`

Behavior of `todo:close`:
- updates TODO status to `complete`
- renames file to `*-complete-*`
- updates timestamps and commit confirmation fields
- appends closing Work Log entry
- generates next-step recommendation using current dependency/project state
- stages provided files + TODO file
- creates commit automatically
- prints commit hash and message

## Common Workflows

### Create

1. Determine next ID.
2. Create file from template.
3. Fill problem, acceptance, and initial work log.
4. Add dependencies/tags.
5. Do not include next-step recommendation at creation time.

### Triage

1. Review `pending` tasks.
2. Move approved tasks to `ready`.
3. Keep blockers explicit.

### Execute

1. Implement changes.
2. Update Work Log with evidence.
3. Run `todo:validate` (scoped) on modified TODO files.
4. Run `todo:close` to complete + commit + final recommendation.

### Promote from Notes

When another system (for example notes/ideas tracker) promotes work into TODOs:

1. Read `file-todos` template from `./assets/todo-template.md`.
2. Create TODO files using this template as the base.
3. Validate only created/modified TODO files with scoped validation.
4. Keep traceability tags (for example `note:<id>`).

### Status / Recommendation Output

When asked for status/recommendations, provide:
- counts by status/priority
- blocked vs ready tasks
- top next tasks with rationale (impact, unlocks, effort/risk)

## Quick Commands

- Validate scoped: `npm run todo:validate -- --todo 073`
- Validate full backlog: `npm run todo:validate:all`
- Close + commit: `npm run todo:close -- --todo 073 --files package.json,tools/todos/validate.mjs,todos/073-complete-...`

## Key Distinctions

- File-todos: persistent project task tracking in markdown.
- TodoWrite: temporary session tracking only.
