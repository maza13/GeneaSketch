#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  FILE_RE,
  appendWorkLog,
  childTasksOf,
  dependenciesOf,
  parseChecklist,
  parseFrontmatter,
  protocolVersion,
  readTodoRecords,
  resolveTodoPath,
  sectionText,
  serialize,
  taskType,
  toRepoRelative,
  today
} from "./common.mjs";

const ROOT = process.cwd();
const TODOS_DIR = path.resolve(ROOT, "todos");

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

function priorityRank(priority) {
  if (priority === "p1") return 1;
  if (priority === "p2") return 2;
  return 3;
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const p = priorityRank(a.priority) - priorityRank(b.priority);
    if (p !== 0) return p;
    return Number(a.id) - Number(b.id);
  });
}

function readTodoRecordsLite() {
  return readTodoRecords(ROOT, TODOS_DIR).map((record) => ({
    id: record.id,
    status: typeof record.meta.status === "string" ? record.meta.status : record.statusFromName,
    priority: typeof record.meta.priority === "string" ? record.meta.priority : record.priorityFromName,
    deps: dependenciesOf(record.meta),
    children: childTasksOf(record.meta),
    name: record.name
  }));
}

function buildNextRecommendation(currentId) {
  const records = readTodoRecordsLite().map((r) => (r.id === currentId ? { ...r, status: "complete" } : r));
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

  const umbrellaChildren = open.filter((r) => r.children.includes(currentId));
  const umbrellaReady = sortTasks(umbrellaChildren.filter((r) => r.deps.every((d) => complete.has(d))));
  if (umbrellaReady.length > 0) {
    return [
      `- An umbrella now includes this completed task in its child chain: ${umbrellaReady[0].id} (${umbrellaReady[0].priority}).`,
      `- Recommended next step: brief/prepare umbrella ${umbrellaReady[0].id}.`
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

function validateCloseConstraints(record) {
  const errors = [];
  const meta = record.meta;
  const v2 = protocolVersion(meta) === 2;
  const type = taskType(meta);

  if (!v2) return errors;

  const checklist = parseChecklist(record.body, "Acceptance Criteria");
  if (!checklist.exists || checklist.items.length === 0) {
    errors.push("v2 task requires checklist-formatted acceptance criteria before closure");
  } else {
    const unchecked = checklist.items.filter((item) => !item.checked);
    if (unchecked.length > 0) {
      errors.push(`v2 task cannot close with unchecked acceptance criteria (${unchecked.length} open)`);
    }
  }

  if (type === "umbrella") {
    if (!record.body.includes("## Orchestration Guide")) {
      errors.push("umbrella v2 task requires '## Orchestration Guide' before closure");
    }
    const all = readTodoRecords(ROOT, TODOS_DIR);
    const statusById = new Map(all.map((item) => [item.id, item.meta.status ?? item.statusFromName]));
    for (const dep of dependenciesOf(meta)) {
      if (statusById.get(dep) !== "complete") {
        errors.push(`umbrella cannot close while dependency '${dep}' is not complete`);
      }
    }
    for (const child of childTasksOf(meta)) {
      if (statusById.get(child) !== "complete") {
        errors.push(`umbrella cannot close while child task '${child}' is not complete`);
      }
    }
  }

  return errors;
}

function main() {
  if (!fs.existsSync(TODOS_DIR)) die(`todos directory not found: ${TODOS_DIR}`);

  const opts = parseArgs(process.argv.slice(2));
  const todoPath = resolveTodoPath(ROOT, TODOS_DIR, opts.todo);
  if (!todoPath) die(`todo target not found: ${opts.todo}`);
  const name = path.basename(todoPath);
  const m = name.match(FILE_RE);
  if (!m) die(`todo filename does not match expected pattern: ${name}`);

  const [, id, fromStatus, priority, slug] = m;
  if (fromStatus === "complete") die(`todo ${id} is already complete`);

  const raw = fs.readFileSync(todoPath, "utf8");
  const parsed = parseFrontmatter(raw);
  if (parsed.error) die(parsed.error);

  const record = { meta: { ...parsed.meta }, body: parsed.body };
  const closeErrors = validateCloseConstraints(record);
  if (closeErrors.length > 0) {
    die(closeErrors.join("\n"));
  }

  const meta = record.meta;
  const body = record.body;
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
  meta.child_tasks = Array.isArray(meta.child_tasks) ? meta.child_tasks : [];
  meta.related_tasks = Array.isArray(meta.related_tasks) ? meta.related_tasks : [];
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
  stageSet.add(toRepoRelative(ROOT, newPath));
  if (newPath !== todoPath) stageSet.add(toRepoRelative(ROOT, todoPath));
  for (const f of opts.files) {
    const resolved = path.isAbsolute(f) ? f : path.resolve(ROOT, f);
    stageSet.add(toRepoRelative(ROOT, resolved));
  }
  const stageFiles = [...stageSet];

  if (opts.dryRun) {
    console.log("DRY RUN");
    console.log(`- todo: ${toRepoRelative(ROOT, newPath)}`);
    console.log(`- commit message: ${commitMessage}`);
    console.log(`- staged files: ${stageFiles.join(", ")}`);
    return;
  }

  fs.writeFileSync(newPath, newContent, "utf8");
  if (newPath !== todoPath) fs.unlinkSync(todoPath);

  const add = run("git", ["add", "-A", "--", ...stageFiles]);
  if (add.status !== 0) die(`git add failed:\n${add.stderr || add.stdout}`);

  const commit = run("git", ["commit", "-m", commitMessage]);
  if (commit.status !== 0) die(`git commit failed:\n${commit.stderr || commit.stdout}`);

  const hash = run("git", ["rev-parse", "--short", "HEAD"]);
  if (hash.status !== 0) die(`commit created but could not read hash:\n${hash.stderr || hash.stdout}`);

  console.log(`OK: closed todo ${id} with commit ${hash.stdout.trim()}`);
  console.log(`Message: ${commitMessage}`);
  console.log(`File: ${toRepoRelative(ROOT, newPath)}`);
}

main();
