#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const TODOS_DIR = path.resolve(ROOT, "todos");
const FILE_RE = /^(\d{3})-(pending|ready|complete)-(p[1-3])-([a-z0-9-]+)\.md$/;
const REQUIRED_SECTIONS_BASE = [
  "## Problem Statement",
  "## Acceptance Criteria",
  "## Work Log"
];
const SECTION_RECOMMENDED_ACTION = "## Recommended Action";
const SECTION_FINDINGS = "## Findings";
const SECTION_PROPOSED = "## Proposed Solutions";

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

function parseScalar(raw) {
  const value = raw.trim();
  if (value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;

  const quoted = value.match(/^"(.*)"$/);
  if (quoted) return quoted[1];

  const arr = value.match(/^\[(.*)\]$/);
  if (arr) {
    const inner = arr[1].trim();
    if (!inner) return [];
    return inner
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => {
        const q = x.match(/^"(.*)"$/);
        return q ? q[1] : x;
      });
  }

  return value;
}

function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);

  if (lines[0] === "---") {
    let close = -1;
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i] === "---") {
        close = i;
        break;
      }
    }
    if (close === -1) return { error: "missing closing frontmatter fence '---'" };

    const meta = {};
    for (const line of lines.slice(1, close)) {
      if (!line.trim()) continue;
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
      if (!m) return { error: `invalid frontmatter line '${line}'` };
      meta[m[1]] = parseScalar(m[2]);
    }
    return { meta, body: lines.slice(close + 1).join("\n") };
  }

  // Legacy tolerant mode: parse key:value lines until first heading.
  const meta = {};
  let bodyStart = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const clean = line.replace(/^\uFEFF/, "");
    if (/^\s*#/.test(clean)) {
      bodyStart = i;
      break;
    }
    if (!clean.trim() || clean.trim() === "---") continue;
    const m = clean.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (m) {
      meta[m[1]] = parseScalar(m[2]);
      continue;
    }
  }

  if (Object.keys(meta).length === 0) {
    return { error: "no frontmatter key:value block found" };
  }

  if (bodyStart === -1) bodyStart = lines.length;
  return { meta, body: lines.slice(bodyStart).join("\n") };
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

function resolveTodoPath(todoArg) {
  if (/^\d{3}$/.test(todoArg)) {
    const matches = fs
      .readdirSync(TODOS_DIR, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.startsWith(`${todoArg}-`) && e.name.endsWith(".md"))
      .map((e) => e.name)
      .sort();
    if (matches.length === 0) return null;
    return path.resolve(TODOS_DIR, matches[0]);
  }

  const resolved = path.isAbsolute(todoArg) ? todoArg : path.resolve(ROOT, todoArg);
  return fs.existsSync(resolved) ? resolved : null;
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

function loadAllTodoNames() {
  return fs
    .readdirSync(TODOS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name)
    .sort();
}

function determineTargets(opts, allNames) {
  if (opts.all) {
    return allNames.map((name) => path.resolve(TODOS_DIR, name));
  }

  const targets = [];
  for (const todo of opts.todos) {
    const resolved = resolveTodoPath(todo);
    if (resolved) {
      targets.push(resolved);
      continue;
    }
    console.error(`WARN: --todo target not found '${todo}'`);
  }

  for (const fileArg of opts.files) {
    const resolved = resolveTodoPath(fileArg);
    if (resolved) {
      targets.push(resolved);
      continue;
    }
    console.error(`WARN: --files target not found '${fileArg}'`);
  }

  if (targets.length > 0) return [...new Set(targets)];

  // Scoped-by-default mode: validate changed TODO files when no explicit target is provided.
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
    const content = fs.readFileSync(fullPath, "utf8");
    const parsed = parseFrontmatter(content);
    if (parsed.error) {
      graph.set(id, []);
      continue;
    }
    const deps = Array.isArray(parsed.meta.dependencies)
      ? parsed.meta.dependencies.filter((d) => typeof d === "string" && /^\d{3}$/.test(d))
      : [];
    graph.set(id, deps);
  }

  return { idSet, graph };
}

function validateFile(fullPath) {
  const name = path.basename(fullPath);
  const errors = [];
  const warnings = [];
  const match = name.match(FILE_RE);

  if (!match) {
    return { name, id: null, errors: ["invalid filename pattern"], warnings, meta: null, deps: [] };
  }

  const [, id, statusFromName, priorityFromName] = match;
  const content = fs.readFileSync(fullPath, "utf8");
  const parsed = parseFrontmatter(content);
  if (parsed.error) {
    return { name, id, errors: [parsed.error], warnings, meta: null, deps: [] };
  }

  const meta = parsed.meta;
  const body = parsed.body;

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
    if (isComplete) {
      warnings.push(`legacy complete task missing section '${sec}'`);
    } else {
      errors.push(`missing required section '${sec}'`);
    }
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
    if (dep === id) {
      errors.push("self-dependency is not allowed");
    }
  }

  if (String(meta.status) === "complete" && meta.auto_closure === true) {
    if (meta.commit_confirmed !== true) {
      errors.push("complete task with auto_closure=true requires commit_confirmed=true");
    }
    if (!(typeof meta.commit_message === "string" && meta.commit_message.trim().length > 0)) {
      errors.push("complete task with auto_closure=true requires non-empty commit_message");
    }
  }

  return { name, id, errors, warnings, meta, deps };
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

  const allNames = loadAllTodoNames();
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
      if (!idSet.has(dep)) {
        f.errors.push(`dependency '${dep}' does not exist in todos/`);
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
          f.errors.push(`dependency cycle detected: ${text}`);
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
