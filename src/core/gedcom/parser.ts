import JSZip from "jszip";
import type {
  Event,
  Family,
  GedParseError,
  GeneaDocument,
  ImportWarning,
  Media,
  Person,
  SourceGedVersion
} from "@/types/domain";
import { parseGsk, type GskMetadata } from "@/core/gskFormat";

type ParsedLine = {
  lineNo: number;
  level: number;
  xref?: string;
  tag: string;
  value?: string;
};

export type ImportGedResult = {
  document: GeneaDocument | null;
  errors: GedParseError[];
  warnings: ImportWarning[];
  sourceVersion?: SourceGedVersion;
  gskMeta?: GskMetadata | null;
};

const GED_LINE_REGEX = /^(\d+)\s+((@[^@]+@)\s+)?([A-Z0-9_]+)(?:\s+(.*))?$/;
const SUPPORTED_VERSIONS = new Set(["5.5", "5.5.1", "7.0", "7.0.1", "7.0.2", "7.0.3"]);

function parseLines(raw: string): { lines: ParsedLine[]; errors: GedParseError[] } {
  const lines: ParsedLine[] = [];
  const errors: GedParseError[] = [];
  raw.split(/\r?\n/).forEach((input, idx) => {
    if (!input.trim()) return;
    const match = GED_LINE_REGEX.exec(input);
    if (!match) {
      errors.push({ line: idx + 1, message: "Formato GEDCOM invalido." });
      return;
    }
    lines.push({
      lineNo: idx + 1,
      level: Number(match[1]),
      xref: match[3],
      tag: match[4],
      value: match[5]?.trim()
    });
  });
  return { lines, errors };
}

function emptyPerson(id: string): Person {
  return {
    id,
    name: id,
    sex: "U",
    lifeStatus: "alive",
    events: [],
    famc: [],
    fams: [],
    mediaRefs: [],
    sourceRefs: []
  };
}

function emptyFamily(id: string): Family {
  return {
    id,
    childrenIds: [],
    events: []
  };
}

function parseRecordEvents(record: ParsedLine[], personOrFamily: { events: Event[] }) {
  for (let i = 0; i < record.length; i += 1) {
    const line = record[i];
    if (line.tag === "BIRT" || line.tag === "DEAT" || line.tag === "MARR" || line.tag === "DIV") {
      const event: Event = { type: line.tag };
      for (let j = i + 1; j < record.length && record[j].level > line.level; j += 1) {
        if (record[j].tag === "DATE") event.date = record[j].value;
        if (record[j].tag === "PLAC") event.place = record[j].value;
      }
      personOrFamily.events.push(event);
    }
  }
}

function splitTopLevelRecords(lines: ParsedLine[]): ParsedLine[][] {
  const records: ParsedLine[][] = [];
  let current: ParsedLine[] = [];
  for (const line of lines) {
    if (line.level === 0 && current.length > 0) {
      records.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length > 0) records.push(current);
  return records;
}

function detectVersion(lines: ParsedLine[]): { version: SourceGedVersion; warnings: ImportWarning[] } {
  let value: string | undefined;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].level === 1 && lines[i].tag === "GEDC") {
      for (let j = i + 1; j < lines.length && lines[j].level > 1; j += 1) {
        if (lines[j].level === 2 && lines[j].tag === "VERS") {
          value = lines[j].value;
          break;
        }
      }
      break;
    }
  }
  if (!value) {
    return {
      version: "unknown",
      warnings: [{ code: "GED_VERSION_MISSING", message: "No se encontro HEAD.GEDC.VERS. Se intenta importar en modo tolerante." }]
    };
  }
  if (!SUPPORTED_VERSIONS.has(value)) {
    return {
      version: "unknown",
      warnings: [
        {
          code: "GED_VERSION_UNKNOWN",
          entity: "HEAD.GEDC.VERS",
          message: `Version ${value} no reconocida. Se intenta importar en modo tolerante.`
        }
      ]
    };
  }
  if (value.startsWith("5.5.1")) return { version: "5.5.1", warnings: [] };
  if (value.startsWith("5.5")) return { version: "5.5", warnings: [] };
  return { version: "7.0.x", warnings: [] };
}

function collectUnknownTags(record: ParsedLine[], target: { rawTags?: Record<string, string[]> }) {
  const known = new Set([
    "HEAD", "TRLR", "INDI", "FAM", "OBJE", "NAME", "SEX", "FAMC", "FAMS", "HUSB", "WIFE", "CHIL",
    "BIRT", "DEAT", "MARR", "DIV", "DATE", "PLAC", "FILE", "TITL", "FORM", "GEDC", "VERS", "CHAR",
    "LANG", "NOTE", "SOUR", "REFN", "CHAN", "SUBM", "DATA", "CORP", "ADDR", "COMM"
  ]);

  for (const line of record) {
    if (line.level === 1 && !known.has(line.tag)) {
      if (!target.rawTags) target.rawTags = {};
      if (!target.rawTags[line.tag]) target.rawTags[line.tag] = [];
      if (line.value) target.rawTags[line.tag].push(line.value);

      // Collect sub-tags (level 2+)
      let j = record.indexOf(line) + 1;
      while (j < record.length && record[j].level > 1) {
        const sub = record[j];
        const combined = `${sub.level} ${sub.tag}${sub.value ? " " + sub.value : ""}`;
        target.rawTags[line.tag].push(combined);
        j++;
      }
    }
  }
}

function ensureCriticalStructure(doc: GeneaDocument): GedParseError[] {
  const errors: GedParseError[] = [];
  for (const family of Object.values(doc.families)) {
    for (const childId of family.childrenIds) {
      if (!doc.persons[childId]) {
        errors.push({ line: 1, entity: family.id, message: `Familia referencia hijo inexistente: ${childId}` });
      }
    }
    if (family.husbandId && !doc.persons[family.husbandId]) {
      errors.push({ line: 1, entity: family.id, message: `Familia referencia esposo inexistente: ${family.husbandId}` });
    }
    if (family.wifeId && !doc.persons[family.wifeId]) {
      errors.push({ line: 1, entity: family.id, message: `Familia referencia esposa inexistente: ${family.wifeId}` });
    }
  }
  return errors;
}

export function parseGedcomAnyVersion(raw: string): ImportGedResult {
  const { lines, errors } = parseLines(raw);
  if (errors.length > 0) return { document: null, errors, warnings: [], sourceVersion: "unknown" };

  const versionData = detectVersion(lines);
  const warnings: ImportWarning[] = [...versionData.warnings];
  const persons: Record<string, Person> = {};
  const families: Record<string, Family> = {};
  const media: Record<string, Media> = {};
  const records = splitTopLevelRecords(lines);

  for (const record of records) {
    const head = record[0];
    // collectUnknownTags call moved into specific record handlers below

    if (!head.xref || head.level !== 0) continue;
    if (head.tag === "INDI") {
      const person = emptyPerson(head.xref);
      for (const line of record) {
        if (line.tag === "NAME" && line.value) {
          const match = line.value.match(/^(.*?)\/(.*?)\/(.*)$/);
          if (match) {
            person.name = `${match[1]} ${match[3]}`.trim().replace(/\s+/g, " ");
            person.surname = match[2].trim();
          } else {
            person.name = line.value.replaceAll("/", "").trim();
          }
        }
        if (line.tag === "SEX" && (line.value === "M" || line.value === "F" || line.value === "U")) person.sex = line.value;
        if (line.tag === "FAMC" && line.value) person.famc.push(line.value);
        if (line.tag === "FAMS" && line.value) person.fams.push(line.value);
        if (line.tag === "OBJE" && line.value) person.mediaRefs.push(line.value);
      }
      collectUnknownTags(record, person);
      parseRecordEvents(record, person);
      person.lifeStatus = person.events.some((event) => event.type === "DEAT") ? "deceased" : "alive";
      persons[person.id] = person;
    } else if (head.tag === "FAM") {
      const family = emptyFamily(head.xref);
      for (const line of record) {
        if (line.tag === "HUSB" && line.value) family.husbandId = line.value;
        if (line.tag === "WIFE" && line.value) family.wifeId = line.value;
        if (line.tag === "CHIL" && line.value) family.childrenIds.push(line.value);
        if (line.tag === "NAME" && line.value) family.name = line.value;
      }
      collectUnknownTags(record, family);
      parseRecordEvents(record, family);
      families[family.id] = family;
    } else if (head.tag === "OBJE") {
      const m: Media = { id: head.xref };
      for (const line of record) {
        if (line.tag === "FILE" && line.value) m.fileName = line.value;
        if (line.tag === "TITL" && line.value) m.title = line.value;
        if (line.tag === "FORM" && line.value) m.mimeType = line.value;
      }
      media[m.id] = m;
    }
  }

  const document: GeneaDocument = {
    persons,
    families,
    unions: {},
    parentChildLinks: {},
    siblingLinks: {},
    media,
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
  const criticalErrors = ensureCriticalStructure(document);
  if (criticalErrors.length > 0) {
    return { document: null, errors: criticalErrors, warnings, sourceVersion: versionData.version };
  }
  return { document, errors: [], warnings, sourceVersion: versionData.version };
}

export async function parseGedzipAnyVersion(
  file: File | Blob | ArrayBuffer | Uint8Array,
  sourceExt: "gdz" | "gsz" = "gdz"
): Promise<ImportGedResult> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.keys(zip.files);
  const gedEntry = entries.find((k) => k.toLowerCase().endsWith(".ged"));
  if (!gedEntry) {
    return { document: null, errors: [{ line: 1, message: "GEDZIP sin archivo .ged." }], warnings: [], sourceVersion: "unknown" };
  }

  const gedRaw = await zip.file(gedEntry)!.async("string");
  const parsed = parseGedcomAnyVersion(gedRaw);
  if (!parsed.document) return parsed;

  for (const mediaId of Object.keys(parsed.document.media)) {
    const m = parsed.document.media[mediaId];
    if (m.fileName && zip.file(m.fileName)) {
      m.bytes = await zip.file(m.fileName)!.async("uint8array");
      const mime = m.mimeType || (m.fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
      const blob = new Blob([m.bytes as unknown as BlobPart], { type: mime });
      m.dataUrl = URL.createObjectURL(blob);
    }
  }
  parsed.document.metadata.sourceFormat = sourceExt === "gsz" ? "GSZ" : "GDZ";

  const gskEntry = entries.find((k) => k === "geneasketch.json");
  if (gskEntry) {
    const gskRaw = await zip.file(gskEntry)!.async("string");
    parsed.gskMeta = parseGsk(gskRaw);
  }

  return parsed;
}
