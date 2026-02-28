import JSZip from "jszip";
import type { Family, GedExportVersion, GedExportWarning, GeneaDocument, Person } from "@/types/domain";
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

function warn(warnings: GedExportWarningCollector | undefined, warning: GedExportWarning) {
  warnings?.push(warning);
}

function personToGed(person: Person, options?: SerializeGedOptions): string[] {
  const out: string[] = [];
  const warnings = options?.warnings;
  out.push(xline(0, person.id, "INDI"));
  const nameVal = person.surname ? `${person.name} /${person.surname}/` : person.name;
  out.push(line(1, "NAME", nameVal));
  out.push(line(1, "SEX", person.sex));
  for (const famc of person.famc) out.push(line(1, "FAMC", famc));
  for (const fams of person.fams) out.push(line(1, "FAMS", fams));
  for (const m of person.mediaRefs) out.push(line(1, "OBJE", m));

  if (person.events.some((ev) => ev.type === "OTHER")) {
    warn(warnings, {
      code: "GED_EVENT_OTHER_DROPPED",
      entity: person.id,
      message: "Eventos OTHER no se exportan en el perfil GED actual.",
      level: "warn"
    });
  }

  const birth = person.events.find((ev) => ev.type === "BIRT");
  if (birth) {
    out.push(line(1, "BIRT"));
    if (birth.date) out.push(line(2, "DATE", birth.date));
    if (birth.place) out.push(line(2, "PLAC", birth.place));
  }

  if (person.lifeStatus === "deceased") {
    const death = person.events.find((ev) => ev.type === "DEAT");
    out.push(line(1, "DEAT"));
    if (death?.date) out.push(line(2, "DATE", death.date));
    if (death?.place) out.push(line(2, "PLAC", death.place));
    if (!death) {
      warn(warnings, {
        code: "GED_DEAT_IMPLICIT",
        entity: person.id,
        message: "Persona marcada como fallecida sin evento DEAT explicito; se exporta DEAT vacio.",
        level: "info"
      });
    }
  }
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
    if (ev.type === "MARR" || ev.type === "DIV") {
      out.push(line(1, ev.type));
      if (ev.date) out.push(line(2, "DATE", ev.date));
      if (ev.place) out.push(line(2, "PLAC", ev.place));
    }
  }
  if (family.events.some((ev) => ev.type !== "MARR" && ev.type !== "DIV")) {
    warn(warnings, {
      code: "GED_FAM_EVENT_DROPPED",
      entity: family.id,
      message: "Eventos de familia fuera de MARR/DIV no se exportan en el perfil GED actual.",
      level: "warn"
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

  Object.values(doc.persons).forEach((person) => out.push(...personToGed(person, options)));
  Object.values(doc.families).forEach((family) => out.push(...familyToGed(family, options)));
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
