#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  FILE_RE,
  appendWorkLog,
  childTasksOf,
  dependenciesOf,
  isWithinRoot,
  parseChecklist,
  parseFrontmatter,
  protocolVersion,
  readTodoRecords,
  resolveTodoPath,
  serialize,
  taskType,
  toRepoRelative,
  today
} from "./common.mjs";

const ROOT = process.cwd();
const TODOS_DIR = path.resolve(ROOT, "todos");
const BLOCK_ORDER = ["outside_repo", "missing", "ignored", "empty", "partial"];

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
      "- No direct dependent task found.",
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

function parseGitStatus(stdout) {
  const entries = [];
  const lines = stdout.split(/\r?\n/).filter((line) => line.trim().length > 0);
  for (const line of lines) {
    if (line.length < 4) continue;
    const status = line.slice(0, 2);
    const payload = line.slice(3).trim();
    const pathPart = payload.includes(" -> ") ? payload.split(" -> ").at(-1) : payload;
    const normalized = pathPart.replace(/^"|"$/g, "").replace(/\\/g, "/");
    entries.push({ status, path: normalized });
  }
  return entries;
}

function uniqueSorted(items) {
  return [...new Set(items)].sort();
}

function labelTarget(kind) {
  if (kind === "directory") return "directory";
  if (kind === "file") return "file";
  return "path";
}

function resolveRequestedArtifacts(rawTargets) {
  return rawTargets.map((raw) => {
    const abs = path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
    const withinRoot = isWithinRoot(ROOT, abs);
    const repoRel = withinRoot ? toRepoRelative(ROOT, abs) : null;

    if (!withinRoot) {
      return {
        input: raw,
        abs,
        repoRel,
        kind: "unknown",
        exists: false,
        state: "outside_repo",
        stageablePaths: [],
        ignoredPaths: [],
        unchangedPaths: [],
        blockedReason: "outside_repo"
      };
    }

    if (!fs.existsSync(abs)) {
      return {
        input: raw,
        abs,
        repoRel,
        kind: "unknown",
        exists: false,
        state: "missing",
        stageablePaths: [],
        ignoredPaths: [],
        unchangedPaths: [],
        blockedReason: "missing"
      };
    }

    const stat = fs.statSync(abs);
    return {
      input: raw,
      abs,
      repoRel,
      kind: stat.isDirectory() ? "directory" : "file",
      exists: true,
      state: "pending",
      stageablePaths: [],
      ignoredPaths: [],
      unchangedPaths: [],
      blockedReason: null
    };
  });
}

function preflightRequestedArtifacts(todoRel, rawTargets) {
  const artifacts = resolveRequestedArtifacts(rawTargets);
  const stageableRequested = artifacts.filter((artifact) => artifact.state === "pending");
  const gitTargets = stageableRequested.map((artifact) => artifact.repoRel);
  const statusEntries = gitTargets.length > 0
    ? (() => {
        const status = run("git", ["status", "--short", "--untracked-files=all", "--ignored=matching", "--", ...gitTargets]);
        if (status.status !== 0) die(`git status failed during preflight:\n${status.stderr || status.stdout}`);
        return parseGitStatus(status.stdout);
      })()
    : [];

  const statusByTarget = new Map();
  for (const artifact of stageableRequested) {
    const checkIgnore = run("git", ["check-ignore", "-q", "--", artifact.repoRel]);
    if (![0, 1].includes(checkIgnore.status)) {
      die(`git check-ignore failed during preflight for '${artifact.repoRel}':\n${checkIgnore.stderr || checkIgnore.stdout}`);
    }
    const exactIgnored = checkIgnore.status === 0;
    const relatedStatuses = statusEntries.filter((entry) => entry.path === artifact.repoRel || entry.path.startsWith(`${artifact.repoRel}/`));
    statusByTarget.set(artifact.repoRel, relatedStatuses);

    const ignored = uniqueSorted(relatedStatuses.filter((entry) => entry.status === "!!").map((entry) => entry.path));
    const changed = uniqueSorted(relatedStatuses.filter((entry) => entry.status !== "!!").map((entry) => entry.path));

    artifact.ignoredPaths = ignored;
    artifact.stageablePaths = artifact.kind === "directory" ? changed : changed.filter((entry) => entry === artifact.repoRel);

    if (artifact.kind === "directory") {
      artifact.unchangedPaths = artifact.stageablePaths.length === 0 && ignored.length === 0 ? [artifact.repoRel] : [];
    } else if (artifact.stageablePaths.length === 0 && !exactIgnored && ignored.length === 0) {
      artifact.unchangedPaths = [artifact.repoRel];
    } else {
      artifact.unchangedPaths = [];
    }

    if (exactIgnored || ignored.length > 0) {
      artifact.state = artifact.stageablePaths.length > 0 ? "partial" : "ignored";
      artifact.blockedReason = artifact.stageablePaths.length > 0 ? "partial" : "ignored";
    } else if (artifact.stageablePaths.length > 0) {
      artifact.state = "ok";
    } else {
      artifact.state = "unchanged";
      artifact.blockedReason = "empty";
    }
  }

  const blocked = {
    outside_repo: artifacts.filter((artifact) => artifact.blockedReason === "outside_repo"),
    missing: artifacts.filter((artifact) => artifact.blockedReason === "missing"),
    ignored: artifacts.filter((artifact) => artifact.blockedReason === "ignored"),
    empty: artifacts.filter((artifact) => artifact.blockedReason === "empty"),
    partial: artifacts.filter((artifact) => artifact.blockedReason === "partial")
  };

  const resolvedStageTargets = uniqueSorted(stageableRequested.flatMap((artifact) => artifact.stageablePaths));
  const unchangedTargets = uniqueSorted(artifacts.flatMap((artifact) => artifact.unchangedPaths));
  const hasBlocked = BLOCK_ORDER.some((key) => blocked[key].length > 0);
  const status =
    blocked.partial.length > 0 || (resolvedStageTargets.length > 0 && hasBlocked)
      ? "blocked_partial"
      : blocked.outside_repo.length > 0
        ? "blocked_outside_repo"
        : blocked.missing.length > 0
          ? "blocked_missing"
          : blocked.ignored.length > 0
            ? "blocked_ignored"
            : rawTargets.length > 0 && resolvedStageTargets.length === 0
              ? "blocked_empty"
              : "ok";

  return {
    todoRel,
    requestedArtifacts: artifacts,
    resolvedStageTargets,
    unchangedTargets,
    status,
    ok: status === "ok",
    blocked
  };
}

function formatArtifactLine(artifact) {
  const parts = [`- ${artifact.input} -> ${artifact.repoRel ?? artifact.abs}`];
  parts.push(`[${labelTarget(artifact.kind)}]`);
  parts.push(`state=${artifact.state}`);
  if (artifact.stageablePaths.length > 0) {
    parts.push(`stageable=${artifact.stageablePaths.join("|")}`);
  }
  if (artifact.ignoredPaths.length > 0) {
    parts.push(`ignored=${artifact.ignoredPaths.join("|")}`);
  }
  if (artifact.unchangedPaths.length > 0) {
    parts.push(`unchanged=${artifact.unchangedPaths.join("|")}`);
  }
  return parts.join(" ");
}

function preflightActionFor(status) {
  if (status === "blocked_outside_repo") return "Use only files or directories that live inside the repository root.";
  if (status === "blocked_missing") return "Create the missing paths first or remove them from --files/--file.";
  if (status === "blocked_ignored") return "Move the artifacts to a tracked path or update .gitignore before retrying.";
  if (status === "blocked_empty") return "Modify the requested files or omit unchanged paths from the close command.";
  if (status === "blocked_partial") return "Resolve blocked paths first; the command refuses partial closure commits.";
  return "Proceed with todo:close.";
}

function formatPreflightReport(preflight) {
  const lines = [
    `todo: ${preflight.todoRel}`,
    `preflight: ${preflight.status}`,
    `resolved stage targets: ${preflight.resolvedStageTargets.length > 0 ? preflight.resolvedStageTargets.join(", ") : "(none)"}`,
    `blocked categories: ${
      BLOCK_ORDER.filter((key) => preflight.blocked[key].length > 0)
        .map((key) => key)
        .join(", ") || "(none)"
    }`
  ];

  if (preflight.unchangedTargets.length > 0) {
    lines.push(`unchanged targets: ${preflight.unchangedTargets.join(", ")}`);
  }

  if (preflight.requestedArtifacts.length > 0) {
    lines.push("requested artifacts:");
    for (const artifact of preflight.requestedArtifacts) {
      lines.push(formatArtifactLine(artifact));
    }
  }

  for (const key of BLOCK_ORDER) {
    const blockedItems = preflight.blocked[key];
    if (blockedItems.length === 0) continue;
    lines.push(`${key}:`);
    for (const artifact of blockedItems) {
      lines.push(`- ${artifact.input} -> ${artifact.repoRel ?? artifact.abs}`);
    }
  }

  lines.push(`recommended action: ${preflightActionFor(preflight.status)}`);
  return lines.join("\n");
}

function maybeSimulateFailure(kind) {
  if (kind === "stage" && process.env.TODO_CLOSE_SIMULATE_STAGE_FAILURE === "1") {
    return { status: 1, stderr: "simulated stage failure", stdout: "" };
  }
  if (kind === "commit" && process.env.TODO_CLOSE_SIMULATE_COMMIT_FAILURE === "1") {
    return { status: 1, stderr: "simulated commit failure", stdout: "" };
  }
  return null;
}

function rollbackTodoMutation(originalPath, originalRaw, closedPath) {
  if (fs.existsSync(closedPath)) {
    fs.unlinkSync(closedPath);
  }
  fs.writeFileSync(originalPath, originalRaw, "utf8");
}

function unstageTodoPaths(todoPaths) {
  if (todoPaths.length === 0) return;
  const reset = run("git", ["reset", "--quiet", "HEAD", "--", ...todoPaths]);
  if (reset.status !== 0) {
    console.warn(`WARN: could not unstage TODO paths after rollback:\n${reset.stderr || reset.stdout}`);
  }
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
  const todoOldRel = toRepoRelative(ROOT, todoPath);
  const todoNewRel = toRepoRelative(ROOT, newPath);
  const preflight = preflightRequestedArtifacts(todoOldRel, opts.files);
  const preflightReport = formatPreflightReport(preflight);
  if (!preflight.ok) {
    die(preflightReport);
  }

  const stageSet = new Set();
  stageSet.add(todoNewRel);
  if (newPath !== todoPath) stageSet.add(todoOldRel);
  for (const stageTarget of preflight.resolvedStageTargets) {
    stageSet.add(stageTarget);
  }
  const stageFiles = [...stageSet];

  if (opts.dryRun) {
    console.log("DRY RUN");
    console.log(`- todo: ${todoNewRel}`);
    console.log(`- commit message: ${commitMessage}`);
    console.log(`- preflight: ${preflight.status}`);
    console.log(`- staged files: ${stageFiles.join(", ")}`);
    console.log(preflightReport);
    return;
  }

  fs.writeFileSync(newPath, newContent, "utf8");
  if (newPath !== todoPath) fs.unlinkSync(todoPath);

  const stageFailure = maybeSimulateFailure("stage");
  const add = stageFailure ?? run("git", ["add", "-A", "--", ...stageFiles]);
  if (add.status !== 0) {
    rollbackTodoMutation(todoPath, raw, newPath);
    unstageTodoPaths(uniqueSorted([todoOldRel, todoNewRel]));
    die(`stage_failed\n${preflightReport}\nraw git error:\n${add.stderr || add.stdout}`);
  }

  const commitFailure = maybeSimulateFailure("commit");
  const commit = commitFailure ?? run("git", ["commit", "-m", commitMessage]);
  if (commit.status !== 0) {
    rollbackTodoMutation(todoPath, raw, newPath);
    unstageTodoPaths(uniqueSorted([todoOldRel, todoNewRel]));
    die(`commit_failed\n${preflightReport}\nraw git error:\n${commit.stderr || commit.stdout}`);
  }

  const hash = run("git", ["rev-parse", "--short", "HEAD"]);
  if (hash.status !== 0) die(`commit created but could not read hash:\n${hash.stderr || hash.stdout}`);

  console.log(`OK: closed todo ${id} with commit ${hash.stdout.trim()}`);
  console.log(`Message: ${commitMessage}`);
  console.log(`File: ${todoNewRel}`);
}

main();
