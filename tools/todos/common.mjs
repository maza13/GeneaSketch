import fs from "node:fs";
import path from "node:path";

export const FILE_RE = /^(\d{3})-(pending|ready|complete)-(p[1-3])-([a-z0-9-]+)\.md$/;
export const VALID_TASK_TYPES = ["leaf", "umbrella"];
export const VALID_RELATIONS = ["precedent", "parallel", "followup", "context"];

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function quoteString(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

export function parseScalar(raw) {
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

  const n = Number(value);
  if (!Number.isNaN(n) && /^-?\d+(\.\d+)?$/.test(value)) return n;
  return value;
}

export function parseFrontmatter(content) {
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

export function serializeValue(v) {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) {
    const parts = v.map((x) => quoteString(x));
    return `[${parts.join(", ")}]`;
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return quoteString(v);
  return String(v);
}

export function serialize(meta, body) {
  const preferredOrder = [
    "protocol_version",
    "task_type",
    "status",
    "priority",
    "issue_id",
    "title",
    "tags",
    "dependencies",
    "child_tasks",
    "related_tasks",
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
  for (const k of ordered) lines.push(`${k}: ${serializeValue(meta[k])}`);
  lines.push("---", "", body.trimEnd(), "");
  return lines.join("\n");
}

export function resolveTodoPath(root, todosDir, todoArg) {
  if (/^\d{3}$/.test(todoArg)) {
    const matches = fs
      .readdirSync(todosDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.startsWith(`${todoArg}-`) && e.name.endsWith(".md"))
      .map((e) => e.name)
      .sort();
    if (matches.length === 0) return null;
    return path.resolve(todosDir, matches[0]);
  }

  const resolved = path.isAbsolute(todoArg) ? todoArg : path.resolve(root, todoArg);
  return fs.existsSync(resolved) ? resolved : null;
}

export function toRepoRelative(root, p) {
  return path.relative(root, p).replace(/\\/g, "/");
}

export function isWithinRoot(root, targetPath) {
  const relative = path.relative(root, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function loadAllTodoNames(todosDir) {
  return fs
    .readdirSync(todosDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name)
    .sort();
}

export function sectionText(body, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^##\\s+${escaped}\\s*$)([\\s\\S]*?)(?=^##\\s|\\Z)`, "m");
  const m = body.match(re);
  if (!m) return null;
  return m[2].trim();
}

export function replaceSection(body, heading, content) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^##\\s+${escaped}\\s*$)([\\s\\S]*?)(?=^##\\s|\\Z)`, "m");
  const replacement = `## ${heading}\n\n${content.trim()}\n\n`;
  if (re.test(body)) return body.replace(re, replacement);
  return `${body.trimEnd()}\n\n${replacement}`;
}

export function appendWorkLog(body, entry) {
  if (body.includes("## Work Log")) {
    return `${body.trimEnd()}\n\n${entry}\n`;
  }
  return `${body.trimEnd()}\n\n## Work Log\n\n${entry}\n`;
}

export function parseChecklist(body, heading = "Acceptance Criteria") {
  const text = sectionText(body, heading);
  if (text === null) return { exists: false, items: [] };

  const items = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => {
      const m = line.match(/^- \[( |x|X)\]\s+(.+)$/);
      if (!m) return null;
      return { checked: m[1].toLowerCase() === "x", text: m[2] };
    })
    .filter(Boolean);

  return { exists: true, items };
}

export function readTodoRecord(root, todosDir, fullPath) {
  const name = path.basename(fullPath);
  const match = name.match(FILE_RE);
  const raw = fs.readFileSync(fullPath, "utf8");
  const parsed = parseFrontmatter(raw);
  return {
    root,
    todosDir,
    fullPath,
    name,
    match,
    raw,
    parsed,
    meta: parsed.meta ?? {},
    body: parsed.body ?? "",
    id: match?.[1] ?? null,
    statusFromName: match?.[2] ?? null,
    priorityFromName: match?.[3] ?? null,
    slugFromName: match?.[4] ?? null
  };
}

export function readTodoRecords(root, todosDir) {
  return loadAllTodoNames(todosDir)
    .map((name) => readTodoRecord(root, todosDir, path.resolve(todosDir, name)))
    .filter((record) => record.match && !record.parsed.error);
}

export function readTodoRecordsMap(root, todosDir) {
  const map = new Map();
  for (const record of readTodoRecords(root, todosDir)) {
    map.set(record.id, record);
  }
  return map;
}

export function dependenciesOf(meta) {
  return Array.isArray(meta.dependencies)
    ? meta.dependencies.filter((d) => typeof d === "string" && /^\d{3}$/.test(d))
    : [];
}

export function childTasksOf(meta) {
  return Array.isArray(meta.child_tasks)
    ? meta.child_tasks.filter((d) => typeof d === "string" && /^\d{3}$/.test(d))
    : [];
}

export function relatedTasksOf(meta) {
  return Array.isArray(meta.related_tasks)
    ? meta.related_tasks.filter((d) => typeof d === "string" && d.trim().length > 0)
    : [];
}

export function protocolVersion(meta) {
  const raw = meta.protocol_version;
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function taskType(meta) {
  return typeof meta.task_type === "string" ? meta.task_type : "leaf";
}

export function relationParts(value) {
  const m = String(value).match(/^(\d{3}):(precedent|parallel|followup|context)$/);
  if (!m) return null;
  return { id: m[1], relation: m[2] };
}

export function parseRelatedItems(meta) {
  return relatedTasksOf(meta)
    .map((item) => relationParts(item))
    .filter(Boolean);
}
