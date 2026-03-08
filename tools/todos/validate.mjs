#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  FILE_RE,
  VALID_RELATIONS,
  VALID_TASK_TYPES,
  childTasksOf,
  dependenciesOf,
  loadAllTodoNames,
  parseChecklist,
  protocolVersion,
  readTodoRecord,
  relatedTasksOf,
  resolveTodoPath,
  taskType
} from "./common.mjs";

const ROOT = process.cwd();
const TODOS_DIR = path.resolve(ROOT, "todos");
const REQUIRED_SECTIONS_BASE = [
  "## Problem Statement",
  "## Acceptance Criteria",
  "## Work Log"
];
const SECTION_RECOMMENDED_ACTION = "## Recommended Action";
const SECTION_FINDINGS = "## Findings";
const SECTION_PROPOSED = "## Proposed Solutions";
const SECTION_ORCHESTRATION = "## Orchestration Guide";
const ORCHESTRATION_SUBSECTIONS = [
  "### Hard Dependencies",
  "### Child Execution Order",
  "### Related Context",
  "### Exit Rule"
];

function parseArgs(argv) {
  const opts = {
    all: false,
    todos: [],
    files: []
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--all") {
      opts.all = true;
      continue;
    }
    if (arg === "--todo") {
      const value = argv[++i];
      if (!value) throw new Error("missing value for --todo");
      opts.todos.push(value);
      continue;
    }
    if (arg === "--file") {
      const value = argv[++i];
      if (!value) throw new Error("missing value for --file");
      opts.files.push(value);
      continue;
    }
    if (arg === "--files") {
      const value = argv[++i];
      if (!value) throw new Error("missing value for --files");
      opts.files.push(
        ...value
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      );
      continue;
    }
    throw new Error(`unknown argument '${arg}'`);
  }

  return opts;
}

function detectCycles(graph) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycles = [];

  function dfs(node) {
    if (visiting.has(node)) {
      const idx = stack.indexOf(node);
      cycles.push(stack.slice(idx).concat(node));
      return;
    }
    if (visited.has(node)) return;

    visiting.add(node);
    stack.push(node);
    for (const dep of graph.get(node) ?? []) dfs(dep);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) dfs(node);
  return cycles;
}

function detectChangedTodoFiles() {
  const out = spawnSync("git", ["status", "--porcelain", "--untracked-files=all", "--", "todos"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  if (out.status !== 0) return [];

  const result = [];
  const lines = out.stdout.split(/\r?\n/).filter((x) => x.trim().length > 0);
  for (const line of lines) {
    const payload = line.length > 3 ? line.slice(3).trim() : "";
    if (!payload) continue;
    const pathPart = payload.includes(" -> ") ? payload.split(" -> ").at(-1) : payload;
    const normalized = pathPart.replace(/^"|"$/g, "");
    if (!normalized.endsWith(".md")) continue;
    const abs = path.resolve(ROOT, normalized);
    if (!abs.startsWith(TODOS_DIR)) continue;
    if (!fs.existsSync(abs)) continue;
    result.push(abs);
  }
  return [...new Set(result)];
}

function determineTargets(opts, allNames) {
  if (opts.all) {
    return allNames.map((name) => path.resolve(TODOS_DIR, name));
  }

  const targets = [];
  for (const todo of opts.todos) {
    const resolved = resolveTodoPath(ROOT, TODOS_DIR, todo);
    if (resolved) {
      targets.push(resolved);
      continue;
    }
    console.error(`WARN: --todo target not found '${todo}'`);
  }

  for (const fileArg of opts.files) {
    const resolved = resolveTodoPath(ROOT, TODOS_DIR, fileArg);
    if (resolved) {
      targets.push(resolved);
      continue;
    }
    console.error(`WARN: --files target not found '${fileArg}'`);
  }

  if (targets.length > 0) return [...new Set(targets)];
  return detectChangedTodoFiles();
}

function readGraph(allNames) {
  const idSet = new Set();
  const graph = new Map();

  for (const name of allNames) {
    const match = name.match(FILE_RE);
    if (!match) continue;

    const [, id] = match;
    idSet.add(id);
    const fullPath = path.resolve(TODOS_DIR, name);
    const record = readTodoRecord(ROOT, TODOS_DIR, fullPath);
    if (record.parsed.error) {
      graph.set(id, []);
      continue;
    }
    const deps = dependenciesOf(record.meta);
    const children = protocolVersion(record.meta) === 2 ? childTasksOf(record.meta) : [];
    graph.set(id, [...new Set([...deps, ...children])]);
  }

  return { idSet, graph };
}

function validateOrchestration(body, errors) {
  if (!body.includes(SECTION_ORCHESTRATION)) {
    errors.push(`missing required section '${SECTION_ORCHESTRATION}' for task_type='umbrella'`);
    return;
  }
  for (const subsection of ORCHESTRATION_SUBSECTIONS) {
    if (!body.includes(subsection)) {
      errors.push(`missing required subsection '${subsection}' in '## Orchestration Guide'`);
    }
  }
}

function validateChecklist(record, errors, warnings) {
  const checklist = parseChecklist(record.body, "Acceptance Criteria");
  const v2 = protocolVersion(record.meta) === 2;
  const isComplete = String(record.meta.status) === "complete";

  if (!checklist.exists) {
    if (isComplete && !v2) warnings.push("legacy complete task missing checklist-parsable acceptance criteria");
    else errors.push("acceptance criteria must be checklist-formatted");
    return;
  }
  if (checklist.items.length === 0) {
    if (v2) errors.push("acceptance criteria must contain at least one checklist item");
    else warnings.push("acceptance criteria section has no checklist items");
    return;
  }
  if (v2 && isComplete) {
    const unchecked = checklist.items.filter((item) => !item.checked);
    if (unchecked.length > 0) {
      errors.push(`complete v2 task cannot have unchecked acceptance criteria (${unchecked.length} open)`);
    }
  }
}

function validateFile(fullPath) {
  const record = readTodoRecord(ROOT, TODOS_DIR, fullPath);
  const { name, match, meta, body, id, statusFromName, priorityFromName } = record;
  const errors = [];
  const warnings = [];

  if (!match) {
    return { name, id: null, errors: ["invalid filename pattern"], warnings, meta: null, deps: [], childTasks: [] };
  }
  if (record.parsed.error) {
    return { name, id, errors: [record.parsed.error], warnings, meta: null, deps: [], childTasks: [] };
  }

  if (!meta.status) errors.push("missing frontmatter field 'status'");
  if (!meta.priority) errors.push("missing frontmatter field 'priority'");
  if (!meta.issue_id) errors.push("missing frontmatter field 'issue_id'");

  if (meta.status && !["pending", "ready", "complete"].includes(String(meta.status))) {
    errors.push(`invalid status '${String(meta.status)}'`);
  }
  if (meta.priority && !["p1", "p2", "p3"].includes(String(meta.priority))) {
    errors.push(`invalid priority '${String(meta.priority)}'`);
  }
  if (meta.issue_id && !/^\d{3}$/.test(String(meta.issue_id))) {
    errors.push(`issue_id must be 3 digits, got '${String(meta.issue_id)}'`);
  }
  if (meta.issue_id && String(meta.issue_id) !== id) {
    errors.push(`issue_id '${String(meta.issue_id)}' must match filename id '${id}'`);
  }
  if (meta.status && String(meta.status) !== statusFromName) {
    errors.push(`status '${String(meta.status)}' must match filename status '${statusFromName}'`);
  }
  if (meta.priority && String(meta.priority) !== priorityFromName) {
    errors.push(`priority '${String(meta.priority)}' must match filename priority '${priorityFromName}'`);
  }

  const isComplete = String(meta.status) === "complete";
  const complexityRaw = typeof meta.complexity === "string" ? meta.complexity : null;
  const complexity = complexityRaw ?? "standard";
  if (complexityRaw === null) {
    warnings.push("complexity not specified; defaulting validation profile to 'standard'");
  } else if (!["simple", "standard", "complex"].includes(complexityRaw)) {
    errors.push(`invalid complexity '${complexityRaw}', expected simple|standard|complex`);
  }

  for (const sec of REQUIRED_SECTIONS_BASE) {
    if (body.includes(sec)) continue;
    if (isComplete && protocolVersion(meta) !== 2) warnings.push(`legacy complete task missing section '${sec}'`);
    else errors.push(`missing required section '${sec}'`);
  }

  if (!isComplete && (complexity === "standard" || complexity === "complex")) {
    if (!body.includes(SECTION_RECOMMENDED_ACTION)) {
      errors.push(`missing required section '${SECTION_RECOMMENDED_ACTION}' for complexity='${complexity}'`);
    }
  } else if (!body.includes(SECTION_RECOMMENDED_ACTION)) {
    warnings.push("recommended section '## Recommended Action' is missing");
  }

  if (!isComplete && complexity === "complex") {
    if (!body.includes(SECTION_FINDINGS)) {
      errors.push(`missing required section '${SECTION_FINDINGS}' for complexity='complex'`);
    }
    if (!body.includes(SECTION_PROPOSED)) {
      errors.push(`missing required section '${SECTION_PROPOSED}' for complexity='complex'`);
    }
  }

  const deps = Array.isArray(meta.dependencies) ? meta.dependencies : [];
  if (!Array.isArray(meta.dependencies)) {
    warnings.push("dependencies missing or non-array; treated as []");
  }

  for (const dep of deps) {
    if (!(typeof dep === "string" && /^\d{3}$/.test(dep))) {
      errors.push(`dependency '${String(dep)}' must be a 3-digit string`);
    }
    if (dep === id) errors.push("self-dependency is not allowed");
  }

  const v2 = protocolVersion(meta) === 2;
  const type = taskType(meta);
  const childTasks = childTasksOf(meta);
  const related = relatedTasksOf(meta);

  validateChecklist(record, errors, warnings);

  if (v2) {
    if (!VALID_TASK_TYPES.includes(type)) {
      errors.push(`invalid task_type '${String(meta.task_type)}'; expected leaf|umbrella`);
    }
    if (!Array.isArray(meta.child_tasks)) {
      errors.push("child_tasks is required and must be an array for v2 tasks");
    }
    if (!Array.isArray(meta.related_tasks)) {
      errors.push("related_tasks is required and must be an array for v2 tasks");
    }
    for (const item of related) {
      const m = String(item).match(/^(\d{3}):([a-z]+)$/);
      if (!m) {
        errors.push(`related_tasks item '${item}' must match NNN:relation`);
        continue;
      }
      if (!VALID_RELATIONS.includes(m[2])) {
        errors.push(`related_tasks relation '${m[2]}' is invalid; expected ${VALID_RELATIONS.join("|")}`);
      }
    }

    if (type === "umbrella") {
      if (complexity !== "complex") {
        errors.push("umbrella v2 task must use complexity='complex'");
      }
      if (childTasks.length < 1) {
        errors.push("umbrella v2 task must declare at least one child task");
      }
      if (new Set(childTasks).size !== childTasks.length) {
        errors.push("umbrella v2 task cannot repeat child_tasks ids");
      }
      if (childTasks.includes(id)) {
        errors.push("umbrella v2 task cannot include itself in child_tasks");
      }
      validateOrchestration(body, errors);
    }
  }

  return { name, id, errors, warnings, meta, deps: dependenciesOf(meta), childTasks };
}

function main() {
  if (!fs.existsSync(TODOS_DIR)) {
    console.error(`ERROR: todos directory not found: ${TODOS_DIR}`);
    process.exit(1);
  }

  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }

  const allNames = loadAllTodoNames(TODOS_DIR);
  const targetPaths = determineTargets(opts, allNames);

  if (targetPaths.length === 0) {
    console.error("ERROR: no TODO targets resolved.");
    console.error("Scoped mode expects changed files or explicit --todo/--files targets.");
    console.error("Use --all to validate the full historical backlog.");
    process.exit(1);
  }

  const mode = opts.all ? "all" : "scoped";
  const files = targetPaths.map((fullPath) => validateFile(fullPath));
  const { idSet, graph } = readGraph(allNames);

  for (const f of files) {
    if (!f.id) continue;
    for (const dep of f.deps ?? []) {
      if (!idSet.has(dep)) f.errors.push(`dependency '${dep}' does not exist in todos/`);
    }
    for (const child of f.childTasks ?? []) {
      if (!idSet.has(child)) f.errors.push(`child task '${child}' does not exist in todos/`);
    }
    const related = Array.isArray(f.meta?.related_tasks) ? f.meta.related_tasks : [];
    for (const item of related) {
      const match = String(item).match(/^(\d{3}):/);
      if (match && !idSet.has(match[1])) {
        f.errors.push(`related task '${match[1]}' does not exist in todos/`);
      }
    }
  }

  const cycles = detectCycles(graph);
  if (cycles.length > 0) {
    for (const cycle of cycles) {
      const text = cycle.join(" -> ");
      const nodes = new Set(cycle);
      for (const f of files) {
        if (f.id && nodes.has(f.id)) {
          f.errors.push(`dependency/child cycle detected: ${text}`);
        }
      }
    }
  }

  const invalid = files.filter((f) => f.errors.length > 0);
  const warned = files.filter((f) => f.warnings.length > 0);

  if (invalid.length > 0) {
    const issueCount = invalid.reduce((n, f) => n + f.errors.length, 0);
    console.error(`FAIL (${mode}): ${invalid.length}/${files.length} TODO files violate base rules (${issueCount} issues).`);
    for (const f of invalid) {
      console.error(`\n- ${f.name}`);
      for (const e of f.errors) console.error(`  * ${e}`);
      for (const w of f.warnings) console.error(`  - warning: ${w}`);
    }
    process.exit(1);
  }

  console.log(`OK (${mode}): ${files.length} TODO files satisfy base rules.`);
  if (warned.length > 0) {
    const warnCount = warned.reduce((n, f) => n + f.warnings.length, 0);
    console.log(`WARN: ${warned.length} files have ${warnCount} non-blocking warnings.`);
    for (const f of warned) {
      console.log(`- ${f.name}`);
      for (const w of f.warnings) console.log(`  - ${w}`);
    }
  }
}

main();
