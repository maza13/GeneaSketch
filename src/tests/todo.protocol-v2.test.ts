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

function writeFile(repo: string, relPath: string, content: string) {
  const fullPath = path.join(repo, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
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

function runNodeWithEnv(script: string, cwd: string, args: string[], env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env
    }
  });
}

function runGit(cwd: string, args: string[]) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8"
  });
}

function initGitRepo(repo: string) {
  expect(runGit(repo, ["init"]).status).toBe(0);
  expect(runGit(repo, ["config", "user.name", "Test User"]).status).toBe(0);
  expect(runGit(repo, ["config", "user.email", "test@example.com"]).status).toBe(0);
  writeFile(repo, ".gitignore", "ignored-output/\n");
  writeFile(repo, "README.md", "seed\n");
  expect(runGit(repo, ["add", "."]).status).toBe(0);
  expect(runGit(repo, ["commit", "-m", "init"]).status).toBe(0);
}

function writeClosableTodo(repo: string, name = "300-ready-p2-close-target.md") {
  writeTodo(
    repo,
    name,
    `
---
protocol_version: 2
task_type: "leaf"
status: "ready"
priority: "p2"
issue_id: "300"
title: "close target"
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
auto_closure: false
commit_confirmed: false
commit_message: null
closed_at: null
---

# Close target

## Problem Statement

Test.

## Recommended Action

Close it.

## Acceptance Criteria

- [x] Ready to close

## Work Log

### 2026-03-06 - Test
`
  );
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
    initGitRepo(repo);
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

    expect(runGit(repo, ["add", "."]).status).toBe(0);
    expect(runGit(repo, ["commit", "-m", "seed prepare fixtures"]).status).toBe(0);

    const result = runNode(PREPARE, repo, ["--todo", "209"]);
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(repo, "todos", "209-ready-p2-v2-umbrella.md"))).toBe(true);
    expect(fs.existsSync(path.join(repo, "todos", "210-ready-p2-eligible.md"))).toBe(true);
    expect(fs.existsSync(path.join(repo, "todos", "211-pending-p2-blocked.md"))).toBe(true);
    expect(result.stdout).toContain("activated: 210");
    expect(result.stdout).toContain("blocked: 211");
    expect(runGit(repo, ["rev-list", "--count", "HEAD"]).stdout.trim()).toBe("3");
  });

  it("notes:promote generates v2 umbrella todos from promotion blocks", () => {
    const repo = makeRepo();
    initGitRepo(repo);
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
    expect(runGit(repo, ["rev-list", "--count", "HEAD"]).stdout.trim()).toBe("2");
  });

  it("notes:new creates note, registry, and commit automatically", () => {
    const repo = makeRepo();
    initGitRepo(repo);

    const result = runNode(NOTES_CLI, repo, ["new", "--kind", "note", "--title", "Nueva nota de prueba"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("CREATED N0001");
    expect(fs.existsSync(path.join(repo, "notes", "entries", "N0001-note-nueva-nota-de-prueba.md"))).toBe(true);
    expect(fs.existsSync(path.join(repo, "notes", "index", "registry.json"))).toBe(true);
    expect(runGit(repo, ["rev-list", "--count", "HEAD"]).stdout.trim()).toBe("2");
  });

  it("notes:update renames note slug and commits automatically", () => {
    const repo = makeRepo();
    initGitRepo(repo);
    const create = runNode(NOTES_CLI, repo, ["new", "--kind", "note", "--title", "Nota base"]);
    expect(create.status).toBe(0);

    const update = runNode(NOTES_CLI, repo, ["update", "--note", "N0001", "--title", "Nota base renombrada"]);
    expect(update.status).toBe(0);
    expect(fs.existsSync(path.join(repo, "notes", "entries", "N0001-note-nota-base-renombrada.md"))).toBe(true);
    expect(fs.existsSync(path.join(repo, "notes", "entries", "N0001-note-nota-base.md"))).toBe(false);
    expect(runGit(repo, ["rev-list", "--count", "HEAD"]).stdout.trim()).toBe("3");
  });

  it("notes:update rolls back on simulated commit failure", () => {
    const repo = makeRepo();
    initGitRepo(repo);
    const create = runNode(NOTES_CLI, repo, ["new", "--kind", "note", "--title", "Nota rollback"]);
    expect(create.status).toBe(0);

    const update = runNodeWithEnv(
      NOTES_CLI,
      repo,
      ["update", "--note", "N0001", "--title", "Nota rollback fallida"],
      { NOTES_GIT_TX_SIMULATE_COMMIT_FAILURE: "1" }
    );
    expect(update.status).not.toBe(0);
    expect(update.stderr).toContain("commit_failed");
    expect(fs.existsSync(path.join(repo, "notes", "entries", "N0001-note-nota-rollback.md"))).toBe(true);
    expect(fs.existsSync(path.join(repo, "notes", "entries", "N0001-note-nota-rollback-fallida.md"))).toBe(false);
    expect(runGit(repo, ["rev-list", "--count", "HEAD"]).stdout.trim()).toBe("2");
  });

  it("todo:prepare rolls back on simulated commit failure", () => {
    const repo = makeRepo();
    initGitRepo(repo);
    writeTodo(
      repo,
      "220-pending-p2-v2-umbrella.md",
      `
---
protocol_version: 2
task_type: "umbrella"
status: "pending"
priority: "p2"
issue_id: "220"
title: "umbrella"
tags: []
dependencies: []
child_tasks: ["221"]
related_tasks: []
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

1. 221 - only child

### Related Context

- none

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
      "221-pending-p2-child.md",
      `
---
protocol_version: 2
task_type: "leaf"
status: "pending"
priority: "p2"
issue_id: "221"
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

- [ ] Pending

## Work Log

### 2026-03-06 - Test
`
    );
    expect(runGit(repo, ["add", "."]).status).toBe(0);
    expect(runGit(repo, ["commit", "-m", "seed prepare rollback"]).status).toBe(0);

    const result = runNodeWithEnv(PREPARE, repo, ["--todo", "220"], { TODOS_GIT_TX_SIMULATE_COMMIT_FAILURE: "1" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("commit_failed");
    expect(fs.existsSync(path.join(repo, "todos", "220-pending-p2-v2-umbrella.md"))).toBe(true);
    expect(fs.existsSync(path.join(repo, "todos", "220-ready-p2-v2-umbrella.md"))).toBe(false);
    expect(runGit(repo, ["rev-list", "--count", "HEAD"]).stdout.trim()).toBe("2");
  });

  it("closes successfully with a modified tracked file", () => {
    const repo = makeRepo();
    initGitRepo(repo);
    writeClosableTodo(repo);
    writeFile(repo, "docs/report.md", "draft\n");
    expect(runGit(repo, ["add", "."]).status).toBe(0);
    expect(runGit(repo, ["commit", "-m", "seed report"]).status).toBe(0);
    writeFile(repo, "docs/report.md", "draft\nupdated\n");

    const result = runNode(CLOSE, repo, ["--todo", "300", "--files", "docs/report.md"]);
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(repo, "todos", "300-complete-p2-close-target.md"))).toBe(true);
    expect(result.stdout).toContain("OK: closed todo 300");
  });

  it("expands directories to changed tracked files during dry run", () => {
    const repo = makeRepo();
    initGitRepo(repo);
    writeClosableTodo(repo);
    writeFile(repo, "reports/a.md", "a1\n");
    writeFile(repo, "reports/b.md", "b1\n");
    expect(runGit(repo, ["add", "."]).status).toBe(0);
    expect(runGit(repo, ["commit", "-m", "seed reports"]).status).toBe(0);
    writeFile(repo, "reports/a.md", "a2\n");
    writeFile(repo, "reports/b.md", "b2\n");

    const result = runNode(CLOSE, repo, ["--todo", "300", "--files", "reports", "--dry-run"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("preflight: ok");
    expect(result.stdout).toContain("reports/a.md");
    expect(result.stdout).toContain("reports/b.md");
    expect(fs.existsSync(path.join(repo, "todos", "300-ready-p2-close-target.md"))).toBe(true);
  });

  it("fails preflight for missing paths before editing the todo", () => {
    const repo = makeRepo();
    initGitRepo(repo);
    writeClosableTodo(repo);

    const result = runNode(CLOSE, repo, ["--todo", "300", "--files", "reports/missing.md", "--dry-run"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("preflight: blocked_missing");
    expect(result.stderr).toContain("missing:");
    expect(fs.existsSync(path.join(repo, "todos", "300-ready-p2-close-target.md"))).toBe(true);
  });

  it("fails preflight for ignored paths before editing the todo", () => {
    const repo = makeRepo();
    initGitRepo(repo);
    writeClosableTodo(repo);
    writeFile(repo, "ignored-output/result.json", "{\"ok\":true}\n");

    const result = runNode(CLOSE, repo, ["--todo", "300", "--files", "ignored-output", "--dry-run"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("preflight: blocked_ignored");
    expect(result.stderr).toContain("ignored:");
    expect(fs.existsSync(path.join(repo, "todos", "300-ready-p2-close-target.md"))).toBe(true);
  });

  it("fails preflight for partial directory targets with valid and ignored files", () => {
    const repo = makeRepo();
    initGitRepo(repo);
    writeClosableTodo(repo);
    writeFile(repo, "mixed/keep.md", "keep\n");
    writeFile(repo, ".gitignore", "ignored-output/\nmixed/ignored.log\n");
    expect(runGit(repo, ["add", ".gitignore", "mixed/keep.md"]).status).toBe(0);
    expect(runGit(repo, ["commit", "-m", "seed mixed"]).status).toBe(0);
    writeFile(repo, "mixed/keep.md", "keep changed\n");
    writeFile(repo, "mixed/ignored.log", "secret\n");

    const result = runNode(CLOSE, repo, ["--todo", "300", "--files", "mixed", "--dry-run"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("preflight: blocked_partial");
    expect(result.stderr).toContain("partial:");
    expect(result.stderr).toContain("mixed/keep.md");
    expect(fs.existsSync(path.join(repo, "todos", "300-ready-p2-close-target.md"))).toBe(true);
  });

  it("fails preflight when requested files are unchanged", () => {
    const repo = makeRepo();
    initGitRepo(repo);
    writeClosableTodo(repo);
    writeFile(repo, "docs/stable.md", "stable\n");
    expect(runGit(repo, ["add", "."]).status).toBe(0);
    expect(runGit(repo, ["commit", "-m", "seed stable"]).status).toBe(0);

    const result = runNode(CLOSE, repo, ["--todo", "300", "--files", "docs/stable.md", "--dry-run"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("preflight: blocked_empty");
    expect(result.stderr).toContain("unchanged targets: docs/stable.md");
  });

  it("rolls back the todo file when stage fails after mutation", () => {
    const repo = makeRepo();
    initGitRepo(repo);
    writeClosableTodo(repo);
    writeFile(repo, "docs/change.md", "draft\n");
    expect(runGit(repo, ["add", "."]).status).toBe(0);
    expect(runGit(repo, ["commit", "-m", "seed change"]).status).toBe(0);
    writeFile(repo, "docs/change.md", "draft\nupdated\n");

    const result = runNodeWithEnv(
      CLOSE,
      repo,
      ["--todo", "300", "--files", "docs/change.md"],
      { TODO_CLOSE_SIMULATE_STAGE_FAILURE: "1" }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("stage_failed");
    expect(fs.existsSync(path.join(repo, "todos", "300-ready-p2-close-target.md"))).toBe(true);
    expect(fs.existsSync(path.join(repo, "todos", "300-complete-p2-close-target.md"))).toBe(false);
    const todo = fs.readFileSync(path.join(repo, "todos", "300-ready-p2-close-target.md"), "utf8");
    expect(todo).toContain('status: "ready"');
  });

  it("rolls back the todo file when commit fails after staging", () => {
    const repo = makeRepo();
    initGitRepo(repo);
    writeClosableTodo(repo);
    writeFile(repo, "docs/commit.md", "draft\n");
    expect(runGit(repo, ["add", "."]).status).toBe(0);
    expect(runGit(repo, ["commit", "-m", "seed commit"]).status).toBe(0);
    writeFile(repo, "docs/commit.md", "draft\nupdated\n");

    const result = runNodeWithEnv(
      CLOSE,
      repo,
      ["--todo", "300", "--files", "docs/commit.md"],
      { TODO_CLOSE_SIMULATE_COMMIT_FAILURE: "1" }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("commit_failed");
    expect(fs.existsSync(path.join(repo, "todos", "300-ready-p2-close-target.md"))).toBe(true);
    expect(fs.existsSync(path.join(repo, "todos", "300-complete-p2-close-target.md"))).toBe(false);
  });

  it("keeps the original todo when a requested directory mixes valid and ignored artifacts", () => {
    const repo = makeRepo();
    initGitRepo(repo);
    writeClosableTodo(repo);
    writeFile(repo, "reports/architecture-separation-diagnosis/summary.md", "old\n");
    expect(runGit(repo, ["add", "."]).status).toBe(0);
    expect(runGit(repo, ["commit", "-m", "seed regression"]).status).toBe(0);
    writeFile(repo, ".gitignore", "ignored-output/\nreports/architecture-separation-diagnosis/blocked.json\n");
    expect(runGit(repo, ["add", ".gitignore"]).status).toBe(0);
    expect(runGit(repo, ["commit", "-m", "ignore blocked artifact"]).status).toBe(0);
    writeFile(repo, "reports/architecture-separation-diagnosis/summary.md", "new\n");
    writeFile(repo, "reports/architecture-separation-diagnosis/blocked.json", "{\"blocked\":true}\n");

    const result = runNode(
      CLOSE,
      repo,
      ["--todo", "300", "--files", "reports/architecture-separation-diagnosis", "--dry-run"]
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("preflight: blocked_partial");
    expect(result.stderr).toContain("reports/architecture-separation-diagnosis/blocked.json");
    expect(fs.existsSync(path.join(repo, "todos", "300-ready-p2-close-target.md"))).toBe(true);
    expect(fs.existsSync(path.join(repo, "todos", "300-complete-p2-close-target.md"))).toBe(false);
  });
});
