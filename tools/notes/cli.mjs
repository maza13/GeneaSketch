#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const NOTES_DIR = path.resolve(ROOT, "notes");
const ENTRIES_DIR = path.resolve(NOTES_DIR, "entries");
const INDEX_DIR = path.resolve(NOTES_DIR, "index");
const MIGRATIONS_DIR = path.resolve(INDEX_DIR, "migrations");
const REPORTS_DIR = path.resolve(NOTES_DIR, "reports");
const REGISTRY_PATH = path.resolve(INDEX_DIR, "registry.json");
const TODOS_DIR = path.resolve(ROOT, "todos");

const NOTE_ID_RE = /^N\d{4}$/;
const NOTE_FILE_RE = /^(N\d{4})-(idea|note)-([a-z0-9-]+)\.md$/;
const TODO_FILE_RE = /^(\d{3})-(pending|ready|complete)-(p[1-3])-([a-z0-9-]+)\.md$/;

const REQUIRED_SECTIONS = [
  "## Context",
  "## Insight",
  "## Proposed Actions",
  "## Evolution Log"
];

const ALLOWED = {
  kind: ["idea", "note"],
  phase: ["active", "archived"],
  active_state: ["candidate", "on_hold", "validated"],
  archive_reason: ["promoted", "rejected", "obsolete"],
  source_type: ["user_requested", "auto_inferred"],
  confidence: ["high", "medium", "low"],
  priority_hint: ["p1", "p2", "p3"],
  effort_hint: ["s", "m", "l"],
  complexity: ["simple", "complex"],
  connectivity: ["isolated", "interconnected"],
  horizon: ["near", "mid", "far"]
};

const MOJIBAKE_REPLACEMENTS = [
  ["Ã¡", "á"], ["Ã©", "é"], ["Ã­", "í"], ["Ã³", "ó"], ["Ãº", "ú"],
  ["Ã", "Á"], ["Ã‰", "É"], ["Ã", "Í"], ["Ã“", "Ó"], ["Ãš", "Ú"],
  ["Ã±", "ñ"], ["Ã‘", "Ñ"], ["Ã¼", "ü"], ["Ãœ", "Ü"],
  ["Â¿", "¿"], ["Â¡", "¡"],
  ["â", "'"], ["â", "'"], ["â", "\""], ["â", "\""], ["Â", ""]
];

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function stamp() {
  return nowIso().replace(/[:.]/g, "-");
}

function addDays(dateString, days) {
  const d = new Date(`${dateString}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function ensureDirs() {
  fs.mkdirSync(ENTRIES_DIR, { recursive: true });
  fs.mkdirSync(INDEX_DIR, { recursive: true });
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      opts._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    const hasValue = typeof next === "string" && !next.startsWith("--");
    const value = hasValue ? next : true;
    if (hasValue) i += 1;

    if (opts[key] === undefined) opts[key] = value;
    else if (Array.isArray(opts[key])) opts[key].push(value);
    else opts[key] = [opts[key], value];
  }
  return opts;
}

function asArray(v) {
  if (v === undefined) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

function oneOf(opts, key) {
  const values = asArray(opts[key]);
  if (values.length === 0) return null;
  return String(values.at(-1));
}

function listFromOption(opts, key) {
  return asArray(opts[key])
    .flatMap((x) => String(x).split(","))
    .map((x) => x.trim())
    .filter(Boolean);
}

function slugify(input) {
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "untitled";
}

function quote(v) {
  return `"${String(v).replace(/"/g, '\\"')}"`;
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

  const n = Number(value);
  if (!Number.isNaN(n) && /^-?\d+(\.\d+)?$/.test(value)) return n;
  return value;
}

function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") return { error: "missing opening frontmatter fence '---'" };
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

function serializeValue(v) {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return `[${v.map((x) => quote(x)).join(", ")}]`;
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  return quote(v);
}

function serialize(meta, body) {
  const order = [
    "note_id", "kind", "phase", "active_state", "archive_reason",
    "complexity", "connectivity", "horizon",
    "title", "source_type", "source_context",
    "tags", "related_notes", "related_paths", "related_todos", "promoted_todos",
    "relevance_score", "confidence", "priority_hint", "effort_hint",
    "created_at", "updated_at", "last_reviewed_at", "review_after"
  ];
  const keys = Object.keys(meta);
  const ordered = [];
  for (const key of order) if (keys.includes(key)) ordered.push(key);
  for (const key of keys.sort()) if (!ordered.includes(key)) ordered.push(key);
  const lines = ["---"];
  for (const key of ordered) lines.push(`${key}: ${serializeValue(meta[key])}`);
  lines.push("---", "", body.trimEnd(), "");
  return lines.join("\n");
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || out.includes(trimmed)) continue;
    out.push(trimmed);
  }
  return out;
}

function uniqStrings(value) {
  return [...new Set(normalizeStringArray(value))];
}

function sectionText(body, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^${escaped}\\s*$)([\\s\\S]*?)(?=^##\\s|\\Z)`, "m");
  const m = body.match(re);
  if (!m) return null;
  return m[2].trim();
}

function replaceSection(body, heading, content) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^${escaped}\\s*$)([\\s\\S]*?)(?=^##\\s|\\Z)`, "m");
  const replacement = `${heading}\n\n${content.trim()}\n\n`;
  if (re.test(body)) return body.replace(re, replacement);
  return `${body.trimEnd()}\n\n${replacement}`;
}

function replaceSectionPrefix(body, headingCore, content) {
  const escaped = headingCore.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^##\\s+${escaped}[^\\n]*$)([\\s\\S]*?)(?=^##\\s|\\Z)`, "m");
  const replacement = `## ${headingCore}\n\n${content.trim()}\n\n`;
  if (re.test(body)) return body.replace(re, replacement);
  return `${body.trimEnd()}\n\n${replacement}`;
}

function appendEvolution(body, title, bullets) {
  const section = "## Evolution Log";
  const entry = [`### ${today()} - ${title}`, "", ...bullets.map((b) => `- ${b}`), ""].join("\n");
  if (!body.includes(section)) return `${body.trimEnd()}\n\n${section}\n\n${entry}`;
  return `${body.trimEnd()}\n\n${entry}`;
}

function isDateString(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function listNotePaths() {
  ensureDirs();
  return fs
    .readdirSync(ENTRIES_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => path.resolve(ENTRIES_DIR, e.name))
    .sort();
}

function readRecord(filePath) {
  const name = path.basename(filePath);
  const fileMatch = name.match(NOTE_FILE_RE);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = parseFrontmatter(raw);
  return {
    path: filePath,
    name,
    fileMatch,
    idFromName: fileMatch?.[1] ?? null,
    kindFromName: fileMatch?.[2] ?? null,
    slugFromName: fileMatch?.[3] ?? null,
    parseError: parsed.error ?? null,
    meta: parsed.meta ?? {},
    body: parsed.body ?? "",
    errors: [],
    warnings: []
  };
}

function writeRecord(record) {
  fs.writeFileSync(record.path, serialize(record.meta, record.body), "utf8");
}

function readRegistrySafe() {
  const fallback = {
    generated_at: null,
    total_entries: 0,
    by_id: {},
    by_kind: { idea: [], note: [] },
    by_phase: { active: [], archived: [] },
    by_tag: {},
    by_connectivity: { isolated: [], interconnected: [] },
    by_complexity: { simple: [], complex: [] },
    graph: { related_notes: {} },
    signals: {},
    promotion_state: {},
    analysis_state: {
      last_global_summary: null,
      last_analysis: null,
      last_deep_analysis: null
    },
    encoding_state: {
      status: "unknown",
      last_doctor_run: null,
      suspicious_files: [],
      repaired_files: []
    }
  };
  if (!fs.existsSync(REGISTRY_PATH)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  } catch {
    return fallback;
  }
}

function collectTodos() {
  if (!fs.existsSync(TODOS_DIR)) return [];
  return fs
    .readdirSync(TODOS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name)
    .map((name) => {
      const m = name.match(TODO_FILE_RE);
      if (!m) return null;
      const [, id, status, priority, slug] = m;
      return { id, status, priority, slug, name };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.id) - Number(b.id));
}

function todoContext() {
  const todos = collectTodos();
  const counts = { pending: 0, ready: 0, complete: 0 };
  for (const t of todos) if (counts[t.status] !== undefined) counts[t.status] += 1;
  return { todos, counts };
}

function changelogContext() {
  const changelogPath = path.resolve(ROOT, "CHANGELOG.md");
  if (!fs.existsSync(changelogPath)) return { latest: "n/a", headings: [] };
  const text = fs.readFileSync(changelogPath, "utf8");
  const headings = [...text.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
  return { latest: headings[0] ?? "n/a", headings };
}

function validateRecord(record, allIds) {
  if (!record.fileMatch) {
    record.errors.push("invalid filename pattern; expected N0001-kind-slug.md with kind=idea|note");
    return record;
  }
  if (record.parseError) {
    record.errors.push(record.parseError);
    return record;
  }

  const required = [
    "note_id",
    "kind",
    "phase",
    "complexity",
    "connectivity",
    "title",
    "source_type",
    "created_at",
    "updated_at"
  ];
  for (const field of required) {
    if (record.meta[field] === undefined || record.meta[field] === null || record.meta[field] === "") {
      record.errors.push(`missing required field '${field}'`);
    }
  }

  if (record.meta.note_id && !NOTE_ID_RE.test(String(record.meta.note_id))) {
    record.errors.push(`note_id must match N0001 pattern, got '${String(record.meta.note_id)}'`);
  }
  if (record.meta.note_id && record.meta.note_id !== record.idFromName) {
    record.errors.push(`note_id '${record.meta.note_id}' must match filename id '${record.idFromName}'`);
  }

  if (!ALLOWED.kind.includes(record.meta.kind)) record.errors.push(`invalid kind '${String(record.meta.kind)}'; allowed: idea|note`);
  if (record.meta.kind && record.meta.kind !== record.kindFromName) {
    record.errors.push(`kind '${record.meta.kind}' must match filename kind '${record.kindFromName}'`);
  }
  if (!ALLOWED.phase.includes(record.meta.phase)) record.errors.push(`invalid phase '${String(record.meta.phase)}'`);
  if (!ALLOWED.complexity.includes(record.meta.complexity)) record.errors.push(`invalid complexity '${String(record.meta.complexity)}'`);
  if (!ALLOWED.connectivity.includes(record.meta.connectivity)) record.errors.push(`invalid connectivity '${String(record.meta.connectivity)}'`);

  record.meta.horizon = record.meta.horizon ?? "mid";
  if (!ALLOWED.horizon.includes(record.meta.horizon)) record.errors.push(`invalid horizon '${String(record.meta.horizon)}'`);
  if (!ALLOWED.source_type.includes(record.meta.source_type)) record.errors.push(`invalid source_type '${String(record.meta.source_type)}'`);

  if (!isDateString(record.meta.created_at)) record.errors.push(`created_at must be YYYY-MM-DD, got '${String(record.meta.created_at)}'`);
  if (!isDateString(record.meta.updated_at)) record.errors.push(`updated_at must be YYYY-MM-DD, got '${String(record.meta.updated_at)}'`);
  if (record.meta.last_reviewed_at !== null && record.meta.last_reviewed_at !== undefined && !isDateString(record.meta.last_reviewed_at)) {
    record.errors.push(`last_reviewed_at must be YYYY-MM-DD or null, got '${String(record.meta.last_reviewed_at)}'`);
  }
  if (record.meta.review_after !== null && record.meta.review_after !== undefined && !isDateString(record.meta.review_after)) {
    record.errors.push(`review_after must be YYYY-MM-DD or null, got '${String(record.meta.review_after)}'`);
  }

  if (record.meta.phase === "active") {
    if (!ALLOWED.active_state.includes(record.meta.active_state)) record.errors.push("active_state is required when phase='active'");
    if (record.meta.archive_reason !== null && record.meta.archive_reason !== undefined) record.warnings.push("archive_reason should be null when phase='active'");
  }
  if (record.meta.phase === "archived") {
    if (!ALLOWED.archive_reason.includes(record.meta.archive_reason)) record.errors.push("archive_reason is required when phase='archived'");
  }
  if (record.meta.source_type === "auto_inferred") {
    if (!(typeof record.meta.source_context === "string" && record.meta.source_context.trim().length > 0)) {
      record.errors.push("source_context is required when source_type='auto_inferred'");
    }
  }

  record.meta.confidence = record.meta.confidence ?? "medium";
  if (!ALLOWED.confidence.includes(record.meta.confidence)) record.errors.push(`invalid confidence '${String(record.meta.confidence)}'`);
  record.meta.priority_hint = record.meta.priority_hint ?? "p2";
  if (!ALLOWED.priority_hint.includes(record.meta.priority_hint)) record.errors.push(`invalid priority_hint '${String(record.meta.priority_hint)}'`);
  record.meta.effort_hint = record.meta.effort_hint ?? "m";
  if (!ALLOWED.effort_hint.includes(record.meta.effort_hint)) record.errors.push(`invalid effort_hint '${String(record.meta.effort_hint)}'`);

  record.meta.tags = uniqStrings(record.meta.tags ?? []);
  record.meta.related_notes = uniqStrings(record.meta.related_notes ?? []);
  record.meta.related_paths = uniqStrings(record.meta.related_paths ?? []);
  record.meta.related_todos = uniqStrings(record.meta.related_todos ?? []);
  record.meta.promoted_todos = uniqStrings(record.meta.promoted_todos ?? []);

  for (const ref of record.meta.related_notes) {
    if (!NOTE_ID_RE.test(ref)) {
      record.errors.push(`related_notes '${ref}' must match N0001`);
      continue;
    }
    if (ref === record.meta.note_id) record.errors.push("self-reference in related_notes is not allowed");
    if (allIds && !allIds.has(ref)) record.warnings.push(`related note '${ref}' does not exist`);
  }
  for (const todo of [...record.meta.related_todos, ...record.meta.promoted_todos]) {
    if (!/^\d{3}$/.test(todo)) record.errors.push(`todo reference '${todo}' must be 3 digits`);
  }

  if (
    record.meta.relevance_score !== undefined &&
    record.meta.relevance_score !== null &&
    !(typeof record.meta.relevance_score === "number" && record.meta.relevance_score >= 0 && record.meta.relevance_score <= 100)
  ) {
    record.errors.push("relevance_score must be numeric 0..100");
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!record.body.includes(section)) record.errors.push(`missing required section '${section}'`);
  }

  if (record.meta.connectivity === "interconnected" && record.meta.related_notes.length === 0) record.warnings.push("connectivity is interconnected but related_notes is empty");
  if (record.meta.connectivity === "isolated" && record.meta.related_notes.length > 0) record.warnings.push("connectivity is isolated but related_notes has links");

  return record;
}

function loadValidated(targetPaths = null) {
  const paths = targetPaths ?? listNotePaths();
  const records = paths.map((p) => readRecord(p));
  const ids = new Set(records.map((r) => r.meta.note_id).filter((id) => typeof id === "string" && NOTE_ID_RE.test(id)));
  return records.map((record) => validateRecord(record, ids));
}

function printValidation(records, mode) {
  const invalid = records.filter((r) => r.errors.length > 0);
  const warned = records.filter((r) => r.warnings.length > 0);
  if (invalid.length > 0) {
    const issues = invalid.reduce((n, r) => n + r.errors.length, 0);
    console.error(`FAIL (${mode}): ${invalid.length}/${records.length} notes violate schema v2 (${issues} issues).`);
    for (const r of invalid) {
      console.error(`\n- ${r.name}`);
      for (const e of r.errors) console.error(`  * ${e}`);
      for (const w of r.warnings) console.error(`  - warning: ${w}`);
    }
    process.exit(1);
  }
  console.log(`OK (${mode}): ${records.length} notes satisfy schema v2.`);
  if (warned.length > 0) {
    const total = warned.reduce((n, r) => n + r.warnings.length, 0);
    console.log(`WARN: ${warned.length} notes have ${total} non-blocking warnings.`);
  }
}

function sortedByCreated(records) {
  return [...records].sort((a, b) => {
    const ca = String(a.meta.created_at ?? "");
    const cb = String(b.meta.created_at ?? "");
    if (ca !== cb) return ca.localeCompare(cb);
    return String(a.meta.note_id ?? "").localeCompare(String(b.meta.note_id ?? ""));
  });
}

function buildRegistry(records) {
  const previous = readRegistrySafe();
  const byId = {};
  const byKind = { idea: [], note: [] };
  const byPhase = { active: [], archived: [] };
  const byTag = {};
  const byConnectivity = { isolated: [], interconnected: [] };
  const byComplexity = { simple: [], complex: [] };
  const graph = {};
  const signals = {};
  const promotion = {};

  for (const record of sortedByCreated(records)) {
    const id = record.meta.note_id;
    byId[id] = {
      file: path.relative(ROOT, record.path).replace(/\\/g, "/"),
      title: record.meta.title,
      kind: record.meta.kind,
      phase: record.meta.phase,
      complexity: record.meta.complexity,
      connectivity: record.meta.connectivity,
      horizon: record.meta.horizon,
      active_state: record.meta.active_state ?? null,
      archive_reason: record.meta.archive_reason ?? null,
      source_type: record.meta.source_type,
      tags: record.meta.tags,
      related_notes: record.meta.related_notes,
      related_todos: record.meta.related_todos,
      promoted_todos: record.meta.promoted_todos,
      relevance_score: record.meta.relevance_score ?? 50,
      confidence: record.meta.confidence,
      created_at: record.meta.created_at,
      updated_at: record.meta.updated_at,
      last_reviewed_at: record.meta.last_reviewed_at ?? null,
      review_after: record.meta.review_after ?? null
    };
    byKind[record.meta.kind].push(id);
    byPhase[record.meta.phase].push(id);
    byConnectivity[record.meta.connectivity].push(id);
    byComplexity[record.meta.complexity].push(id);
    for (const tag of record.meta.tags) {
      if (!byTag[tag]) byTag[tag] = [];
      byTag[tag].push(id);
    }
    graph[id] = record.meta.related_notes;
    signals[id] = {
      relevance_score: record.meta.relevance_score ?? 50,
      confidence: record.meta.confidence,
      horizon: record.meta.horizon,
      last_reviewed_at: record.meta.last_reviewed_at ?? null,
      review_after: record.meta.review_after ?? null
    };
    promotion[id] = {
      is_promoted: record.meta.promoted_todos.length > 0,
      promoted_todos: record.meta.promoted_todos
    };
  }

  return {
    generated_at: nowIso(),
    total_entries: records.length,
    by_id: byId,
    by_kind: byKind,
    by_phase: byPhase,
    by_tag: byTag,
    by_connectivity: byConnectivity,
    by_complexity: byComplexity,
    graph: { related_notes: graph },
    signals,
    promotion_state: promotion,
    analysis_state: previous.analysis_state ?? {
      last_global_summary: null,
      last_analysis: null,
      last_deep_analysis: null
    },
    encoding_state: previous.encoding_state ?? {
      status: "unknown",
      last_doctor_run: null,
      suspicious_files: [],
      repaired_files: []
    }
  };
}

function writeRegistry(registry) {
  fs.writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

function rebuildRegistryOrFail() {
  const records = loadValidated();
  const invalid = records.filter((r) => r.errors.length > 0);
  if (invalid.length > 0) {
    printValidation(records, "index");
    return null;
  }
  const registry = buildRegistry(records);
  writeRegistry(registry);
  return registry;
}

function nextNoteId() {
  const ids = listNotePaths()
    .map((p) => path.basename(p).match(/^N(\d{4})-/)?.[1])
    .filter(Boolean)
    .map((x) => Number(x));
  const max = ids.length > 0 ? Math.max(...ids) : 0;
  return `N${String(max + 1).padStart(4, "0")}`;
}

function defaultMeta(input) {
  return {
    note_id: input.note_id,
    kind: input.kind ?? "note",
    phase: input.phase ?? "active",
    active_state: input.active_state ?? "candidate",
    archive_reason: input.archive_reason ?? null,
    complexity: input.complexity ?? "simple",
    connectivity: input.connectivity ?? "isolated",
    horizon: input.horizon ?? "mid",
    title: input.title ?? "untitled",
    source_type: input.source_type ?? "user_requested",
    source_context: input.source_context ?? null,
    tags: uniqStrings(input.tags ?? []),
    related_notes: uniqStrings(input.related_notes ?? []),
    related_paths: uniqStrings(input.related_paths ?? []),
    related_todos: uniqStrings(input.related_todos ?? []),
    promoted_todos: uniqStrings(input.promoted_todos ?? []),
    relevance_score: typeof input.relevance_score === "number" ? input.relevance_score : 50,
    confidence: input.confidence ?? "medium",
    priority_hint: input.priority_hint ?? "p2",
    effort_hint: input.effort_hint ?? "m",
    created_at: input.created_at ?? today(),
    updated_at: input.updated_at ?? today(),
    last_reviewed_at: input.last_reviewed_at ?? null,
    review_after: input.review_after ?? null
  };
}

function defaultBody(title, sourceType, sourceContext) {
  return [
    `# ${title}`,
    "",
    "## Context",
    "",
    "Describe context and why this note exists.",
    "",
    "## Insight",
    "",
    "Capture the key idea/findings.",
    "",
    "## Proposed Actions",
    "",
    "- Define the next concrete action",
    "",
    "## Evolution Log",
    "",
    `### ${today()} - Entry created`,
    "",
    `- Source type: ${sourceType}`,
    `- Source context: ${sourceContext ?? "n/a"}`,
    ""
  ].join("\n");
}

function resolveNotePath(noteArg) {
  if (!noteArg) fail("missing --note <N0001|slug|path>");
  if (NOTE_ID_RE.test(noteArg)) {
    const found = listNotePaths().find((p) => path.basename(p).startsWith(`${noteArg}-`));
    if (!found) fail(`note '${noteArg}' not found`);
    return found;
  }
  const normalized = slugify(noteArg);
  const foundBySlug = listNotePaths().find((p) => path.basename(p).includes(`-${normalized}.md`));
  if (foundBySlug) return foundBySlug;
  const resolved = path.isAbsolute(noteArg) ? noteArg : path.resolve(ROOT, noteArg);
  if (!fs.existsSync(resolved)) fail(`note path not found: ${resolved}`);
  return resolved;
}

function resolveFocus(records, focusArg) {
  if (!focusArg) return null;
  const normalized = slugify(focusArg);
  return (
    records.find((r) => r.meta.note_id === focusArg) ||
    records.find((r) => slugify(r.meta.title) === normalized) ||
    records.find((r) => r.name.includes(normalized)) ||
    null
  );
}

function detectThemes(records) {
  const counts = new Map();
  for (const r of records) for (const tag of r.meta.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag]) => tag);
}

function detectDifficulty(records) {
  if (records.length === 0) return "No notes available.";
  const complex = records.filter((r) => r.meta.complexity === "complex").length;
  const highEffort = records.filter((r) => r.meta.effort_hint === "l").length;
  if (complex >= Math.ceil(records.length / 2)) return "Portfolio leans toward complex notes.";
  if (highEffort >= Math.ceil(records.length / 2)) return "Many notes imply high implementation effort.";
  return "Portfolio is mostly incremental/simple.";
}

function detectInterconnections(records) {
  const edges = records.reduce((n, r) => n + r.meta.related_notes.length, 0);
  if (edges === 0) return "Notes are mostly isolated.";
  if (edges < records.length) return "Interconnections exist but graph is still sparse.";
  return "Notes are strongly interconnected.";
}

function detectIncompatibilities(records) {
  const hasCloud = records.some((r) => r.meta.tags.some((t) => ["api", "social", "cloud"].includes(t)));
  const hasLocal = records.some((r) => r.meta.tags.some((t) => ["offline", "privacy", "local-first"].includes(t)));
  const hasResearch = records.some((r) => r.meta.tags.some((t) => ["gps", "research-focus"].includes(t)));
  const hasGamification = records.some((r) => r.meta.tags.includes("gamification"));
  const out = [];
  if (hasCloud && hasLocal) out.push("cloud/social expansion can conflict with strict local-first/privacy goals");
  if (hasResearch && hasGamification) out.push("research rigor and gamification may require separate UX lanes");
  return out;
}

function contextualScore(record, mode, todoCtx, changelogCtx) {
  let score = typeof record.meta.relevance_score === "number" ? record.meta.relevance_score : 50;
  const text = `${record.meta.title} ${record.meta.tags.join(" ")}`.toLowerCase();
  if (mode !== "summary" && /hard-cut|legacy|compat/i.test(changelogCtx?.latest ?? "") && /core|schema|data|provenance|gps/.test(text)) {
    score += 5;
  }
  if (mode === "deep-analysis") {
    let matches = 0;
    for (const todo of (todoCtx?.todos ?? []).filter((t) => t.status !== "complete")) {
      const words = todo.slug.split("-").filter((w) => w.length > 4);
      if (words.some((w) => text.includes(w))) matches += 1;
    }
    score += Math.min(9, matches * 3);
  }
  return Math.max(0, Math.min(100, score));
}

function standout(records, mode, todoCtx, changelogCtx) {
  return [...records]
    .map((r) => ({ record: r, score: contextualScore(r, mode, todoCtx, changelogCtx) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter((x) => x.score >= 70);
}

function suggestions(records, mode, todoCtx, changelogCtx) {
  const out = [];
  if (mode !== "summary" && /hard-cut|legacy|compat/i.test(changelogCtx?.latest ?? "")) {
    const hasLegacy = records.some((r) => /legacy|compat|migrat/i.test(`${r.meta.title} ${r.meta.tags.join(" ")}`));
    if (!hasLegacy) {
      out.push({
        type: "note",
        confidence: "high",
        title: "Legacy compatibility watchlist",
        rationale: "Changelog indicates legacy compatibility transitions."
      });
    }
  }
  if (mode === "deep-analysis") {
    const linkedTodos = new Set(records.flatMap((r) => r.meta.related_todos));
    for (const todo of (todoCtx?.todos ?? []).filter((t) => t.status !== "complete")) {
      if (linkedTodos.has(todo.id)) continue;
      out.push({
        type: "note",
        confidence: todo.priority === "p1" ? "high" : "medium",
        title: `Context note for TODO ${todo.id}: ${todo.slug.replace(/-/g, " ")}`,
        rationale: `Open TODO ${todo.id} has no linked note.`
      });
    }
  }
  return out.slice(0, 5);
}

function inferComplexity(record) {
  if (record.meta.effort_hint === "l") return "complex";
  if (/integra|oauth|migr|arquitect|merge|conflict|sync/i.test(record.meta.title)) return "complex";
  return "simple";
}

function inferConnectivity(record) {
  return record.meta.related_notes.length > 0 || record.meta.related_todos.length > 0 ? "interconnected" : "isolated";
}

function inferHorizon(record, todoCtx, deepCtx) {
  const text = `${record.meta.title} ${record.meta.tags.join(" ")}`.toLowerCase();
  if (/future|futuro|vision|social|gamification|monetiz|api|cloud|ai|automation/.test(text)) return "far";
  if (/core|schema|data|provenance|gps|legacy|compat/.test(text)) return "near";
  if (todoCtx.todos.some((t) => t.status !== "complete" && /legacy|compat|hard-cut/.test(t.slug)) && /core|schema|data/.test(text)) return "near";
  if (deepCtx && deepCtx.paths.some((p) => p.startsWith("src/core")) && /core|schema|data/.test(text)) return "near";
  return "mid";
}

function renderGlobal(level, mode, records, todoCtx, changelogCtx) {
  const lines = [];
  const themes = detectThemes(records);
  const diff = detectDifficulty(records);
  const links = detectInterconnections(records);
  const incompat = detectIncompatibilities(records);
  const top = standout(records, mode, todoCtx, changelogCtx);

  lines.push(`# Notes ${level}`);
  lines.push("");
  lines.push(`Generated: ${nowIso()}`);
  lines.push("");
  lines.push("## Global Summary");
  lines.push("");
  lines.push(`- Dominant themes: ${themes.length > 0 ? themes.join(", ") : "none identified"}.`);
  lines.push(`- Difficulty profile: ${diff}`);
  lines.push(`- Interconnection profile: ${links}`);
  if (incompat.length > 0) lines.push(`- Potential incompatibilities: ${incompat.join(" | ")}.`);
  else lines.push("- No obvious strategic incompatibilities detected.");
  if (mode === "deep-analysis") {
    lines.push(`- TODO context: pending=${todoCtx?.counts.pending ?? 0}, ready=${todoCtx?.counts.ready ?? 0}, complete=${todoCtx?.counts.complete ?? 0}.`);
    lines.push(`- Changelog context: ${changelogCtx.latest}.`);
  } else if (mode === "analysis") {
    lines.push(`- Changelog context: ${changelogCtx.latest}.`);
  }
  lines.push("");
  lines.push("## Context-Relevant Notes");
  lines.push("");
  if (top.length === 0) lines.push("- No note significantly stands out for current context.");
  else for (const item of top) lines.push(`- ${item.record.meta.note_id} (${item.record.meta.kind}) score=${item.score}: ${item.record.meta.title}`);
  return lines;
}

function renderRecommendations(lines, obviousOnly, records, suggested) {
  const recs = [];
  const low = records.filter((r) => r.meta.confidence === "low").map((r) => r.meta.note_id);
  if (low.length > 0) recs.push(`Refresh low-confidence notes: ${low.join(", ")}.`);
  const isolatedComplex = records.filter((r) => r.meta.complexity === "complex" && r.meta.related_notes.length === 0 && r.meta.related_todos.length === 0).map((r) => r.meta.note_id);
  if (isolatedComplex.length > 0) recs.push(`Complex isolated notes should add references: ${isolatedComplex.join(", ")}.`);
  if (!obviousOnly) for (const s of suggested.slice(0, 3)) recs.push(`Derived ${s.type}: '${s.title}' (${s.rationale})`);
  lines.push("");
  lines.push("## Recommendations");
  lines.push("");
  if (recs.length === 0) lines.push("- No obvious recommendation at this time.");
  else for (const r of recs) lines.push(`- ${r}`);
}

function renderFocus(lines, focusRecord, mode, todoCtx, changelogCtx) {
  lines.push("");
  lines.push("## Focused Note");
  lines.push("");
  if (!focusRecord) {
    lines.push("- Focus target not found.");
    return;
  }
  const score = contextualScore(focusRecord, mode, todoCtx, changelogCtx);
  lines.push(`- Target: ${focusRecord.meta.note_id} - ${focusRecord.meta.title}`);
  lines.push(`- Kind/phase: ${focusRecord.meta.kind}/${focusRecord.meta.phase}`);
  lines.push(`- Complexity/connectivity: ${focusRecord.meta.complexity}/${focusRecord.meta.connectivity}`);
  lines.push(`- Horizon: ${focusRecord.meta.horizon}`);
  lines.push(`- Contextual relevance (${mode}): ${score}`);
  lines.push(`- Related notes: ${focusRecord.meta.related_notes.length > 0 ? focusRecord.meta.related_notes.join(", ") : "none"}`);
  lines.push(`- Related todos: ${focusRecord.meta.related_todos.length > 0 ? focusRecord.meta.related_todos.join(", ") : "none"}`);
}

function renderList(lines, records) {
  const sorted = sortedByCreated(records);
  const ideas = sorted.filter((r) => r.meta.kind === "idea");
  const notes = sorted.filter((r) => r.meta.kind === "note");
  lines.push("");
  lines.push("## Ordered Lists");
  lines.push("");
  lines.push("### Ideas (creation order)");
  if (ideas.length === 0) lines.push("- none");
  for (const r of ideas) lines.push(`- ${r.meta.note_id} | ${r.meta.created_at} | ${r.meta.title}`);
  lines.push("");
  lines.push("### Notes (creation order)");
  if (notes.length === 0) lines.push("- none");
  for (const r of notes) lines.push(`- ${r.meta.note_id} | ${r.meta.created_at} | ${r.meta.title}`);
}

function inferKindFromText(text) {
  const t = text.toLowerCase();
  if (/idea|propuesta|vision|futuro|hipotesis|what if/.test(t)) return "idea";
  return "note";
}

function inferTagsFromText(text) {
  const t = text.toLowerCase();
  const tags = [];
  const map = [
    ["api", ["api", "integracion", "wikitree", "familysearch"]],
    ["core", ["core", "engine", "schema", "gschema", "modelo"]],
    ["ai", ["ai", "ia", "agent", "autonom"]],
    ["social", ["social", "cooperativo", "familia"]],
    ["gamification", ["gamification", "gamificacion", "achievement", "retention"]],
    ["legacy", ["legacy", "compat", "migracion", "hard cut"]],
    ["ux", ["ux", "ui", "experiencia"]]
  ];
  for (const [tag, words] of map) if (words.some((w) => t.includes(w))) tags.push(tag);
  for (const hash of text.match(/#[a-zA-Z0-9_-]+/g) ?? []) tags.push(hash.slice(1).toLowerCase());
  return uniqStrings(tags);
}

function inferHorizonFromText(text) {
  const t = text.toLowerCase();
  if (/futuro|future|vision|largo plazo|cloud|social|monetiz/.test(t)) return "far";
  if (/ahora|current|legacy|hard cut|compat|core/.test(t)) return "near";
  return "mid";
}

function inferComplexityFromText(text) {
  const t = text.toLowerCase();
  if (/arquitect|migracion|integracion|oauth|sincron|conflict|merge|core/.test(t)) return "complex";
  return "simple";
}

function titleFromText(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Captured note";
  const sentence = cleaned.split(/[.!?\n]/)[0].trim();
  return sentence.slice(0, 90) || "Captured note";
}

function tokenize(text) {
  return new Set(slugify(text).split("-").filter((x) => x.length > 2));
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function dedupe(records, title, tags) {
  const target = tokenize(`${title} ${tags.join(" ")}`);
  let best = null;
  for (const r of records) {
    const base = tokenize(`${r.meta.title} ${r.meta.tags.join(" ")}`);
    const score = jaccard(target, base);
    if (!best || score > best.score) best = { record: r, score };
  }
  if (best && best.score >= 0.55) return best;
  return null;
}

function captureInternal(text, sourceType, sourceContext, silent) {
  const records = loadValidated().filter((r) => r.errors.length === 0);
  const title = titleFromText(text);
  const tags = inferTagsFromText(text);
  const kind = inferKindFromText(text);
  const complexity = inferComplexityFromText(text);
  const horizon = inferHorizonFromText(text);

  const match = dedupe(records, title, tags);
  if (match) {
    const record = match.record;
    const reason = `similarity=${match.score.toFixed(2)}`;
    record.meta.tags = uniqStrings([...record.meta.tags, ...tags]);
    record.meta.complexity = inferComplexity(record);
    record.meta.horizon = inferHorizon(record, todoContext(), null);
    record.meta.updated_at = today();
    record.meta.last_reviewed_at = today();
    const baseContext = sectionText(record.body, "## Context") ?? "";
    record.body = replaceSection(record.body, "## Context", `${baseContext}\n\nCaptured signal (${today()}): ${text.slice(0, 220)}`.trim());
    record.body = appendEvolution(record.body, "Auto capture merged", [
      `Source type: ${sourceType}`,
      `Source context: ${sourceContext}`,
      `Reason: ${reason}`
    ]);
    writeRecord(record);
    rebuildRegistryOrFail();
    if (!silent) console.log(`UPDATED ${record.meta.note_id} - ${reason}`);
    return { action: "UPDATED", id: record.meta.note_id, reason };
  }

  const noteId = nextNoteId();
  const meta = defaultMeta({
    note_id: noteId,
    kind,
    title,
    source_type: sourceType,
    source_context: sourceType === "auto_inferred" ? sourceContext : null,
    complexity,
    connectivity: "isolated",
    horizon,
    tags,
    relevance_score: sourceType === "auto_inferred" ? 70 : 60,
    confidence: sourceType === "auto_inferred" ? "high" : "medium"
  });
  let body = defaultBody(title, sourceType, sourceContext);
  body = replaceSection(body, "## Context", text.slice(0, 800));
  body = replaceSection(body, "## Proposed Actions", "- Review this captured note and link relevant TODO or notes.");
  const filePath = path.resolve(ENTRIES_DIR, `${noteId}-${kind}-${slugify(title)}.md`);
  fs.writeFileSync(filePath, serialize(meta, body), "utf8");
  rebuildRegistryOrFail();
  if (!silent) console.log(`CREATED ${noteId} - new capture from detected intent`);
  return { action: "CREATED", id: noteId, reason: "new capture" };
}

function listTargets(opts) {
  const paths = [];
  for (const n of listFromOption(opts, "note")) paths.push(resolveNotePath(n));
  for (const f of listFromOption(opts, "files")) paths.push(resolveNotePath(f));
  return [...new Set(paths)];
}

function nextTodoIds(count) {
  const ids = collectTodos().map((t) => Number(t.id));
  let current = ids.length > 0 ? Math.max(...ids) : 0;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    current += 1;
    out.push(String(current).padStart(3, "0"));
  }
  return out;
}

function readTodoTemplate() {
  const candidates = [
    path.resolve(ROOT, ".agents/skills/file-todos/assets/todo-template.md"),
    path.resolve(ROOT, ".agent/skills/file-todos/assets/todo-template.md")
  ];
  for (const c of candidates) if (fs.existsSync(c)) return fs.readFileSync(c, "utf8");
  fail("file-todos template not found");
}

function buildTodoFromTemplate(payload) {
  const parsed = parseFrontmatter(readTodoTemplate());
  if (parsed.error) fail(`cannot parse file-todos template: ${parsed.error}`);
  const meta = {
    ...parsed.meta,
    protocol_version: 2,
    task_type: payload.task_type ?? "leaf",
    status: "pending",
    priority: payload.priority,
    issue_id: payload.issue_id,
    title: payload.title,
    tags: uniqStrings([...(Array.isArray(parsed.meta.tags) ? parsed.meta.tags : []), "notes", `note:${payload.note_id}`]),
    dependencies: uniqStrings(payload.dependencies ?? []),
    child_tasks: uniqStrings(payload.child_tasks ?? []),
    related_tasks: uniqStrings(payload.related_tasks ?? []),
    owner: "codex",
    created_at: today(),
    updated_at: today(),
    risk_level: payload.risk_level ?? "medium",
    estimated_effort: payload.effort ?? "m",
    complexity: payload.complexity,
    auto_closure: true,
    commit_confirmed: false,
    commit_message: null,
    closed_at: null
  };
  let body = parsed.body;
  body = body.replace(/^#\s+.*$/m, `# ${payload.title}`);
  body = replaceSectionPrefix(body, "Problem Statement", payload.problem);
  body = replaceSectionPrefix(body, "Findings", payload.findings || "No findings captured yet.");
  body = replaceSectionPrefix(body, "Proposed Solutions", payload.proposed || "- Execute according to promoted note context.");
  body = replaceSectionPrefix(body, "Recommended Action", payload.recommended_action);
  if (payload.task_type === "umbrella") {
    body = replaceSectionPrefix(
      body,
      "Orchestration Guide",
      payload.orchestration ||
        [
          "### Hard Dependencies",
          "",
          payload.dependencies.length > 0
            ? payload.dependencies.map((dep) => `- ${dep}: must be complete before preparing this umbrella.`).join("\n")
            : "- none",
          "",
          "### Child Execution Order",
          "",
          payload.child_tasks.length > 0
            ? payload.child_tasks.map((id, index) => `${index + 1}. ${id} - execute in declared order.`).join("\n")
            : "- define child tasks before execution",
          "",
          "### Related Context",
          "",
          payload.related_tasks.length > 0
            ? payload.related_tasks.map((rel) => `- ${rel}`).join("\n")
            : "- none",
          "",
          "### Exit Rule",
          "",
          "- Close this umbrella only after all child tasks are complete and their outputs are cross-checked."
        ].join("\n")
    );
  }
  body = replaceSectionPrefix(
    body,
    "Acceptance Criteria",
    [
      "- [ ] Core result is implemented",
      "- [ ] Verification executed",
      "- [ ] Work log updated",
      `- [ ] Traceability linked to note ${payload.note_id}`
    ].join("\n")
  );
  body = appendEvolution(body, "Task created from notes:promote", [
    `Source note: ${payload.note_id}`,
    `Promotion mode: ${payload.complexity}`
  ]);
  return serialize(meta, body);
}

function writeReport(name, lines) {
  const p = path.resolve(REPORTS_DIR, `${name}-${stamp()}.md`);
  fs.writeFileSync(p, `${lines.join("\n")}\n`, "utf8");
  return p;
}

function suspiciousCount(text) {
  const m = text.match(/[ÃÂ�]/g);
  return m ? m.length : 0;
}

function fixMojibake(text) {
  let out = text;
  for (const [from, to] of MOJIBAKE_REPLACEMENTS) out = out.split(from).join(to);
  return out;
}

function cmdValidate(opts) {
  const targets = listTargets(opts);
  const scoped = targets.length > 0;
  const records = loadValidated(scoped ? targets : null);
  printValidation(records, scoped ? "scoped" : "all");
}

function cmdIndex() {
  const records = loadValidated();
  const invalid = records.filter((r) => r.errors.length > 0);
  if (invalid.length > 0) {
    printValidation(records, "index");
    return;
  }
  const registry = buildRegistry(records);
  writeRegistry(registry);
  console.log(`OK: index rebuilt (${registry.total_entries} entries).`);
}

function cmdNew(opts) {
  const kind = oneOf(opts, "kind");
  const title = oneOf(opts, "title");
  if (!kind || !ALLOWED.kind.includes(kind)) fail("--kind is required: idea|note");
  if (!title) fail("--title is required");

  const sourceType = oneOf(opts, "source-type") ?? "user_requested";
  if (!ALLOWED.source_type.includes(sourceType)) fail("--source-type must be user_requested|auto_inferred");
  const sourceContext = oneOf(opts, "source-context");
  if (sourceType === "auto_inferred" && !sourceContext) fail("--source-context required for auto_inferred");

  const complexity = oneOf(opts, "complexity") ?? "simple";
  const connectivity = oneOf(opts, "connectivity") ?? "isolated";
  const horizon = oneOf(opts, "horizon") ?? "mid";
  const confidence = oneOf(opts, "confidence") ?? "medium";
  const priority = oneOf(opts, "priority") ?? "p2";
  const effort = oneOf(opts, "effort") ?? "m";
  const score = oneOf(opts, "relevance-score") ? Number(oneOf(opts, "relevance-score")) : 50;
  if (!ALLOWED.complexity.includes(complexity)) fail("--complexity must be simple|complex");
  if (!ALLOWED.connectivity.includes(connectivity)) fail("--connectivity must be isolated|interconnected");
  if (!ALLOWED.horizon.includes(horizon)) fail("--horizon must be near|mid|far");
  if (!ALLOWED.confidence.includes(confidence)) fail("--confidence must be high|medium|low");
  if (!ALLOWED.priority_hint.includes(priority)) fail("--priority must be p1|p2|p3");
  if (!ALLOWED.effort_hint.includes(effort)) fail("--effort must be s|m|l");
  if (Number.isNaN(score) || score < 0 || score > 100) fail("--relevance-score must be 0..100");

  const noteId = nextNoteId();
  const filePath = path.resolve(ENTRIES_DIR, `${noteId}-${kind}-${slugify(title)}.md`);
  const meta = defaultMeta({
    note_id: noteId,
    kind,
    title,
    source_type: sourceType,
    source_context: sourceType === "auto_inferred" ? sourceContext : null,
    complexity,
    connectivity,
    horizon,
    confidence,
    priority_hint: priority,
    effort_hint: effort,
    relevance_score: score,
    tags: listFromOption(opts, "tags"),
    related_notes: listFromOption(opts, "related-notes"),
    related_paths: listFromOption(opts, "related-paths"),
    related_todos: listFromOption(opts, "related-todos")
  });
  let body = defaultBody(title, sourceType, sourceContext);
  const context = oneOf(opts, "context");
  if (context) body = replaceSection(body, "## Context", context);
  const insight = oneOf(opts, "insight");
  if (insight) body = replaceSection(body, "## Insight", insight);
  const actions = oneOf(opts, "actions");
  if (actions) body = replaceSection(body, "## Proposed Actions", actions);
  fs.writeFileSync(filePath, serialize(meta, body), "utf8");
  rebuildRegistryOrFail();
  console.log(`CREATED ${noteId}`);
}

function cmdUpdate(opts) {
  const record = readRecord(resolveNotePath(oneOf(opts, "note")));
  const ids = new Set(listNotePaths().map((p) => readRecord(p).meta.note_id).filter((x) => NOTE_ID_RE.test(String(x))));
  validateRecord(record, ids);
  if (record.errors.length > 0) {
    printValidation([record], "update");
    return;
  }
  const reason = oneOf(opts, "reason") ?? "manual update";
  const mergeList = (base, setKey, addKey, removeKey) => {
    let out = uniqStrings(base ?? []);
    const setVals = listFromOption(opts, setKey);
    if (setVals.length > 0) out = uniqStrings(setVals);
    for (const add of listFromOption(opts, addKey)) if (!out.includes(add)) out.push(add);
    for (const rem of listFromOption(opts, removeKey)) out = out.filter((x) => x !== rem);
    return out;
  };

  const kind = oneOf(opts, "kind");
  if (kind) {
    if (!ALLOWED.kind.includes(kind)) fail("--kind must be idea|note");
    record.meta.kind = kind;
  }
  const phase = oneOf(opts, "phase");
  if (phase) {
    if (!ALLOWED.phase.includes(phase)) fail("--phase must be active|archived");
    record.meta.phase = phase;
  }
  const complexity = oneOf(opts, "complexity");
  if (complexity) {
    if (!ALLOWED.complexity.includes(complexity)) fail("--complexity must be simple|complex");
    record.meta.complexity = complexity;
  }
  const connectivity = oneOf(opts, "connectivity");
  if (connectivity) {
    if (!ALLOWED.connectivity.includes(connectivity)) fail("--connectivity must be isolated|interconnected");
    record.meta.connectivity = connectivity;
  }
  const horizon = oneOf(opts, "horizon");
  if (horizon) {
    if (!ALLOWED.horizon.includes(horizon)) fail("--horizon must be near|mid|far");
    record.meta.horizon = horizon;
  }
  const title = oneOf(opts, "title");
  if (title) record.meta.title = title;
  const activeState = oneOf(opts, "active-state");
  if (activeState) {
    if (!ALLOWED.active_state.includes(activeState)) fail("--active-state must be candidate|on_hold|validated");
    record.meta.active_state = activeState;
  }
  const archiveReason = oneOf(opts, "archive-reason");
  if (archiveReason !== null) {
    if (!["promoted", "rejected", "obsolete", "null"].includes(archiveReason)) fail("--archive-reason must be promoted|rejected|obsolete|null");
    record.meta.archive_reason = archiveReason === "null" ? null : archiveReason;
  }
  const sourceType = oneOf(opts, "source-type");
  if (sourceType) {
    if (!ALLOWED.source_type.includes(sourceType)) fail("--source-type must be user_requested|auto_inferred");
    record.meta.source_type = sourceType;
  }
  const sourceContext = oneOf(opts, "source-context");
  if (sourceContext !== null) record.meta.source_context = sourceContext;
  const confidence = oneOf(opts, "confidence");
  if (confidence) {
    if (!ALLOWED.confidence.includes(confidence)) fail("--confidence must be high|medium|low");
    record.meta.confidence = confidence;
  }
  const priority = oneOf(opts, "priority");
  if (priority) {
    if (!ALLOWED.priority_hint.includes(priority)) fail("--priority must be p1|p2|p3");
    record.meta.priority_hint = priority;
  }
  const effort = oneOf(opts, "effort");
  if (effort) {
    if (!ALLOWED.effort_hint.includes(effort)) fail("--effort must be s|m|l");
    record.meta.effort_hint = effort;
  }
  const scoreRaw = oneOf(opts, "relevance-score");
  if (scoreRaw !== null) {
    const score = Number(scoreRaw);
    if (Number.isNaN(score) || score < 0 || score > 100) fail("--relevance-score must be 0..100");
    record.meta.relevance_score = score;
  }
  const reviewAfter = oneOf(opts, "review-after");
  if (reviewAfter !== null) {
    if (reviewAfter !== "null" && !isDateString(reviewAfter)) fail("--review-after must be YYYY-MM-DD or null");
    record.meta.review_after = reviewAfter === "null" ? null : reviewAfter;
  }
  const reviewedAt = oneOf(opts, "last-reviewed-at");
  if (reviewedAt !== null) {
    if (reviewedAt !== "null" && !isDateString(reviewedAt)) fail("--last-reviewed-at must be YYYY-MM-DD or null");
    record.meta.last_reviewed_at = reviewedAt === "null" ? null : reviewedAt;
  }

  record.meta.tags = mergeList(record.meta.tags, "tags", "add-tags", "remove-tags");
  record.meta.related_notes = mergeList(record.meta.related_notes, "related-notes", "add-related-notes", "remove-related-notes");
  record.meta.related_paths = mergeList(record.meta.related_paths, "related-paths", "add-related-paths", "remove-related-paths");
  record.meta.related_todos = mergeList(record.meta.related_todos, "related-todos", "add-related-todos", "remove-related-todos");
  record.meta.promoted_todos = mergeList(record.meta.promoted_todos, "promoted-todos", "add-promoted-todos", "remove-promoted-todos");

  const setContext = oneOf(opts, "set-context");
  if (setContext !== null) record.body = replaceSection(record.body, "## Context", setContext);
  const setInsight = oneOf(opts, "set-insight");
  if (setInsight !== null) record.body = replaceSection(record.body, "## Insight", setInsight);
  const setActions = oneOf(opts, "set-actions");
  if (setActions !== null) record.body = replaceSection(record.body, "## Proposed Actions", setActions);

  record.meta.updated_at = today();
  record.body = appendEvolution(record.body, "Entry updated", [`Reason: ${reason}`, "Updated via notes:update"]);

  validateRecord(record, ids);
  if (record.errors.length > 0) {
    printValidation([record], "update-final");
    return;
  }
  const oldPath = record.path;
  const nextPath = path.resolve(ENTRIES_DIR, `${record.meta.note_id}-${record.meta.kind}-${slugify(record.meta.title)}.md`);
  writeRecord(record);
  if (nextPath !== oldPath) fs.renameSync(oldPath, nextPath);
  rebuildRegistryOrFail();
  console.log(`UPDATED ${record.meta.note_id}`);
}

function cmdArchive(opts) {
  const reason = oneOf(opts, "reason");
  if (!ALLOWED.archive_reason.includes(reason)) fail("--reason must be promoted|rejected|obsolete");
  const record = readRecord(resolveNotePath(oneOf(opts, "note")));
  const ids = new Set(listNotePaths().map((p) => readRecord(p).meta.note_id).filter((x) => NOTE_ID_RE.test(String(x))));
  validateRecord(record, ids);
  if (record.errors.length > 0) {
    printValidation([record], "archive");
    return;
  }
  record.meta.phase = "archived";
  record.meta.active_state = null;
  record.meta.archive_reason = reason;
  record.meta.updated_at = today();
  record.meta.last_reviewed_at = today();
  record.body = appendEvolution(record.body, "Entry archived", [
    `Archive reason: ${reason}`,
    `Summary: ${oneOf(opts, "summary") ?? "archived by notes:archive"}`
  ]);
  writeRecord(record);
  rebuildRegistryOrFail();
  console.log(`ARCHIVED ${record.meta.note_id}`);
}

function cmdSummary(opts) {
  const records = loadValidated();
  const invalid = records.filter((r) => r.errors.length > 0);
  if (invalid.length > 0) {
    printValidation(records, "summary");
    return;
  }
  const active = sortedByCreated(records.filter((r) => r.meta.phase === "active"));
  const lines = renderGlobal("Summary", "summary", active, null, null);
  renderRecommendations(lines, true, active, suggestions(active, "summary", null, null));
  const focus = resolveFocus(active, oneOf(opts, "focus"));
  if (oneOf(opts, "focus")) renderFocus(lines, focus, "summary", null, null);
  if (opts.list === true) renderList(lines, active);
  console.log(lines.join("\n"));
  if (opts.save === true) {
    const p = writeReport("summary", lines);
    console.log(`Saved: ${path.relative(ROOT, p).replace(/\\/g, "/")}`);
  }
}

function cmdAnalysis(opts, deep) {
  if (opts["no-apply"] === true) fail("--no-apply is deprecated; analysis is read-only now");
  if (opts["auto-capture"] === true) fail("--auto-capture was removed to reduce noise");
  const records = loadValidated();
  const invalid = records.filter((r) => r.errors.length > 0);
  if (invalid.length > 0) {
    printValidation(records, deep ? "deep-analysis" : "analysis");
    return;
  }
  const todoCtx = deep ? todoContext() : null;
  const changelogCtx = changelogContext();
  const active = sortedByCreated(records.filter((r) => r.meta.phase === "active"));
  const mode = deep ? "deep-analysis" : "analysis";
  const lines = renderGlobal(deep ? "Deep Analysis" : "Analysis", mode, active, todoCtx, changelogCtx);
  const sug = suggestions(active, mode, todoCtx, changelogCtx);
  renderRecommendations(lines, false, active, sug);
  const focus = resolveFocus(active, oneOf(opts, "focus"));
  if (oneOf(opts, "focus")) renderFocus(lines, focus, mode, todoCtx, changelogCtx);
  if (opts.list === true) renderList(lines, active);
  console.log(lines.join("\n"));
  if (opts.save === true) {
    const p = writeReport(deep ? "deep-analysis" : "analysis", lines);
    console.log(`Saved: ${path.relative(ROOT, p).replace(/\\/g, "/")}`);
  }
}

function cmdCapture(opts) {
  const text = oneOf(opts, "text") ?? opts._.join(" ").trim();
  if (!text) fail("notes:capture requires --text or positional text");
  const sourceType = oneOf(opts, "source-type") ?? "auto_inferred";
  if (!ALLOWED.source_type.includes(sourceType)) fail("--source-type must be user_requested|auto_inferred");
  const sourceContext = oneOf(opts, "context") ?? "conversation intent capture";
  const result = captureInternal(text, sourceType, sourceContext, false);
  console.log(`NOTIFY ${result.action} ${result.id} (${result.reason})`);
}

function actionBullets(record) {
  const section = sectionText(record.body, "## Proposed Actions") ?? "";
  const bullets = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
  return bullets.length > 0 ? bullets : ["Implement promoted scope from note context."];
}

function promotionBlocks(record) {
  const section = sectionText(record.body, "## Promotion Blocks") ?? "";
  const bullets = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return uniqStrings(bullets);
}

function sanitizePromotionTitle(text) {
  let out = String(text ?? "");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/[A-Za-z]:[\\/][^\s)]+/g, " ");
  out = out.replace(/\bN\d{4}\b/gi, " ");
  out = out.replace(/\bumbrella\b/gi, " ");
  out = out.replace(/\bcuando se active\b/gi, " ");
  out = out.replace(/\bconservar esta nota\b/gi, " ");
  out = out.replace(/\bverificar en ese momento\b/gi, " ");
  out = out.replace(/[()[\]{}]/g, " ");
  out = out.replace(/\s+/g, " ").trim();
  return out || "promoted task";
}

function promotionTitles(record) {
  const blocks = promotionBlocks(record);
  if (blocks.length >= 2) return blocks.map((block) => sanitizePromotionTitle(block));
  return [];
}

function buildPromotionProposal(record) {
  const actions = actionBullets(record);
  const complexity = promotionComplexity(record, actions);
  const childTitles = complexity === "complex" ? promotionTitles(record) : [];
  const previewIds = nextTodoIds(
    complexity === "simple"
      ? 1
      : childTitles.length >= 2
        ? childTitles.length + 1
        : 1
  );
  const proposal = [];

  if (complexity === "simple") {
    const title = sanitizePromotionTitle(record.meta.title);
    proposal.push({
      issue_id: previewIds[0],
      title,
      slugBase: title,
      dependencies: uniqStrings(record.meta.related_todos),
      kind: "simple"
    });
    return { complexity, proposal };
  }

  const [umbrella, ...children] = previewIds;
  const umbrellaTitle = sanitizePromotionTitle(record.meta.title);
  proposal.push({
    issue_id: umbrella,
    title: umbrellaTitle,
    slugBase: umbrellaTitle,
    dependencies: uniqStrings(record.meta.related_todos),
    child_tasks: children,
    related_tasks: [],
    kind: "umbrella"
  });

  for (let i = 0; i < children.length; i += 1) {
    const title = childTitles[i];
    proposal.push({
      issue_id: children[i],
      title,
      slugBase: title,
      dependencies: uniqStrings(record.meta.related_todos),
      child_tasks: [],
      related_tasks: [],
      kind: "child"
    });
  }

  return { complexity, proposal };
}

function promotionComplexity(record, actions) {
  if (record.meta.complexity === "complex") return "complex";
  if (record.meta.effort_hint === "l") return "complex";
  if (record.meta.related_notes.length > 1) return "complex";
  if (record.meta.related_todos.length > 1) return "complex";
  if (actions.length > 2) return "complex";
  return "simple";
}

function riskFromConfidence(confidence) {
  if (confidence === "low") return "high";
  if (confidence === "high") return "low";
  return "medium";
}

function ensureSections(body) {
  let out = body;
  const defaults = {
    "## Context": "Context pending.",
    "## Insight": "Insight pending.",
    "## Proposed Actions": "- Define next action.",
    "## Evolution Log": `### ${today()} - Migration normalize\n\n- Normalized by notes:migrate-v2`
  };
  for (const section of REQUIRED_SECTIONS) {
    if (!out.includes(section)) out = `${out.trimEnd()}\n\n${section}\n\n${defaults[section]}\n`;
  }
  return out;
}

function normalizeDate(value, fallback) {
  if (value === null || value === undefined) return fallback;
  const text = String(value);
  return isDateString(text) ? text : fallback;
}

function normalizeRelatedNotes(input) {
  return uniqStrings(
    asArray(input)
      .map((x) => String(x))
      .map((x) => {
        const m = x.match(/N\d{4}/);
        return m ? m[0] : null;
      })
      .filter(Boolean)
  );
}

function normalizeList(input) {
  return uniqStrings(asArray(input).map((x) => String(x).trim()).filter(Boolean));
}

function cmdPromote(opts) {
  const record = readRecord(resolveNotePath(oneOf(opts, "note")));
  const ids = new Set(listNotePaths().map((p) => readRecord(p).meta.note_id).filter((x) => NOTE_ID_RE.test(String(x))));
  validateRecord(record, ids);
  if (record.errors.length > 0) {
    printValidation([record], "promote");
    return;
  }
  if (record.meta.phase !== "active") fail(`note ${record.meta.note_id} is not active`);

  const execute = opts.execute === true;
  const confirm = opts.confirm === true;
  const priority = oneOf(opts, "priority") ?? record.meta.priority_hint ?? "p2";
  if (!ALLOWED.priority_hint.includes(priority)) fail("--priority must be p1|p2|p3");
  const { complexity, proposal } = buildPromotionProposal(record);

  if (!execute) {
    console.log(`# Promotion Proposal: ${record.meta.note_id}`);
    console.log("");
    console.log(`- mode: ${complexity}`);
    console.log(`- note: ${record.meta.note_id} | ${record.meta.title}`);
    console.log(`- suggested_todos: ${proposal.length}`);
    for (const item of proposal) {
      console.log(`  - ${item.issue_id} | ${item.title} | deps=[${item.dependencies.join(", ")}]`);
    }
    console.log("");
    console.log("Run with --execute --confirm to create TODO files.");
    return;
  }
  if (!confirm) fail("--confirm is required with --execute for notes:promote");

  const todoIds = nextTodoIds(proposal.length);
  const context = (sectionText(record.body, "## Context") ?? "Context not available.").slice(0, 1200);
  const insight = (sectionText(record.body, "## Insight") ?? "Insight not available.").slice(0, 1200);
  const proposed = sectionText(record.body, "## Proposed Actions") ?? "- Execute promoted scope from this note.";
  const created = [];
  for (let i = 0; i < proposal.length; i += 1) {
    const p = proposal[i];
    const issueId = todoIds[i];
    const itemTitle = sanitizePromotionTitle(p.title).replace(/\s+/g, " ").trim();
    const todoSlug = slugify(sanitizePromotionTitle(p.slugBase ?? itemTitle)).slice(0, 48) || "promoted-task";
    const content = buildTodoFromTemplate({
      issue_id: issueId,
      priority,
      slug: todoSlug,
      note_id: record.meta.note_id,
      dependencies: p.dependencies,
      child_tasks: p.child_tasks ?? [],
      related_tasks: p.related_tasks ?? [],
      risk_level: riskFromConfidence(record.meta.confidence),
      effort: record.meta.effort_hint,
      complexity: complexity === "complex" ? "complex" : "simple",
      title: itemTitle,
      task_type: p.kind === "umbrella" ? "umbrella" : "leaf",
      problem: context,
      findings: insight,
      proposed,
      recommended_action:
      complexity === "complex" && p.kind === "umbrella"
        ? "Start with todo:brief and todo:prepare, then execute child tasks only by explicit request."
        : "Execute implementation end-to-end and close with automated commit."
    });
    const filePath = path.resolve(TODOS_DIR, `${issueId}-pending-${priority}-${todoSlug}.md`);
    fs.writeFileSync(filePath, content, "utf8");
    created.push(filePath);
  }

  const createdRel = created.map((p) => path.relative(ROOT, p).replace(/\\/g, "/"));
  const validation = spawnSync("node", ["tools/todos/validate.mjs", "--files", createdRel.join(",")], {
    cwd: ROOT,
    encoding: "utf8"
  });
  if (validation.status !== 0) {
    if (validation.stdout) process.stdout.write(validation.stdout);
    if (validation.stderr) process.stderr.write(validation.stderr);
    fail("scoped TODO validation failed for promoted files");
  }

  record.meta.phase = "archived";
  record.meta.active_state = null;
  record.meta.archive_reason = "promoted";
  record.meta.related_todos = uniqStrings([...record.meta.related_todos, ...todoIds]);
  record.meta.promoted_todos = uniqStrings([...record.meta.promoted_todos, ...todoIds]);
  record.meta.updated_at = today();
  record.meta.last_reviewed_at = today();
  record.body = appendEvolution(record.body, "Promoted to TODO", [
    `Created TODO ids: ${todoIds.join(", ")}`,
    `Mode: ${complexity}`,
    "Source: notes:promote via file-todos template"
  ]);
  writeRecord(record);
  rebuildRegistryOrFail();

  console.log(`PROMOTED ${record.meta.note_id} -> ${todoIds.join(", ")}`);
  for (const rel of createdRel) console.log(`- ${rel}`);
}

function cmdMigrateV2() {
  ensureDirs();
  const preRegistry = readRegistrySafe();
  const snapshotPath = path.resolve(MIGRATIONS_DIR, `registry-snapshot-pre-v2-${stamp()}.json`);
  fs.writeFileSync(snapshotPath, `${JSON.stringify(preRegistry, null, 2)}\n`, "utf8");

  const paths = listNotePaths();
  const slugMap = {};
  const touched = [];
  let migratedKinds = 0;
  let repairedMojibake = 0;

  for (const filePath of paths) {
    const originalRaw = fs.readFileSync(filePath, "utf8");
    const repairedRaw = fixMojibake(originalRaw);
    if (repairedRaw !== originalRaw) repairedMojibake += 1;

    const parsed = parseFrontmatter(repairedRaw);
    if (parsed.error) {
      console.error(`WARN: skip ${path.basename(filePath)} (${parsed.error})`);
      continue;
    }
    const fileMatch = path.basename(filePath).match(NOTE_FILE_RE);
    const filenameId = fileMatch?.[1] ?? null;

    const metaIn = { ...parsed.meta };
    const kindIn = String(metaIn.kind ?? fileMatch?.[2] ?? "note");
    const noteId = NOTE_ID_RE.test(String(metaIn.note_id ?? "")) ? String(metaIn.note_id) : filenameId ?? nextNoteId();
    let kind = kindIn;
    const tags = normalizeList(metaIn.tags ?? []);
    if (kind === "task") {
      kind = "note";
      if (!tags.includes("legacy-task")) tags.push("legacy-task");
      migratedKinds += 1;
    }
    if (!ALLOWED.kind.includes(kind)) kind = "note";

    const title = fixMojibake(String(metaIn.title ?? "untitled")).trim() || "untitled";
    const phase = ALLOWED.phase.includes(String(metaIn.phase)) ? String(metaIn.phase) : "active";
    const sourceType = ALLOWED.source_type.includes(String(metaIn.source_type)) ? String(metaIn.source_type) : "user_requested";
    const relatedTodos = normalizeList(metaIn.related_todos ?? []);
    const relatedNotes = normalizeRelatedNotes(metaIn.related_notes ?? []);
    const promotedTodos = normalizeList(metaIn.promoted_todos ?? []);
    const effortHint = ALLOWED.effort_hint.includes(String(metaIn.effort_hint)) ? String(metaIn.effort_hint) : "m";
    const confidence = ALLOWED.confidence.includes(String(metaIn.confidence)) ? String(metaIn.confidence) : "medium";

    const synthetic = {
      meta: {
        title,
        tags,
        effort_hint: effortHint,
        related_notes: relatedNotes,
        related_todos: relatedTodos
      }
    };
    const complexity = ALLOWED.complexity.includes(String(metaIn.complexity))
      ? String(metaIn.complexity)
      : inferComplexity(synthetic);
    const connectivity = ALLOWED.connectivity.includes(String(metaIn.connectivity))
      ? String(metaIn.connectivity)
      : inferConnectivity(synthetic);
    const horizon = ALLOWED.horizon.includes(String(metaIn.horizon))
      ? String(metaIn.horizon)
      : inferHorizonFromText(`${title} ${tags.join(" ")}`);
    const activeState = phase === "active"
      ? (ALLOWED.active_state.includes(String(metaIn.active_state)) ? String(metaIn.active_state) : "candidate")
      : null;
    const archiveReason = phase === "archived"
      ? (ALLOWED.archive_reason.includes(String(metaIn.archive_reason)) ? String(metaIn.archive_reason) : "obsolete")
      : null;
    const sourceContext = sourceType === "auto_inferred"
      ? (String(metaIn.source_context ?? "").trim() || "migration-v2 inferred source context")
      : null;
    const relevanceScore = Number(metaIn.relevance_score);
    const normalizedScore = Number.isFinite(relevanceScore) ? Math.max(0, Math.min(100, relevanceScore)) : 50;
    const priorityHint = ALLOWED.priority_hint.includes(String(metaIn.priority_hint)) ? String(metaIn.priority_hint) : "p2";

    const metaOut = {
      note_id: noteId,
      kind,
      phase,
      active_state: activeState,
      archive_reason: archiveReason,
      complexity,
      connectivity,
      horizon,
      title,
      source_type: sourceType,
      source_context: sourceContext,
      tags,
      related_notes: relatedNotes,
      related_paths: normalizeList(metaIn.related_paths ?? []),
      related_todos: relatedTodos,
      promoted_todos: promotedTodos,
      relevance_score: normalizedScore,
      confidence,
      priority_hint: priorityHint,
      effort_hint: effortHint,
      created_at: normalizeDate(metaIn.created_at, today()),
      updated_at: normalizeDate(metaIn.updated_at, today()),
      last_reviewed_at: metaIn.last_reviewed_at === null ? null : normalizeDate(metaIn.last_reviewed_at, null),
      review_after: metaIn.review_after === null ? null : normalizeDate(metaIn.review_after, null)
    };

    const body = ensureSections(fixMojibake(parsed.body ?? ""));
    const nextName = `${noteId}-${kind}-${slugify(title)}.md`;
    const nextPath = path.resolve(ENTRIES_DIR, nextName);
    const nextRaw = serialize(metaOut, body);

    if (nextPath !== filePath) {
      fs.writeFileSync(nextPath, nextRaw, "utf8");
      fs.unlinkSync(filePath);
      slugMap[path.basename(filePath)] = nextName;
      touched.push(nextName);
    } else if (nextRaw !== originalRaw) {
      fs.writeFileSync(filePath, nextRaw, "utf8");
      touched.push(path.basename(filePath));
    }
  }

  const slugEntries = Object.entries(slugMap);
  if (slugEntries.length > 0) {
    for (const filePath of listNotePaths()) {
      let raw = fs.readFileSync(filePath, "utf8");
      const before = raw;
      for (const [oldName, newName] of slugEntries) {
        raw = raw.split(oldName).join(newName);
        raw = raw.split(`notes/entries/${oldName}`).join(`notes/entries/${newName}`);
      }
      if (raw !== before) fs.writeFileSync(filePath, raw, "utf8");
    }
  }

  const mapPath = path.resolve(MIGRATIONS_DIR, "v2-slug-map.json");
  fs.writeFileSync(
    mapPath,
    `${JSON.stringify({ generated_at: nowIso(), mappings: slugMap }, null, 2)}\n`,
    "utf8"
  );

  const records = loadValidated();
  const invalid = records.filter((r) => r.errors.length > 0);
  if (invalid.length > 0) {
    printValidation(records, "migrate-v2");
    return;
  }
  const registry = buildRegistry(records);
  registry.encoding_state = {
    status: repairedMojibake > 0 ? "repaired" : "clean",
    last_doctor_run: registry.encoding_state?.last_doctor_run ?? null,
    suspicious_files: [],
    repaired_files: repairedMojibake > 0 ? touched.map((x) => `notes/entries/${x}`) : []
  };
  writeRegistry(registry);

  const report = [
    "# Notes Migration v2",
    "",
    `Generated: ${nowIso()}`,
    "",
    `- Snapshot: ${path.relative(ROOT, snapshotPath).replace(/\\/g, "/")}`,
    `- Files touched: ${touched.length}`,
    `- kind task->note migrations: ${migratedKinds}`,
    `- mojibake repaired files: ${repairedMojibake}`,
    `- Slug renames: ${slugEntries.length}`,
    "",
    "## Slug Map",
    "",
    ...(slugEntries.length === 0 ? ["- none"] : slugEntries.map(([oldName, newName]) => `- ${oldName} -> ${newName}`))
  ];
  const reportPath = writeReport("migration-v2", report);
  console.log(`OK: migration v2 complete (${touched.length} files touched).`);
  console.log(`Report: ${path.relative(ROOT, reportPath).replace(/\\/g, "/")}`);
  console.log(`Map: ${path.relative(ROOT, mapPath).replace(/\\/g, "/")}`);
}

function cmdDoctor(opts) {
  ensureDirs();
  const apply = opts["no-apply"] !== true;
  const files = listNotePaths();
  const suspicious = [];
  const repaired = [];
  const backupRoot = path.resolve(MIGRATIONS_DIR, `doctor-backup-${stamp()}`);
  const cpOut = spawnSync("chcp", [], { cwd: ROOT, encoding: "utf8", shell: true });
  const cpMatch = cpOut.status === 0 ? cpOut.stdout.match(/(\d{3,5})/) : null;
  const terminalCodepage = cpMatch ? cpMatch[1] : null;
  const visualRisk = terminalCodepage !== null && terminalCodepage !== "65001";

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, "utf8");
    const score = suspiciousCount(raw);
    const fixed = fixMojibake(raw);
    const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
    if (score > 0 || fixed !== raw) suspicious.push(rel);
    if (apply && fixed !== raw) {
      fs.mkdirSync(backupRoot, { recursive: true });
      const backupPath = path.resolve(backupRoot, path.basename(filePath));
      fs.writeFileSync(backupPath, raw, "utf8");
      fs.writeFileSync(filePath, fixed, "utf8");
      repaired.push(rel);
    }
  }

  const registry = readRegistrySafe();
  registry.encoding_state = {
    status:
      suspicious.length === 0
        ? "clean"
        : repaired.length > 0
          ? "repaired"
          : "suspicious",
    last_doctor_run: nowIso(),
    suspicious_files: suspicious,
    repaired_files: repaired,
    terminal_codepage: terminalCodepage,
    visualization_risk: visualRisk
  };
  writeRegistry(registry);

  const report = [
    "# Notes Doctor Report",
    "",
    `Generated: ${nowIso()}`,
    "",
    `- apply: ${apply}`,
    `- suspicious_files: ${suspicious.length}`,
    `- repaired_files: ${repaired.length}`,
    `- terminal_codepage: ${terminalCodepage ?? "unknown"}`,
    `- visualization_risk: ${visualRisk}`,
    `- backup: ${repaired.length > 0 ? path.relative(ROOT, backupRoot).replace(/\\/g, "/") : "n/a"}`,
    "",
    "## Diagnosis",
    "",
    ...(suspicious.length === 0
      ? ["- Content encoding appears clean in UTF-8."]
      : ["- Content has suspicious mojibake patterns."]),
    ...(visualRisk
      ? ["- Terminal code page is not UTF-8 (65001); display artifacts may appear even with clean files."]
      : ["- Terminal code page is UTF-8 compatible."]),
    "",
    "## Suspicious",
    "",
    ...(suspicious.length === 0 ? ["- none"] : suspicious.map((x) => `- ${x}`)),
    "",
    "## Repaired",
    "",
    ...(repaired.length === 0 ? ["- none"] : repaired.map((x) => `- ${x}`))
  ];
  const reportPath = writeReport("doctor", report);
  console.log(`DOCTOR status=${registry.encoding_state.status}`);
  console.log(`Report: ${path.relative(ROOT, reportPath).replace(/\\/g, "/")}`);
  if (repaired.length > 0) {
    console.log(`Backup: ${path.relative(ROOT, backupRoot).replace(/\\/g, "/")}`);
  }
}

function cmdHelp() {
  const lines = [
    "notes cli v3",
    "",
    "Commands:",
    "  validate [--note N0001|--files a,b]",
    "  index",
    "  new --kind idea|note --title \"...\" [--complexity simple|complex] [--connectivity isolated|interconnected] [--horizon near|mid|far]",
    "  update --note N0001 [field flags]",
    "  archive --note N0001 --reason promoted|rejected|obsolete",
    "  summary [--focus N0001|slug] [--list] [--save]",
    "  analysis [--focus N0001|slug] [--list] [--save]",
    "  deep-analysis [--focus N0001|slug] [--list] [--save]",
    "  capture --text \"...\" [--source-type user_requested|auto_inferred] [--context \"...\"]",
    "  migrate-v2",
    "  doctor [--no-apply]",
    "  promote --note N0001 [--priority p1|p2|p3] [--execute --confirm]",
    "",
    "Notes:",
    "  - kind is idea|note (task stays in TODO system).",
    "  - promote always uses file-todos template and scoped todo validation."
  ];
  console.log(lines.join("\n"));
}

function main() {
  ensureDirs();
  const argv = process.argv.slice(2);
  const command = argv[0];
  if (!command || command === "help" || command === "--help" || command === "-h") {
    cmdHelp();
    return;
  }
  const opts = parseArgs(argv.slice(1));
  if (command === "validate") {
    cmdValidate(opts);
    return;
  }
  if (command === "index") {
    cmdIndex(opts);
    return;
  }
  if (command === "new") {
    cmdNew(opts);
    return;
  }
  if (command === "update") {
    cmdUpdate(opts);
    return;
  }
  if (command === "archive") {
    cmdArchive(opts);
    return;
  }
  if (command === "summary") {
    cmdSummary(opts);
    return;
  }
  if (command === "analysis") {
    cmdAnalysis(opts, false);
    return;
  }
  if (command === "deep-analysis") {
    cmdAnalysis(opts, true);
    return;
  }
  if (command === "capture") {
    cmdCapture(opts);
    return;
  }
  if (command === "migrate-v2") {
    cmdMigrateV2(opts);
    return;
  }
  if (command === "doctor") {
    cmdDoctor(opts);
    return;
  }
  if (command === "promote") {
    cmdPromote(opts);
    return;
  }
  fail(`unknown command '${command}'`);
}

main();
