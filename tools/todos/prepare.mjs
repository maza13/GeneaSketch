#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  FILE_RE,
  appendWorkLog,
  childTasksOf,
  dependenciesOf,
  parseRelatedItems,
  protocolVersion,
  readTodoRecord,
  readTodoRecordsMap,
  resolveTodoPath,
  serialize,
  taskType,
  today
} from "./common.mjs";

const ROOT = process.cwd();
const TODOS_DIR = path.resolve(ROOT, "todos");

function die(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { todo: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--todo") {
      opts.todo = argv[++i];
      continue;
    }
    if (arg === "--dry-run") {
      opts.dryRun = true;
      continue;
    }
    die(`unknown argument '${arg}'`);
  }
  if (!opts.todo) die("missing required --todo <issue_id_or_path>");
  return opts;
}

function renderStatus(record) {
  return record.meta.status ?? record.statusFromName;
}

function writeRenamedRecord(record, nextStatus) {
  const currentName = path.basename(record.fullPath);
  const match = currentName.match(FILE_RE);
  if (!match) die(`invalid todo filename: ${currentName}`);
  const [, id, , priority, slug] = match;
  const nextPath = path.resolve(TODOS_DIR, `${id}-${nextStatus}-${priority}-${slug}.md`);
  record.meta.status = nextStatus;
  record.meta.updated_at = today();
  const content = serialize(record.meta, record.body);
  fs.writeFileSync(nextPath, content, "utf8");
  if (nextPath !== record.fullPath) fs.unlinkSync(record.fullPath);
  record.fullPath = nextPath;
  record.name = path.basename(nextPath);
  record.statusFromName = nextStatus;
  return nextPath;
}

function main() {
  if (!fs.existsSync(TODOS_DIR)) die(`todos directory not found: ${TODOS_DIR}`);
  const opts = parseArgs(process.argv.slice(2));
  const todoPath = resolveTodoPath(ROOT, TODOS_DIR, opts.todo);
  if (!todoPath) die(`todo target not found: ${opts.todo}`);

  const umbrella = readTodoRecord(ROOT, TODOS_DIR, todoPath);
  if (!umbrella.match) die(`todo filename does not match expected pattern: ${umbrella.name}`);
  if (umbrella.parsed.error) die(umbrella.parsed.error);
  if (protocolVersion(umbrella.meta) !== 2) die("todo:prepare only supports protocol_version: 2");
  if (taskType(umbrella.meta) !== "umbrella") die("todo:prepare requires task_type: umbrella");

  const map = readTodoRecordsMap(ROOT, TODOS_DIR);
  const missingDeps = dependenciesOf(umbrella.meta).filter((dep) => {
    const record = map.get(dep);
    return !record || renderStatus(record) !== "complete";
  });
  if (missingDeps.length > 0) {
    die(`umbrella has unresolved hard dependencies: ${missingDeps.join(", ")}`);
  }

  const activated = [];
  const blocked = [];
  const childIds = childTasksOf(umbrella.meta);

  for (const childId of childIds) {
    const child = map.get(childId);
    if (!child) {
      blocked.push(`${childId} (missing)`);
      continue;
    }
    const status = renderStatus(child);
    if (status === "complete" || status === "ready") continue;

    const unmet = dependenciesOf(child.meta).filter((dep) => {
      const depRecord = map.get(dep);
      return !depRecord || renderStatus(depRecord) !== "complete";
    });
    if (unmet.length > 0) {
      blocked.push(`${childId} (blocked by ${unmet.join(", ")})`);
      continue;
    }
    activated.push(childId);
  }

  const related = parseRelatedItems(umbrella.meta).map((item) => `${item.id}:${item.relation}`);
  const entry = [
    `### ${today()} - Umbrella prepared via todo:prepare`,
    "",
    "**By:** Codex",
    "",
    "**Status Transition:**",
    `- from: ${renderStatus(umbrella)}`,
    `- to: ${renderStatus(umbrella) === "pending" ? "ready" : renderStatus(umbrella)}`,
    "",
    "**Actions:**",
    "- Reviewed hard dependencies before opening the umbrella.",
    `- Confirmed child execution order: ${childIds.join(", ") || "none"}.`,
    `- Considered related context: ${related.join(", ") || "none"}.`,
    `- Activated eligible child tasks: ${activated.join(", ") || "none"}.`,
    `- Left blocked child tasks pending: ${blocked.join(", ") || "none"}.`,
    "",
    "**Evidence:**",
    `- Hard dependencies complete: ${dependenciesOf(umbrella.meta).join(", ") || "none"}`,
    `- Activated: ${activated.join(", ") || "none"}`,
    `- Blocked: ${blocked.join(", ") || "none"}`
  ].join("\n");

  umbrella.body = appendWorkLog(umbrella.body, entry);

  if (opts.dryRun) {
    console.log("DRY RUN");
    console.log(`- umbrella: ${umbrella.id}`);
    console.log(`- activate: ${activated.join(", ") || "none"}`);
    console.log(`- blocked: ${blocked.join(", ") || "none"}`);
    return;
  }

  if (renderStatus(umbrella) === "pending") {
    umbrella.meta.status = "ready";
    umbrella.statusFromName = "ready";
  }
  umbrella.meta.updated_at = today();
  writeRenamedRecord(umbrella, umbrella.meta.status);

  for (const childId of activated) {
    const child = readTodoRecord(ROOT, TODOS_DIR, resolveTodoPath(ROOT, TODOS_DIR, childId));
    child.meta.updated_at = today();
    writeRenamedRecord(child, "ready");
  }

  console.log(`OK: prepared umbrella ${umbrella.id}`);
  console.log(`- activated: ${activated.join(", ") || "none"}`);
  console.log(`- blocked: ${blocked.join(", ") || "none"}`);
}

main();
