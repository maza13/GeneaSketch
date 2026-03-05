#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const TODOS_DIR = path.resolve(ROOT, "todos");
const FILE_RE = /^(\d{3})-(pending|ready|complete)-(p[1-3])-([a-z0-9-]+)\.md$/;

function die(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function run(cmd, args, options = {}) {
  const out = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });
  return out;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function quoteString(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
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
    if (close === -1) return { error: "missing closing frontmatter fence" };

    const meta = {};
    for (const line of lines.slice(1, close)) {
      if (!line.trim()) continue;
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
      if (!m) return { error: `invalid frontmatter line '${line}'` };
      meta[m[1]] = parseScalar(m[2]);
    }
    return { meta, body: lines.slice(close + 1).join("\n") };
  }

  // Legacy tolerant mode.
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

  if (Object.keys(meta).length === 0) return { error: "no frontmatter block found" };
  if (bodyStart === -1) bodyStart = lines.length;
  return { meta, body: lines.slice(bodyStart).join("\n") };
}

function serializeValue(v) {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) {
    const parts = v.map((x) => quoteString(x));
    return `[${parts.join(", ")}]`;
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return quoteString(v);
  return String(v);
}

function serialize(meta, body) {
  const preferredOrder = [
    "status",
    "priority",
    "issue_id",
    "title",
    "tags",
    "dependencies",
    "owner",
    "created_at",
    "updated_at",
    "target_date",
    "risk_level",
    "estimated_effort",
    "complexity",
    "auto_closure",
    "commit_confirmed",
    "commit_message",
    "closed_at"
  ];

  const keys = Object.keys(meta);
  const ordered = [];
  for (const k of preferredOrder) {
    if (keys.includes(k)) ordered.push(k);
  }
  for (const k of keys.sort()) {
    if (!ordered.includes(k)) ordered.push(k);
  }

  const lines = ["---"];
  for (const k of ordered) {
    lines.push(`${k}: ${serializeValue(meta[k])}`);
  }
  lines.push("---", "", body.trimEnd(), "");
  return lines.join("\n");
}

function parseArgs(argv) {
  const opts = {
    todo: null,
    files: [],
    summary: "Task completed with automated closure.",
    message: null,
    by: "Codex",
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--todo") {
      opts.todo = argv[++i];
    } else if (a === "--summary") {
      opts.summary = argv[++i];
    } else if (a === "--message") {
      opts.message = argv[++i];
    } else if (a === "--by") {
      opts.by = argv[++i];
    } else if (a === "--files") {
      const raw = argv[++i] ?? "";
      opts.files.push(
        ...raw
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      );
    } else if (a === "--file") {
      const v = argv[++i];
      if (v) opts.files.push(v);
    } else if (a === "--dry-run") {
      opts.dryRun = true;
    } else {
      die(`unknown argument '${a}'`);
    }
  }

  if (!opts.todo) die("missing required --todo <issue_id_or_path>");
  return opts;
}

function resolveTodoPath(todoArg) {
  if (/^\d{3}$/.test(todoArg)) {
    const matches = fs
      .readdirSync(TODOS_DIR)
      .filter((n) => n.startsWith(`${todoArg}-`) && n.endsWith(".md"))
      .sort();
    if (matches.length === 0) die(`todo issue '${todoArg}' not found`);
    return path.join(TODOS_DIR, matches[0]);
  }

  const p = path.isAbsolute(todoArg) ? todoArg : path.resolve(ROOT, todoArg);
  if (!fs.existsSync(p)) die(`todo file not found: ${p}`);
  return p;
}

function toRepoRelative(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function appendWorkLog(body, entry) {
  if (body.includes("## Work Log")) {
    return `${body.trimEnd()}\n\n${entry}\n`;
  }
  return `${body.trimEnd()}\n\n## Work Log\n\n${entry}\n`;
}

function priorityRank(priority) {
  if (priority === "p1") return 1;
  if (priority === "p2") return 2;
  return 3;
}

function readTodoRecords() {
  const out = [];
  const names = fs
    .readdirSync(TODOS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name)
    .sort();

  for (const name of names) {
    const m = name.match(FILE_RE);
    if (!m) continue;
    const [, id, statusFromName, priorityFromName] = m;
    const content = fs.readFileSync(path.join(TODOS_DIR, name), "utf8");
    const parsed = parseFrontmatter(content);
    if (parsed.error) continue;
    const meta = parsed.meta;
    const status = typeof meta.status === "string" ? meta.status : statusFromName;
    const priority = typeof meta.priority === "string" ? meta.priority : priorityFromName;
    const deps = Array.isArray(meta.dependencies) ? meta.dependencies.filter((x) => typeof x === "string") : [];
    out.push({ id, status, priority, deps, name });
  }

  return out;
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const p = priorityRank(a.priority) - priorityRank(b.priority);
    if (p !== 0) return p;
    return Number(a.id) - Number(b.id);
  });
}

function buildNextRecommendation(currentId) {
  const records = readTodoRecords().map((r) => (r.id === currentId ? { ...r, status: "complete" } : r));
  const complete = new Set(records.filter((r) => r.status === "complete").map((r) => r.id));
  complete.add(currentId);

  const open = records.filter((r) => r.id !== currentId && r.status !== "complete");
  const directDependents = open.filter((r) => r.deps.includes(currentId));
  const directUnblocked = sortTasks(directDependents.filter((r) => r.deps.every((d) => complete.has(d))));

  if (directUnblocked.length > 0) {
    const top = directUnblocked.slice(0, 3).map((r) => `${r.id} (${r.priority})`);
    return [
      `- Direct next tasks unblocked by this closure: ${top.join(", ")}.`,
      `- Recommended start: ${directUnblocked[0].id} (${directUnblocked[0].priority}).`
    ];
  }

  if (directDependents.length > 0) {
    const first = sortTasks(directDependents)[0];
    const missing = first.deps.filter((d) => !complete.has(d));
    return [
      `- There are direct dependent tasks, but they are still blocked.`,
      `- Example: ${first.id} (${first.priority}) waits for: ${missing.join(", ")}.`
    ];
  }

  const unblocked = sortTasks(open.filter((r) => r.deps.every((d) => complete.has(d))));
  if (unblocked.length > 0) {
    return [
      `- No direct dependent task found.`,
      `- Recommended next unblocked task: ${unblocked[0].id} (${unblocked[0].priority}).`
    ];
  }

  return ["- No unblocked follow-up tasks found after this closure."];
}

function main() {
  if (!fs.existsSync(TODOS_DIR)) die(`todos directory not found: ${TODOS_DIR}`);

  const opts = parseArgs(process.argv.slice(2));
  const todoPath = resolveTodoPath(opts.todo);
  const name = path.basename(todoPath);
  const m = name.match(FILE_RE);
  if (!m) die(`todo filename does not match expected pattern: ${name}`);

  const [, id, fromStatus, priority, slug] = m;
  if (fromStatus === "complete") die(`todo ${id} is already complete`);

  const raw = fs.readFileSync(todoPath, "utf8");
  const parsed = parseFrontmatter(raw);
  if (parsed.error) die(parsed.error);

  const meta = { ...parsed.meta };
  const body = parsed.body;
  const date = today();

  const commitMessage =
    opts.message && opts.message.trim().length > 0
      ? opts.message.trim()
      : `chore(todos): close issue ${id} ${slug}`;

  const nextRecommendation = buildNextRecommendation(id);

  meta.status = "complete";
  meta.priority = priority;
  meta.issue_id = id;
  meta.title = meta.title ?? slug;
  meta.updated_at = date;
  meta.created_at = meta.created_at ?? date;
  meta.closed_at = date;
  meta.auto_closure = true;
  meta.commit_confirmed = true;
  meta.commit_message = commitMessage;
  meta.tags = Array.isArray(meta.tags) ? meta.tags : [];
  meta.dependencies = Array.isArray(meta.dependencies) ? meta.dependencies : [];
  meta.complexity =
    typeof meta.complexity === "string" && ["simple", "standard", "complex"].includes(meta.complexity)
      ? meta.complexity
      : "standard";

  const entry = [
    `### ${date} - Auto close via todo:close`,
    "",
    `**By:** ${opts.by}`,
    "",
    "**Status Transition:**",
    `- from: ${fromStatus}`,
    "- to: complete",
    "",
    "**Actions:**",
    `- ${opts.summary}`,
    "- Closed task with automated status update + rename + commit.",
    "",
    "**Evidence:**",
    "- Command: npm run todo:close -- ...",
    "- Result: automatic close and commit executed.",
    `- Artifacts/paths: todos/${id}-complete-${priority}-${slug}.md`,
    "",
    "**Next Recommendation (generated at closure):**",
    ...nextRecommendation
  ].join("\n");

  const newBody = appendWorkLog(body, entry);
  const newContent = serialize(meta, newBody);

  const newName = `${id}-complete-${priority}-${slug}.md`;
  const newPath = path.join(path.dirname(todoPath), newName);

  const stageSet = new Set();
  stageSet.add(toRepoRelative(newPath));
  if (newPath !== todoPath) stageSet.add(toRepoRelative(todoPath));
  for (const f of opts.files) {
    const resolved = path.isAbsolute(f) ? f : path.resolve(ROOT, f);
    stageSet.add(toRepoRelative(resolved));
  }
  const stageFiles = [...stageSet];

  if (opts.dryRun) {
    console.log("DRY RUN");
    console.log(`- todo: ${toRepoRelative(newPath)}`);
    console.log(`- commit message: ${commitMessage}`);
    console.log(`- staged files: ${stageFiles.join(", ")}`);
    return;
  }

  fs.writeFileSync(newPath, newContent, "utf8");
  if (newPath !== todoPath) {
    fs.unlinkSync(todoPath);
  }

  const add = run("git", ["add", "-A", "--", ...stageFiles]);
  if (add.status !== 0) {
    die(`git add failed:\n${add.stderr || add.stdout}`);
  }

  const commit = run("git", ["commit", "-m", commitMessage]);
  if (commit.status !== 0) {
    die(`git commit failed:\n${commit.stderr || commit.stdout}`);
  }

  const hash = run("git", ["rev-parse", "--short", "HEAD"]);
  if (hash.status !== 0) {
    die(`commit created but could not read hash:\n${hash.stderr || hash.stdout}`);
  }

  console.log(`OK: closed todo ${id} with commit ${hash.stdout.trim()}`);
  console.log(`Message: ${commitMessage}`);
  console.log(`File: ${toRepoRelative(newPath)}`);
}

main();
