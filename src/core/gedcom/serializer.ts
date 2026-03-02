import JSZip from "jszip";
import type { Family, GedExportVersion, GedExportWarning, GeneaDocument, Person, SourceRef } from "@/types/domain";
import { serializeGsk, type GskMetadata } from "@/core/gskFormat";

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
  out.push(line(level, "NOTE", parts[0] || ""));
  for (let i = 1; i < parts.length; i += 1) {
    out.push(line(level + 1, "CONT", parts[i] || ""));
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
  out.push(xline(0, person.id, "INDI"));
  if (person.names?.length) {
    for (const entry of person.names) {
      const nameVal = entry.value || (entry.surname ? `${entry.given || person.name} /${entry.surname}/` : person.name);
      out.push(line(1, "NAME", nameVal));
      if (entry.given) out.push(line(2, "GIVN", entry.given));
      if (entry.surname) out.push(line(2, "SURN", entry.surname));
      if (entry.nickname) out.push(line(2, "NICK", entry.nickname));
      if (entry.type && entry.type !== "primary") out.push(line(2, "TYPE", entry.type.toUpperCase()));
    }
  } else {
    const nameVal = person.surname ? `${person.name} /${person.surname}/` : person.name;
    out.push(line(1, "NAME", nameVal));
  }
  out.push(line(1, "SEX", person.sex));
  for (const famc of person.famc) out.push(line(1, "FAMC", famc));
  if ((person.famcLinks || []).some((link) => link.pedi && link.pedi !== "UNKNOWN")) {
    warn(warnings, {
      code: "GED_PEDI_STRUCT_DROPPED",
      entity: person.id,
      message: "famcLinks.PEDI estructurado no se serializa aún en el perfil GED actual; se conserva en modelo interno.",
      level: "info"
    });
  }
  for (const fams of person.fams) out.push(line(1, "FAMS", fams));
  for (const m of person.mediaRefs) out.push(line(1, "OBJE", m));
  for (const ref of person.sourceRefs || []) pushSourceRef(out, 1, ref);
  for (const noteRef of person.noteRefs || []) out.push(line(1, "NOTE", noteRef));
  for (const inlineNote of person.rawTags?.NOTE || []) pushInlineNote(out, 1, inlineNote);

  if (person.events.some((ev) => ev.type === "OTHER")) {
    warn(warnings, {
      code: "GED_EVENT_OTHER_DROPPED",
      entity: person.id,
      message: "Eventos OTHER se exportan como OTHER/TYPE y pueden no ser compatibles con algunos consumidores.",
      level: "warn"
    });
  }

  const events = person.events || [];
  const hasDeathEvent = events.some((event) => event.type === "DEAT");
  if (person.lifeStatus === "deceased" && !hasDeathEvent) {
    warn(warnings, {
      code: "GED_DEAT_IMPLICIT",
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
  for (const inlineNote of family.rawTags?.NOTE || []) pushInlineNote(out, 1, inlineNote);
  pushChangeMeta(out, 1, family.change);
  if (family.events.some((ev) => ev.type !== "MARR" && ev.type !== "DIV")) {
    warn(warnings, {
      code: "GED_FAM_EVENT_DROPPED",
      entity: family.id,
      message: "Eventos de familia fuera de MARR/DIV no se exportan en el perfil GED actual.",
      level: "warn"
    });
  }
  if ((family.relationNotes || []).length > 0) {
    warn(warnings, {
      code: "GED_RELATION_NOTES_DROPPED",
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
    for (const note of source.rawTags?.NOTE || []) pushInlineNote(out, 1, note);
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
      code: "GED_MEDIA_BINARY_NOT_EMBEDDED",
      message: "GED plano no embebe binarios de media; solo se exportan referencias OBJE/FILE.",
      level: "info"
    });
  }
  if ((doc.metadata.importProvenance || []).length > 0) {
    warn(warnings, {
      code: "GED_METADATA_EXTENSION_DROPPED",
      message: "Metadatos extendidos de GeneaSketch (provenance) no se incluyen en GED plano.",
      level: "info"
    });
  }
  out.push("0 TRLR");
  return `${out.join("\n")}\n`;
}

export async function serializeGedzip(doc: GeneaDocument, mediaPolicy: "embed" | "reference", gskMeta?: GskMetadata): Promise<Blob> {
  const zip = new JSZip();
  zip.file("data.ged", serializeGedcom(doc, { version: "7.0.3" }));
  if (mediaPolicy === "embed") {
    for (const m of Object.values(doc.media)) {
      if (m.fileName && m.bytes) {
        zip.file(m.fileName, m.bytes);
      }
    }
  }
  if (gskMeta) {
    zip.file("geneasketch.json", serializeGsk(gskMeta));
  }
  return zip.generateAsync({ type: "blob" });
}
