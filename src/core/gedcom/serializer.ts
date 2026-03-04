import type { Family, GedExportVersion, GedExportWarning, GeneaDocument, Person, SourceRef } from "@/types/domain";
import { normalizePersonSurnames } from "@/core/naming/surname";
import { ERROR_CODES } from "@/core/gschema/errorCatalog";

export type GedExportWarningCollector = {
  push: (warning: GedExportWarning) => void;
};

type SerializeGedOptions = {
  version?: GedExportVersion;
  legacyPolicy?: "safe";
  warnings?: GedExportWarningCollector;
};

function line(level: number, tag: string, value?: string): string {
  return value ? `${level} ${tag} ${value}` : `${level} ${tag}`;
}

function xline(level: number, xref: string, tag: string): string {
  return `${level} ${xref} ${tag}`;
}

function xlineWithValue(level: number, xref: string, tag: string, value: string): string {
  return `${level} ${xref} ${tag} ${value}`;
}

function warn(warnings: GedExportWarningCollector | undefined, warning: GedExportWarning) {
  warnings?.push(warning);
}

export const GEDCOM_CHUNK_MAX_BYTES = 180;

function splitUtf8ByBytes(value: string, maxBytes: number): string[] {
  if (maxBytes <= 0) return [value];
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const char of value) {
    const charBytes = encoder.encode(char).byteLength;
    if (currentBytes > 0 && currentBytes + charBytes > maxBytes) {
      chunks.push(current);
      current = char;
      currentBytes = charBytes;
      continue;
    }
    current += char;
    currentBytes += charBytes;
  }
  chunks.push(current);
  return chunks;
}

function pushLongValue(out: string[], level: number, tag: string, value: string) {
  const chunks = splitUtf8ByBytes(value, GEDCOM_CHUNK_MAX_BYTES);
  if (chunks.length <= 1) {
    out.push(line(level, tag, value));
    return;
  }
  out.push(line(level, tag, chunks[0]));
  for (let i = 1; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    out.push(line(level + 1, "CONC", chunk));
  }
}

function pushSourceRef(out: string[], level: number, ref: SourceRef) {
  out.push(line(level, "SOUR", ref.id));
  if (ref.page) out.push(line(level + 1, "PAGE", ref.page));
  if (ref.text) out.push(line(level + 1, "TEXT", ref.text));
  if (ref.note) out.push(line(level + 1, "NOTE", ref.note));
  if (ref.quality) out.push(line(level + 1, "QUAY", ref.quality));
}

function pushInlineNote(out: string[], level: number, note: string) {
  const parts = note.split(/\r?\n/);
  if (parts.length === 0) return;
  pushLongValue(out, level, "NOTE", parts[0] || "");
  for (let i = 1; i < parts.length; i += 1) {
    pushLongValue(out, level + 1, "CONT", parts[i] || "");
  }
}

function pushRawTags(out: string[], level: number, rawTags: Record<string, string[]> | undefined) {
  if (!rawTags) return;
  for (const [tag, values] of Object.entries(rawTags)) {
    if (tag === "NOTE") {
      for (const note of values || []) pushInlineNote(out, level, note);
      continue;
    }
    for (const value of values || []) {
      if (!value) {
        out.push(line(level, tag));
        continue;
      }
      pushLongValue(out, level, tag, value);
    }
  }
}

function pushChangeMeta(
  out: string[],
  level: number,
  change: { date?: string; time?: string; actor?: string; raw?: string[] } | undefined
) {
  if (!change) return;
  if (!change.date && !change.time && !change.actor && !(change.raw && change.raw.length > 0)) return;
  out.push(line(level, "CHAN"));
  if (change.date) out.push(line(level + 1, "DATE", change.date));
  if (change.time) out.push(line(level + 1, "TIME", change.time));
  if (change.actor) out.push(line(level + 1, "_ACTOR", change.actor));
  if (change.raw?.length) {
    for (const rawLine of change.raw) {
      if (!rawLine) continue;
      out.push(line(level + 1, "_RAW", rawLine));
    }
  }
}

function pushEvent(out: string[], level: number, event: NonNullable<Person["events"]>[number]) {
  out.push(line(level, event.type));
  if (event.subType) out.push(line(level + 1, "TYPE", event.subType));
  if (event.date) out.push(line(level + 1, "DATE", event.date));
  if (event.place) out.push(line(level + 1, "PLAC", event.place));
  if (event.addr) out.push(line(level + 1, "ADDR", event.addr));
  if (event.quality) out.push(line(level + 1, "QUAY", event.quality));
  if (event.sourceRefs?.length) {
    for (const ref of event.sourceRefs) pushSourceRef(out, level + 1, ref);
  }
  if (event.mediaRefs?.length) {
    for (const mediaRef of event.mediaRefs) out.push(line(level + 1, "OBJE", mediaRef));
  }
  if (event.noteRefs?.length) {
    for (const noteRef of event.noteRefs) out.push(line(level + 1, "NOTE", noteRef));
  }
  if (event.notesInline?.length) {
    for (const note of event.notesInline) pushInlineNote(out, level + 1, note);
  }
}

function personToGed(person: Person, options?: SerializeGedOptions): string[] {
  const out: string[] = [];
  const warnings = options?.warnings;
  const canonicalSurnames = normalizePersonSurnames(person);
  const gedSurname = canonicalSurnames.surname || person.surname;
  out.push(xline(0, person.id, "INDI"));
  if (person.names?.length) {
    for (const entry of person.names) {
      const effectiveSurname = entry.surname || gedSurname;
      const nameVal = entry.value || (effectiveSurname ? `${entry.given || person.name} /${effectiveSurname}/` : person.name);
      out.push(line(1, "NAME", nameVal));
      if (entry.given) out.push(line(2, "GIVN", entry.given));
      if (effectiveSurname) out.push(line(2, "SURN", effectiveSurname));
      if (entry.nickname) out.push(line(2, "NICK", entry.nickname));
      if (entry.type && entry.type !== "primary") out.push(line(2, "TYPE", entry.type.toUpperCase()));
    }
  } else {
    const nameVal = gedSurname ? `${person.name} /${gedSurname}/` : person.name;
    out.push(line(1, "NAME", nameVal));
  }
  out.push(line(1, "SEX", person.sex));
  const famcOrder: string[] = [];
  const seenFamc = new Set<string>();
  for (const famc of person.famc || []) {
    if (seenFamc.has(famc)) continue;
    seenFamc.add(famc);
    famcOrder.push(famc);
  }
  for (const link of person.famcLinks || []) {
    if (seenFamc.has(link.familyId)) continue;
    seenFamc.add(link.familyId);
    famcOrder.push(link.familyId);
  }
  for (const familyId of famcOrder) {
    out.push(line(1, "FAMC", familyId));
    const link = (person.famcLinks || []).find((entry) => entry.familyId === familyId);
    if (link?.pedi) out.push(line(2, "PEDI", link.pedi));
    if (link?.quality) out.push(line(2, "QUAY", link.quality));
    if (link?.pedi === "UNKNOWN" && link.reference?.includes("nature:STE")) {
      warn(warnings, {
        code: ERROR_CODES.PEDI_STE_DEGRADED_TO_UNKNOWN,
        entity: person.id,
        message: "ParentChild nature=STE se degrada a PEDI UNKNOWN en GEDCOM.",
        level: "info"
      });
    }
  }
  for (const fams of person.fams) out.push(line(1, "FAMS", fams));
  for (const m of person.mediaRefs) out.push(line(1, "OBJE", m));
  for (const ref of person.sourceRefs || []) pushSourceRef(out, 1, ref);
  for (const noteRef of person.noteRefs || []) out.push(line(1, "NOTE", noteRef));
  pushRawTags(out, 1, person.rawTags);

  if (person.events.some((ev) => ev.type === "OTHER")) {
    warn(warnings, {
      code: ERROR_CODES.GED_EVENT_OTHER_DROPPED,
      entity: person.id,
      message: "Eventos OTHER se exportan como OTHER/TYPE y pueden no ser compatibles con algunos consumidores.",
      level: "warn"
    });
  }

  const events = person.events || [];
  const hasDeathEvent = events.some((event) => event.type === "DEAT");
  if (person.lifeStatus === "deceased" && !hasDeathEvent) {
    warn(warnings, {
      code: ERROR_CODES.GED_DEAT_IMPLICIT,
      entity: person.id,
      message: "Persona marcada como fallecida sin evento DEAT explicito.",
      level: "warn"
    });
  }
  for (const event of events) pushEvent(out, 1, event);
  if (events.length === 0) {
    const birth = person.birthDate || person.birthPlace ? { type: "BIRT" as const, date: person.birthDate, place: person.birthPlace } : null;
    const death = person.lifeStatus === "deceased" || person.deathDate || person.deathPlace
      ? { type: "DEAT" as const, date: person.deathDate, place: person.deathPlace }
      : null;
    if (birth) pushEvent(out, 1, birth);
    if (death) pushEvent(out, 1, death);
  }
  pushChangeMeta(out, 1, person.change);
  return out;
}

function familyToGed(family: Family, options?: SerializeGedOptions): string[] {
  const out: string[] = [];
  const warnings = options?.warnings;
  out.push(xline(0, family.id, "FAM"));
  if (family.name) out.push(line(1, "NAME", family.name));
  if (family.husbandId) out.push(line(1, "HUSB", family.husbandId));
  if (family.wifeId) out.push(line(1, "WIFE", family.wifeId));
  for (const c of family.childrenIds) out.push(line(1, "CHIL", c));
  for (const ev of family.events) {
    if (ev.type !== "MARR" && ev.type !== "DIV") continue;
    pushEvent(out, 1, ev);
  }
  for (const noteRef of family.noteRefs || []) out.push(line(1, "NOTE", noteRef));
  pushRawTags(out, 1, family.rawTags);
  pushChangeMeta(out, 1, family.change);
  if (family.events.some((ev) => ev.type !== "MARR" && ev.type !== "DIV")) {
    warn(warnings, {
      code: ERROR_CODES.GED_FAM_EVENT_DROPPED,
      entity: family.id,
      message: "Eventos de familia fuera de MARR/DIV no se exportan en el perfil GED actual.",
      level: "warn"
    });
  }
  if ((family.relationNotes || []).length > 0) {
    warn(warnings, {
      code: ERROR_CODES.GED_RELATION_NOTES_DROPPED,
      entity: family.id,
      message: "relationNotes no se exporta en el perfil GED actual; se conserva en modelo interno.",
      level: "info"
    });
  }
  return out;
}

function mediaToGed(id: string, media: GeneaDocument["media"][string]): string[] {
  const out: string[] = [];
  out.push(xline(0, id, "OBJE"));
  if (media.fileName) out.push(line(1, "FILE", media.fileName));
  if (media.title) out.push(line(1, "TITL", media.title));
  if (media.mimeType) out.push(line(1, "FORM", media.mimeType));
  return out;
}

export function serializeGedcom(doc: GeneaDocument, options?: SerializeGedOptions): string {
  const version = options?.version ?? "7.0.3";
  const warnings = options?.warnings;
  const out: string[] = [];
  out.push("0 HEAD");
  out.push("1 GEDC");
  out.push(`2 VERS ${version}`);
  out.push("1 CHAR UTF-8");
  out.push("1 LANG es");
  if (doc.metadata.schemaUris?.length) {
    out.push("1 SCHMA");
    for (const uri of doc.metadata.schemaUris) {
      out.push(line(2, "URI", uri));
    }
  }

  Object.values(doc.persons).forEach((person) => out.push(...personToGed(person, options)));
  Object.values(doc.families).forEach((family) => out.push(...familyToGed(family, options)));
  Object.values(doc.sources || {}).forEach((source) => {
    out.push(xline(0, source.id, "SOUR"));
    if (source.title) out.push(line(1, "TITL", source.title));
    if (source.text) out.push(line(1, "TEXT", source.text));
    pushRawTags(out, 1, source.rawTags);
    pushChangeMeta(out, 1, source.change);
  });
  Object.values(doc.notes || {}).forEach((note) => {
    const text = note.text || "";
    const parts = text.split(/\r?\n/);
    out.push(xlineWithValue(0, note.id, "NOTE", parts[0] || ""));
    for (let i = 1; i < parts.length; i += 1) {
      out.push(line(1, "CONT", parts[i] || ""));
    }
    pushChangeMeta(out, 1, note.change);
  });
  Object.entries(doc.media).forEach(([id, media]) => out.push(...mediaToGed(id, media)));

  if (Object.values(doc.media).some((m) => Boolean(m.bytes || m.dataUrl))) {
    warn(warnings, {
      code: ERROR_CODES.GED_MEDIA_BINARY_NOT_EMBEDDED,
      message: "GED plano no embebe binarios de media; solo se exportan referencias OBJE/FILE.",
      level: "info"
    });
  }
  if ((doc.metadata.importProvenance || []).length > 0) {
    warn(warnings, {
      code: ERROR_CODES.GED_METADATA_EXTENSION_DROPPED,
      message: "Metadatos extendidos de GeneaSketch (provenance) no se incluyen en GED plano.",
      level: "info"
    });
  }
  out.push("0 TRLR");
  return `${out.join("\n")}\n`;
}
