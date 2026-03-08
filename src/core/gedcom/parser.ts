import type {
  Event,
  Family,
  GedParseError,
  GeneaDocument,
  ImportWarning,
  Media,
  NoteRecord,
  Person,
  SourceRecord,
  SourceGedVersion
} from "@/types/domain";
import { ERROR_CODES } from "@/core/genraph/errorCatalog";
import { inferCanonicalSurnameFields } from "@/core/naming/surname";

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
  const supported = new Set(["BIRT", "DEAT", "MARR", "DIV", "CHR", "BAPM", "BURI", "CENS", "RESI", "NOTE", "OTHER"]);
  for (let i = 0; i < record.length; i += 1) {
    const line = record[i];
    if (line.level !== 1) continue;
    if (!supported.has(line.tag)) continue;
    const parsed = parseEvent(record, i);
    personOrFamily.events.push(parsed.event);
    i = parsed.nextIndex - 1;
  }
}

function normalizePedi(value?: string): "BIRTH" | "ADOPTED" | "FOSTER" | "SEALING" | "UNKNOWN" {
  const upper = (value || "").toUpperCase();
  if (upper === "BIRTH") return "BIRTH";
  if (upper === "ADOPTED") return "ADOPTED";
  if (upper === "FOSTER") return "FOSTER";
  if (upper === "SEALING") return "SEALING";
  return "UNKNOWN";
}

function parseFamcLinks(record: ParsedLine[], person: Person, warnings: ImportWarning[]) {
  for (let i = 0; i < record.length; i += 1) {
    const line = record[i];
    if (line.tag !== "FAMC" || !line.value) continue;
    const link: NonNullable<Person["famcLinks"]>[number] = {
      familyId: line.value,
      reference: `line:${line.lineNo}`
    };
    for (let j = i + 1; j < record.length && record[j].level > line.level; j += 1) {
      const sub = record[j];
      if (sub.tag === "PEDI") {
        const normalized = normalizePedi(sub.value);
        if ((sub.value || "").trim().length > 0 && normalized === "UNKNOWN" && sub.value?.toUpperCase() !== "UNKNOWN") {
          warnings.push({
            code: ERROR_CODES.PEDI_UNKNOWN_VALUE_COERCED,
            line: sub.lineNo,
            entity: person.id,
            message: `PEDI valor no reconocido (${sub.value}) coercionado a UNKNOWN.`
          });
        }
        link.pedi = normalized;
      }
      if (sub.tag === "QUAY" && (sub.value === "0" || sub.value === "1" || sub.value === "2" || sub.value === "3")) {
        link.quality = sub.value;
      }
    }
    if (!person.famcLinks) person.famcLinks = [];
    person.famcLinks.push(link);
  }
}

function parseNoteValue(record: ParsedLine[], startIndex: number): { value: string; nextIndex: number } {
  const line = record[startIndex];
  let value = line.value || "";
  let j = startIndex + 1;
  while (j < record.length && record[j].level > line.level) {
    const sub = record[j];
    if (sub.tag === "CONT") {
      value += "\n" + (sub.value || "");
    } else if (sub.tag === "CONC") {
      value += (sub.value || "");
    } else {
      // Other sub-tags of NOTE (like SOUR) are not handled here yet
      break;
    }
    j++;
  }
  return { value, nextIndex: j };
}

function isXrefPointer(value: string | undefined): value is string {
  return typeof value === "string" && /^@[^@]+@$/.test(value.trim());
}

function parseChangeMeta(record: ParsedLine[], startIndex: number): { date?: string; time?: string; actor?: string; raw?: string[]; nextIndex: number } {
  const line = record[startIndex];
  const result: { date?: string; time?: string; actor?: string; raw?: string[] } = {};
  let j = startIndex + 1;
  while (j < record.length && record[j].level > line.level) {
    const sub = record[j];
    if (sub.tag === "DATE") result.date = sub.value;
    else if (sub.tag === "TIME") result.time = sub.value;
    else {
      if (!result.raw) result.raw = [];
      result.raw.push(`${sub.level} ${sub.tag}${sub.value ? ` ${sub.value}` : ""}`);
    }
    j += 1;
  }
  return { ...result, nextIndex: j };
}

function parseNameParts(record: ParsedLine[], startIndex: number, warnings?: ImportWarning[]): {
  value: string;
  given?: string;
  surname?: string;
  nickname?: string;
  prefix?: string;
  suffix?: string;
  title?: string;
  nextIndex: number;
} {
  const line = record[startIndex];
  const result: { value: string; given?: string; surname?: string; nickname?: string; prefix?: string; suffix?: string; title?: string } = {
    value: line.value || ""
  };
  let j = startIndex + 1;
  while (j < record.length && record[j].level > line.level) {
    const sub = record[j];
    if (sub.tag === "GIVN") result.given = sub.value;
    else if (sub.tag === "SURN") result.surname = sub.value;
    else if (sub.tag === "NICK") result.nickname = sub.value;
    else if (sub.tag === "NPFX") result.prefix = sub.value;
    else if (sub.tag === "NSFX") result.suffix = sub.value;
    j += 1;
  }
  // Fallback: infer given/surname from slash notation if tags missing
  if (!result.given || !result.surname) {
    const match = result.value.match(/^(.*?)\/(.*?)\/(.*)$/);
    if (match) {
      if (!result.given) result.given = `${match[1]} ${match[3]}`.trim().replace(/\s+/g, " ");
      if (!result.surname) result.surname = match[2].trim();
      if (warnings) {
        warnings.push({
          code: ERROR_CODES.GED_NAME_PARTS_INFERRED,
          message: `Inferencia de partes de nombre via delimitadores / / para "${result.value}"`
        });
      }
    } else if (!result.given && !result.value.includes("/")) {
      result.given = result.value.trim();
    }
  }

  // Heuristic metadata extraction: isolate common prefixes/suffixes if not explicitly tagged
  if (result.given && !result.prefix) {
    const prefixes = ["Dr.", "Dra.", "Sr.", "Sra.", "Don", "Doña", "Sir", "Lady", "Fr.", "Mtr.", "Mtro."];
    for (const p of prefixes) {
      if (result.given.startsWith(p + " ")) {
        result.prefix = p;
        result.given = result.given.slice(p.length + 1).trim();
        if (warnings) {
          warnings.push({
            code: ERROR_CODES.GED_NAME_METADATA_INFERRED,
            message: `Prefijo "${p}" inferido de la cadena de nombre.`
          });
        }
        break;
      }
    }
  }
  if (result.given && !result.suffix) {
    const suffixes = ["Jr.", "Sr.", "III", "IV", "V", "Ph.D.", "M.D."];
    for (const s of suffixes) {
      if (result.given.endsWith(" " + s)) {
        result.suffix = s;
        result.given = result.given.slice(0, -(s.length + 1)).trim();
        if (warnings) {
          warnings.push({
            code: ERROR_CODES.GED_NAME_METADATA_INFERRED,
            message: `Sufijo "${s}" inferido de la cadena de nombre.`
          });
        }
        break;
      }
    }
  }

  return { ...result, nextIndex: j };
}

function parseSourceRef(record: ParsedLine[], startIndex: number): {
  ref: {
    id: string;
    title?: string;
    page?: string;
    text?: string;
    note?: string;
    quality?: "0" | "1" | "2" | "3";
  };
  nextIndex: number;
} {
  const line = record[startIndex];
  const ref: {
    id: string;
    title?: string;
    page?: string;
    text?: string;
    note?: string;
    quality?: "0" | "1" | "2" | "3";
  } = {
    id: line.value || ""
  };
  let j = startIndex + 1;
  while (j < record.length && record[j].level > line.level) {
    const sub = record[j];
    if (sub.tag === "PAGE") ref.page = sub.value;
    else if (sub.tag === "TEXT") ref.text = sub.value;
    else if (sub.tag === "NOTE") ref.note = sub.value;
    else if (sub.tag === "QUAY" && (sub.value === "0" || sub.value === "1" || sub.value === "2" || sub.value === "3")) {
      ref.quality = sub.value;
    }
    j += 1;
  }
  return { ref, nextIndex: j };
}

function parseEvent(record: ParsedLine[], startIndex: number): { event: Event; nextIndex: number } {
  const line = record[startIndex];
  const event: Event = { type: line.tag as Event["type"] };
  let j = startIndex + 1;
  while (j < record.length && record[j].level > line.level) {
    const sub = record[j];
    if (sub.tag === "DATE") event.date = sub.value;
    else if (sub.tag === "PLAC") event.place = sub.value;
    else if (sub.tag === "ADDR") event.addr = sub.value;
    else if (sub.tag === "TYPE") event.subType = sub.value;
    else if (sub.tag === "PHRASE" && !event.date && sub.value) event.datePhrase = sub.value;
    else if (sub.tag === "QUAY" && (sub.value === "0" || sub.value === "1" || sub.value === "2" || sub.value === "3")) {
      event.quality = sub.value;
    } else if (sub.tag === "SOUR" && sub.value) {
      const parsed = parseSourceRef(record, j);
      if (!event.sourceRefs) event.sourceRefs = [];
      event.sourceRefs.push(parsed.ref);
      j = parsed.nextIndex - 1;
    } else if (sub.tag === "OBJE" && sub.value) {
      if (!event.mediaRefs) event.mediaRefs = [];
      event.mediaRefs.push(sub.value);
    } else if (sub.tag === "NOTE") {
      const parsed = parseNoteValue(record, j);
      if (isXrefPointer(sub.value)) {
        if (!event.noteRefs) event.noteRefs = [];
        event.noteRefs.push(sub.value!.trim());
      } else if (parsed.value.trim().length > 0) {
        if (!event.notesInline) event.notesInline = [];
        event.notesInline.push(parsed.value.trim());
      }
      j = parsed.nextIndex - 1;
    }
    j += 1;
  }
  return { event, nextIndex: j };
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
      warnings: [{ code: ERROR_CODES.GED_VERSION_MISSING, message: "No se encontro HEAD.GEDC.VERS. Se intenta importar en modo tolerante." }]
    };
  }
  if (!SUPPORTED_VERSIONS.has(value)) {
    return {
      version: "unknown",
      warnings: [
        {
          code: ERROR_CODES.GED_VERSION_UNKNOWN,
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
    "BIRT", "DEAT", "MARR", "DIV", "CHR", "BAPM", "BURI", "CENS", "RESI", "NOTE", "DATE", "PHRASE", "QUAY", "PLAC", "FILE", "TITL", "FORM", "GEDC", "VERS", "CHAR",
    "LANG", "SOUR", "REFN", "CHAN", "SUBM", "DATA", "CORP", "ADDR", "COMM", "SCHMA", "URI", "TIME", "TEXT", "PAGE", "CONT", "CONC", "GIVN", "SURN", "NICK", "TYPE"
  ]);

  for (let i = 0; i < record.length; i++) {
    const line = record[i];
    if (line.level === 1 && !known.has(line.tag) && line.tag !== "NOTE") {
      if (!target.rawTags) target.rawTags = {};
      if (!target.rawTags[line.tag]) target.rawTags[line.tag] = [];
      if (line.value) target.rawTags[line.tag].push(line.value);

      // Collect sub-tags (level 2+)
      let j = i + 1;
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
  const sources: Record<string, SourceRecord> = {};
  const notes: Record<string, NoteRecord> = {};
  const schemaUris: string[] = [];
  const records = splitTopLevelRecords(lines);

  for (const record of records) {
    const head = record[0];
    // collectUnknownTags call moved into specific record handlers below

    if (head.level !== 0) continue;
    if (head.tag === "HEAD") {
      for (let i = 0; i < record.length; i += 1) {
        const line = record[i];
        if (line.tag === "SCHMA") {
          for (let j = i + 1; j < record.length && record[j].level > line.level; j += 1) {
            const uri = record[j].value;
            if (record[j].tag === "URI" && typeof uri === "string" && uri.trim().length > 0) {
              schemaUris.push(uri);
            }
          }
        }
      }
      continue;
    }

    if (!head.xref) continue;
    if (head.tag === "INDI") {
      const person = emptyPerson(head.xref);
      let parsedName: any = null;
      for (let i = 0; i < record.length; i += 1) {
        const line = record[i];
        if (line.tag === "NAME" && line.value) {
          parsedName = parseNameParts(record, i, warnings);
          const match = parsedName.value.match(/^(.*?)\/(.*?)\/(.*)$/);
          if (match) {
            person.name = `${match[1]} ${match[3]}`.trim().replace(/\s+/g, " ");
            person.surname = match[2].trim();
          } else {
            person.name = parsedName.value.replaceAll("/", "").trim();
          }
          if (!person.names) person.names = [];
          person.names.push({
            value: parsedName.value,
            given: parsedName.given,
            surname: parsedName.surname,
            nickname: parsedName.nickname,
            prefix: parsedName.prefix,
            suffix: parsedName.suffix,
            title: parsedName.title,
            type: person.names.length === 0 ? "primary" : "other",
            primary: person.names.length === 0
          });
          i = parsedName.nextIndex - 1;
        }
        if (line.tag === "SEX" && (line.value === "M" || line.value === "F" || line.value === "U")) person.sex = line.value;
        if (line.tag === "TITL" && line.value) {
          if (!person.names) person.names = [];
          const primary = person.names.find(n => n.primary) || person.names[0];
          if (primary) {
            primary.title = line.value;
          } else {
            person.names.push({
              value: line.value,
              title: line.value,
              type: "primary",
              primary: true
            });
          }
        }
        if (line.tag === "FAMC" && line.value) person.famc.push(line.value);
        if (line.tag === "FAMS" && line.value) person.fams.push(line.value);
        if (line.tag === "OBJE" && line.value) person.mediaRefs.push(line.value);
        if (line.tag === "SOUR" && line.value) {
          const parsedSource = parseSourceRef(record, i);
          person.sourceRefs.push(parsedSource.ref);
          i = parsedSource.nextIndex - 1;
        }
        if (line.tag === "NOTE") {
          if (isXrefPointer(line.value)) {
            if (!person.noteRefs) person.noteRefs = [];
            person.noteRefs.push(line.value!.trim());
          } else {
            const parsedNote = parseNoteValue(record, i);
            if (!person.rawTags) person.rawTags = {};
            if (!person.rawTags.NOTE) person.rawTags.NOTE = [];
            person.rawTags.NOTE.push(parsedNote.value);
            i = parsedNote.nextIndex - 1;
          }
        }
        if (line.tag === "CHAN") {
          const parsedChange = parseChangeMeta(record, i);
          person.change = {
            date: parsedChange.date,
            time: parsedChange.time,
            actor: parsedChange.actor,
            raw: parsedChange.raw
          };
          i = parsedChange.nextIndex - 1;
        }
      }
      parseFamcLinks(record, person, warnings);
      const inferred = inferCanonicalSurnameFields({ rawSurname: person.surname, preferredOrder: "paternal_first" });
      person.surnamePaternal = inferred.surnamePaternal;
      person.surnameMaternal = inferred.surnameMaternal;
      person.surnameOrder = inferred.surnameOrder;
      person.surname = inferred.surname || person.surname;
      collectUnknownTags(record, person);
      parseRecordEvents(record, person);
      person.lifeStatus = person.events.some((event) => event.type === "DEAT") ? "deceased" : "alive";
      persons[person.id] = person;
    } else if (head.tag === "FAM") {
      const family = emptyFamily(head.xref);
      for (let i = 0; i < record.length; i += 1) {
        const line = record[i];
        if (line.tag === "HUSB" && line.value) family.husbandId = line.value;
        if (line.tag === "WIFE" && line.value) family.wifeId = line.value;
        if (line.tag === "CHIL" && line.value) family.childrenIds.push(line.value);
        if (line.tag === "NAME" && line.value) family.name = line.value;
        if (line.tag === "NOTE") {
          if (isXrefPointer(line.value)) {
            if (!family.noteRefs) family.noteRefs = [];
            family.noteRefs.push(line.value!.trim());
          } else {
            const parsedNote = parseNoteValue(record, i);
            if (!family.rawTags) family.rawTags = {};
            if (!family.rawTags.NOTE) family.rawTags.NOTE = [];
            family.rawTags.NOTE.push(parsedNote.value);
            i = parsedNote.nextIndex - 1;
          }
        }
        if (line.tag === "CHAN") {
          const parsedChange = parseChangeMeta(record, i);
          family.change = {
            date: parsedChange.date,
            time: parsedChange.time,
            actor: parsedChange.actor,
            raw: parsedChange.raw
          };
          i = parsedChange.nextIndex - 1;
        }
      }
      collectUnknownTags(record, family);
      parseRecordEvents(record, family);
      families[family.id] = family;
    } else if (head.tag === "SOUR") {
      const source: SourceRecord = { id: head.xref };
      for (let i = 0; i < record.length; i += 1) {
        const line = record[i];
        if (line.tag === "TITL" && line.value) source.title = line.value;
        if (line.tag === "TEXT" && line.value) source.text = line.value;
        if (line.tag === "CHAN") {
          const parsedChange = parseChangeMeta(record, i);
          source.change = {
            date: parsedChange.date,
            time: parsedChange.time,
            actor: parsedChange.actor,
            raw: parsedChange.raw
          };
          i = parsedChange.nextIndex - 1;
        }
        if (line.level === 1 && line.tag === "NOTE" && line.value) {
          if (!source.rawTags) source.rawTags = {};
          if (!source.rawTags.NOTE) source.rawTags.NOTE = [];
          source.rawTags.NOTE.push(line.value);
        }
      }
      sources[source.id] = source;
    } else if (head.tag === "NOTE") {
      let text = "";
      if (record[0].value) text = record[0].value;
      for (let i = 1; i < record.length; i += 1) {
        const line = record[i];
        if (line.tag === "CONT") text += `\n${line.value || ""}`;
        if (line.tag === "CONC") text += line.value || "";
      }
      notes[head.xref] = { id: head.xref, text: text.trim() };
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
    sources,
    notes,
    unions: {},
    parentChildLinks: {},
    siblingLinks: {},
    media,
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x", schemaUris }
  };
  const criticalErrors = ensureCriticalStructure(document);
  if (criticalErrors.length > 0) {
    return { document: null, errors: criticalErrors, warnings, sourceVersion: versionData.version };
  }
  return { document, errors: [], warnings, sourceVersion: versionData.version };
}


