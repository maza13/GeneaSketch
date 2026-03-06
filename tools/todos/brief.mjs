#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  FILE_RE,
  childTasksOf,
  dependenciesOf,
  parseRelatedItems,
  protocolVersion,
  readTodoRecord,
  readTodoRecordsMap,
  resolveTodoPath,
  taskType
} from "./common.mjs";

const ROOT = process.cwd();
const TODOS_DIR = path.resolve(ROOT, "todos");

function die(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { todo: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--todo") {
      opts.todo = argv[++i];
      continue;
    }
    die(`unknown argument '${arg}'`);
  }
  if (!opts.todo) die("missing required --todo <issue_id_or_path>");
  return opts;
}

function nextRecommendedChild(recordMap, record) {
  const children = childTasksOf(record.meta);
  for (const childId of children) {
    const child = recordMap.get(childId);
    if (!child) continue;
    const childStatus = child.meta.status ?? child.statusFromName;
    if (childStatus === "complete") continue;
    const deps = dependenciesOf(child.meta);
    const blockedBy = deps.filter((dep) => {
      const depRecord = recordMap.get(dep);
      return !depRecord || (depRecord.meta.status ?? depRecord.statusFromName) !== "complete";
    });
    return { child, blockedBy };
  }
  return null;
}

function renderStatus(record) {
  return record.meta.status ?? record.statusFromName;
}

function main() {
  if (!fs.existsSync(TODOS_DIR)) die(`todos directory not found: ${TODOS_DIR}`);
  const opts = parseArgs(process.argv.slice(2));
  const todoPath = resolveTodoPath(ROOT, TODOS_DIR, opts.todo);
  if (!todoPath) die(`todo target not found: ${opts.todo}`);

  const record = readTodoRecord(ROOT, TODOS_DIR, todoPath);
  if (!record.match) die(`todo filename does not match expected pattern: ${record.name}`);
  if (record.parsed.error) die(record.parsed.error);

  const map = readTodoRecordsMap(ROOT, TODOS_DIR);
  const type = taskType(record.meta);
  const deps = dependenciesOf(record.meta);
  const related = parseRelatedItems(record.meta);

  console.log(`# TODO Brief: ${record.id} | ${record.meta.title ?? record.slugFromName}`);
  console.log("");
  console.log(`- protocol_version: ${protocolVersion(record.meta) ?? "legacy"}`);
  console.log(`- task_type: ${type}`);
  console.log(`- status: ${renderStatus(record)}`);
  console.log(`- priority: ${record.meta.priority ?? record.priorityFromName}`);
  console.log("");

  console.log("## Hard Dependencies");
  if (deps.length === 0) {
    console.log("- none");
  } else {
    for (const depId of deps) {
      const dep = map.get(depId);
      const status = dep ? renderStatus(dep) : "missing";
      console.log(`- ${depId}: ${status}`);
    }
  }
  console.log("");

  if (type === "umbrella") {
    const children = childTasksOf(record.meta);
    console.log("## Child Execution Order");
    if (children.length === 0) {
      console.log("- none");
    } else {
      for (let i = 0; i < children.length; i += 1) {
        const childId = children[i];
        const child = map.get(childId);
        const status = child ? renderStatus(child) : "missing";
        const title = child?.meta.title ?? child?.slugFromName ?? "missing";
        console.log(`- ${i + 1}. ${childId}: ${status} | ${title}`);
      }
    }
    console.log("");

    console.log("## Related Context");
    if (related.length === 0) {
      console.log("- none");
    } else {
      for (const item of related) {
        const rel = map.get(item.id);
        const status = rel ? renderStatus(rel) : "missing";
        const title = rel?.meta.title ?? rel?.slugFromName ?? "missing";
        console.log(`- ${item.id}: ${item.relation} | ${status} | ${title}`);
      }
    }
    console.log("");

    const next = nextRecommendedChild(map, record);
    console.log("## Next Recommendation");
    if (!next) {
      console.log("- All child tasks are complete.");
    } else if (next.blockedBy.length > 0) {
      console.log(`- Next child in order: ${next.child.id}, but it is blocked by: ${next.blockedBy.join(", ")}.`);
    } else {
      console.log(`- Next child in order: ${next.child.id}.`);
      console.log(`- This child is eligible to move to ready.`);
    }
  } else {
    console.log("## Next Recommendation");
    console.log("- This is a leaf task. Execute it directly when approved.");
  }
}

main();
