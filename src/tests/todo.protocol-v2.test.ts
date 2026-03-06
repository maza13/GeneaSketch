import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const VALIDATE = path.resolve(REPO_ROOT, "tools/todos/validate.mjs");
const CLOSE = path.resolve(REPO_ROOT, "tools/todos/close.mjs");
const BRIEF = path.resolve(REPO_ROOT, "tools/todos/brief.mjs");
const PREPARE = path.resolve(REPO_ROOT, "tools/todos/prepare.mjs");
const NOTES_CLI = path.resolve(REPO_ROOT, "tools/notes/cli.mjs");

const tempDirs: string[] = [];

function makeRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "geneasketch-todo-v2-"));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, "todos"), { recursive: true });
  return dir;
}

function writeTodo(repo: string, name: string, content: string) {
  fs.writeFileSync(path.join(repo, "todos", name), content.trimStart(), "utf8");
}

function ensureNotesPromoteRuntime(repo: string) {
  fs.mkdirSync(path.join(repo, ".agents", "skills", "file-todos", "assets"), { recursive: true });
  fs.mkdirSync(path.join(repo, "tools", "todos"), { recursive: true });
  fs.copyFileSync(
    path.join(REPO_ROOT, ".agents", "skills", "file-todos", "assets", "todo-template.md"),
    path.join(repo, ".agents", "skills", "file-todos", "assets", "todo-template.md")
  );
  fs.copyFileSync(path.join(REPO_ROOT, "tools", "todos", "validate.mjs"), path.join(repo, "tools", "todos", "validate.mjs"));
  fs.copyFileSync(path.join(REPO_ROOT, "tools", "todos", "common.mjs"), path.join(repo, "tools", "todos", "common.mjs"));
}

function writeNote(repo: string, name: string, content: string) {
  fs.mkdirSync(path.join(repo, "notes", "entries"), { recursive: true });
  fs.writeFileSync(path.join(repo, "notes", "entries", name), content.trimStart(), "utf8");
}

function runNode(script: string, cwd: string, args: string[]) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8"
  });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("todo protocol v2", () => {
  it("rejects complete v2 tasks with unchecked acceptance criteria", () => {
    const repo = makeRepo();
    writeTodo(
      repo,
      "200-complete-p2-v2-leaf.md",
      `
---
protocol_version: 2
task_type: "leaf"
status: "complete"
priority: "p2"
issue_id: "200"
title: "v2 leaf"
tags: []
dependencies: []
child_tasks: []
related_tasks: []
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "s"
complexity: "standard"
auto_closure: true
commit_confirmed: true
commit_message: "x"
closed_at: "2026-03-06"
---

# V2 leaf

## Problem Statement

Test.

## Recommended Action

Do it.

## Acceptance Criteria

- [ ] Core result is implemented

## Work Log

### 2026-03-06 - Test
`
    );

    const result = runNode(VALIDATE, repo, ["--todo", "200"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("unchecked acceptance criteria");
  });

  it("refuses to close umbrellas with incomplete child tasks", () => {
    const repo = makeRepo();
    writeTodo(
      repo,
      "201-ready-p2-v2-umbrella.md",
      `
---
protocol_version: 2
task_type: "umbrella"
status: "ready"
priority: "p2"
issue_id: "201"
title: "umbrella"
tags: []
dependencies: []
child_tasks: ["202"]
related_tasks: ["203:context"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: false
commit_message: null
closed_at: null
---

# Umbrella

## Problem Statement

Test.

## Findings

None.

## Proposed Solutions

None.

## Recommended Action

Do it.

## Orchestration Guide

### Hard Dependencies

- none

### Child Execution Order

1. 202 - first

### Related Context

- 203:context because context

### Exit Rule

- close last

## Acceptance Criteria

- [x] Scope is clear

## Work Log

### 2026-03-06 - Test
`
    );
    writeTodo(
      repo,
      "202-ready-p2-child.md",
      `
---
protocol_version: 2
task_type: "leaf"
status: "ready"
priority: "p2"
issue_id: "202"
title: "child"
tags: []
dependencies: []
child_tasks: []
related_tasks: []
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "s"
complexity: "standard"
auto_closure: true
commit_confirmed: false
commit_message: null
closed_at: null
---

# Child

## Problem Statement

Test.

## Recommended Action

Do it.

## Acceptance Criteria

- [ ] Not complete yet

## Work Log

### 2026-03-06 - Test
`
    );
    writeTodo(
      repo,
      "203-complete-p2-context.md",
      `
---
status: "complete"
priority: "p2"
issue_id: "203"
title: "context"
tags: []
dependencies: []
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "low"
estimated_effort: "s"
complexity: "simple"
auto_closure: true
commit_confirmed: true
commit_message: "x"
closed_at: "2026-03-06"
---

# Context

## Problem Statement

Context.

## Acceptance Criteria

- [x] done

## Work Log

### 2026-03-06 - Test
`
    );

    const result = runNode(CLOSE, repo, ["--todo", "201", "--dry-run"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("child task '202' is not complete");
  });

  it("brief shows child order and related context", () => {
    const repo = makeRepo();
    writeTodo(
      repo,
      "204-pending-p2-v2-umbrella.md",
      `
---
protocol_version: 2
task_type: "umbrella"
status: "pending"
priority: "p2"
issue_id: "204"
title: "umbrella"
tags: []
dependencies: []
child_tasks: ["205", "206"]
related_tasks: ["207:precedent", "208:followup"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: false
commit_message: null
closed_at: null
---

# Umbrella

## Problem Statement

Test.

## Findings

None.

## Proposed Solutions

None.

## Recommended Action

Do it.

## Orchestration Guide

### Hard Dependencies

- none

### Child Execution Order

1. 205 - first
2. 206 - second

### Related Context

- 207:precedent because before
- 208:followup because later

### Exit Rule

- close last

## Acceptance Criteria

- [ ] Pending

## Work Log

### 2026-03-06 - Test
`
    );
    for (const id of ["205", "206", "207", "208"]) {
      writeTodo(
        repo,
        `${id}-${id === "207" ? "complete" : "pending"}-p2-${id}.md`,
        `
---
status: "${id === "207" ? "complete" : "pending"}"
priority: "p2"
issue_id: "${id}"
title: "${id}"
tags: []
dependencies: []
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "low"
estimated_effort: "s"
complexity: "simple"
auto_closure: ${id === "207" ? "true" : "false"}
commit_confirmed: ${id === "207" ? "true" : "false"}
commit_message: ${id === "207" ? "\"x\"" : "null"}
closed_at: ${id === "207" ? "\"2026-03-06\"" : "null"}
---

# ${id}

## Problem Statement

Test.

## Acceptance Criteria

- [x] done

## Work Log

### 2026-03-06 - Test
`
      );
    }

    const result = runNode(BRIEF, repo, ["--todo", "204"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("205: pending");
    expect(result.stdout).toContain("207: precedent");
    expect(result.stdout).toContain("Next child in order: 205");
  });

  it("prepare opens umbrella and activates only eligible children", () => {
    const repo = makeRepo();
    writeTodo(
      repo,
      "209-pending-p2-v2-umbrella.md",
      `
---
protocol_version: 2
task_type: "umbrella"
status: "pending"
priority: "p2"
issue_id: "209"
title: "umbrella"
tags: []
dependencies: []
child_tasks: ["210", "211"]
related_tasks: ["212:context"]
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "m"
complexity: "complex"
auto_closure: true
commit_confirmed: false
commit_message: null
closed_at: null
---

# Umbrella

## Problem Statement

Test.

## Findings

None.

## Proposed Solutions

None.

## Recommended Action

Do it.

## Orchestration Guide

### Hard Dependencies

- none

### Child Execution Order

1. 210 - first
2. 211 - second

### Related Context

- 212:context because context

### Exit Rule

- close last

## Acceptance Criteria

- [ ] Pending

## Work Log

### 2026-03-06 - Test
`
    );
    writeTodo(
      repo,
      "210-pending-p2-eligible.md",
      `
---
protocol_version: 2
task_type: "leaf"
status: "pending"
priority: "p2"
issue_id: "210"
title: "eligible"
tags: []
dependencies: []
child_tasks: []
related_tasks: []
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "s"
complexity: "standard"
auto_closure: true
commit_confirmed: false
commit_message: null
closed_at: null
---

# Eligible

## Problem Statement

Test.

## Recommended Action

Do it.

## Acceptance Criteria

- [ ] Pending

## Work Log

### 2026-03-06 - Test
`
    );
    writeTodo(
      repo,
      "211-pending-p2-blocked.md",
      `
---
protocol_version: 2
task_type: "leaf"
status: "pending"
priority: "p2"
issue_id: "211"
title: "blocked"
tags: []
dependencies: ["213"]
child_tasks: []
related_tasks: []
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "medium"
estimated_effort: "s"
complexity: "standard"
auto_closure: true
commit_confirmed: false
commit_message: null
closed_at: null
---

# Blocked

## Problem Statement

Test.

## Recommended Action

Do it.

## Acceptance Criteria

- [ ] Pending

## Work Log

### 2026-03-06 - Test
`
    );
    writeTodo(
      repo,
      "212-complete-p2-context.md",
      `
---
status: "complete"
priority: "p2"
issue_id: "212"
title: "context"
tags: []
dependencies: []
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "low"
estimated_effort: "s"
complexity: "simple"
auto_closure: true
commit_confirmed: true
commit_message: "x"
closed_at: "2026-03-06"
---

# Context

## Problem Statement

Test.

## Acceptance Criteria

- [x] done

## Work Log

### 2026-03-06 - Test
`
    );
    writeTodo(
      repo,
      "213-pending-p2-dep.md",
      `
---
status: "pending"
priority: "p2"
issue_id: "213"
title: "dep"
tags: []
dependencies: []
owner: "codex"
created_at: "2026-03-06"
updated_at: "2026-03-06"
target_date: null
risk_level: "low"
estimated_effort: "s"
complexity: "simple"
auto_closure: false
commit_confirmed: false
commit_message: null
closed_at: null
---

# Dep

## Problem Statement

Test.

## Acceptance Criteria

- [ ] pending

## Work Log

### 2026-03-06 - Test
`
    );

    const result = runNode(PREPARE, repo, ["--todo", "209"]);
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(repo, "todos", "209-ready-p2-v2-umbrella.md"))).toBe(true);
    expect(fs.existsSync(path.join(repo, "todos", "210-ready-p2-eligible.md"))).toBe(true);
    expect(fs.existsSync(path.join(repo, "todos", "211-pending-p2-blocked.md"))).toBe(true);
    expect(result.stdout).toContain("activated: 210");
    expect(result.stdout).toContain("blocked: 211");
  });

  it("notes:promote generates v2 umbrella todos from promotion blocks", () => {
    const repo = makeRepo();
    ensureNotesPromoteRuntime(repo);
    writeNote(
      repo,
      "N9000-note-architecture-test.md",
      `
---
note_id: "N9000"
kind: "note"
phase: "active"
active_state: "validated"
archive_reason: null
complexity: "complex"
connectivity: "interconnected"
horizon: "mid"
title: "Architecture promotion test"
source_type: "user_requested"
source_context: null
tags: ["architecture"]
related_notes: []
related_paths: []
related_todos: []
promoted_todos: []
relevance_score: 90
confidence: "high"
priority_hint: "p2"
effort_hint: "m"
created_at: "2026-03-06"
updated_at: "2026-03-06"
last_reviewed_at: null
review_after: null
---

## Context

Test context.

## Insight

Test insight.

## Proposed Actions

- Long prose that should not become child titles directly.

## Promotion Blocks

- System taxonomy baseline
- Dependency flow map

## Evolution Log

### 2026-03-06 - Created

- test note
`
    );

    const result = runNode(NOTES_CLI, repo, ["promote", "--note", "N9000", "--execute", "--confirm"]);
    expect(result.status).toBe(0);
    const umbrella = fs.readFileSync(path.join(repo, "todos", "001-pending-p2-architecture-promotion-test.md"), "utf8");
    const child = fs.readFileSync(path.join(repo, "todos", "002-pending-p2-system-taxonomy-baseline.md"), "utf8");
    expect(umbrella).toContain("protocol_version: 2");
    expect(umbrella).toContain('task_type: "umbrella"');
    expect(umbrella).toContain('child_tasks: ["002", "003"]');
    expect(child).toContain('task_type: "leaf"');
  });
});
