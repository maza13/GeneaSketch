import { collectKinshipNodes } from "@/core/inference/kinshipConstraintEngine";
import type { FactEvent } from "@/core/inference/types";
import type { GeneaDocument, Person } from "@/types/domain";

type Relation = FactEvent["relationToFocus"];

function normalizePedi(value?: string): "BIRTH" | "ADOPTED" | "FOSTER" | "SEALING" | "UNKNOWN" {
  const upper = (value || "").toUpperCase();
  if (upper === "BIRTH") return "BIRTH";
  if (upper === "ADOPTED") return "ADOPTED";
  if (upper === "FOSTER") return "FOSTER";
  if (upper === "SEALING") return "SEALING";
  return "UNKNOWN";
}

function getFamcLinks(person: Person): Array<{ familyId: string; pedi: "BIRTH" | "ADOPTED" | "FOSTER" | "SEALING" | "UNKNOWN"; reference: string }> {
  if (person.famcLinks && person.famcLinks.length > 0) {
    return person.famcLinks.map((link, index) => ({
      familyId: link.familyId,
      pedi: normalizePedi(link.pedi),
      reference: link.reference || `famc-link:${person.id}:${index}`
    }));
  }
  return (person.famc || []).map((familyId, index) => ({
    familyId,
    pedi: "UNKNOWN",
    reference: `famc-legacy:${person.id}:${index}`
  }));
}

function pushPersonEvents(
  document: GeneaDocument,
  personId: string,
  relationToFocus: Relation,
  referencePrefix: string,
  into: FactEvent[],
  opts: {
    flags?: string[];
    layer?: 1 | 2 | 3;
    generationDelta?: number;
    relationPath?: string[];
    includePersonNotes?: boolean;
    includeBirthFacts?: boolean;
  } = {}
) {
  const person = document.persons[personId];
  if (!person) return;
  const supported = new Set(["BIRT", "DEAT", "CHR", "BAPM", "BURI", "CENS", "RESI", "NOTE"]);

  for (const event of person.events || []) {
    if (!supported.has(event.type)) continue;
    if (event.type === "BIRT" && opts.includeBirthFacts === false) continue;
    into.push({
      personId,
      relationToFocus,
      eventTag: event.type as FactEvent["eventTag"],
      dateRaw: event.date,
      placeRaw: event.place,
      quality: event.quality,
      reference: `${referencePrefix}:${personId}:${event.type}`,
      flags: opts.flags,
      layer: opts.layer,
      generationDelta: opts.generationDelta,
      relationPath: opts.relationPath
    });
  }

  if (person.birthDate && opts.includeBirthFacts !== false) {
    into.push({
      personId,
      relationToFocus,
      eventTag: "BIRT",
      dateRaw: person.birthDate,
      placeRaw: person.birthPlace,
      reference: `${referencePrefix}:${personId}:BIRT_FIELD`,
      flags: opts.flags,
      layer: opts.layer,
      generationDelta: opts.generationDelta,
      relationPath: opts.relationPath
    });
  }

  if (person.deathDate) {
    into.push({
      personId,
      relationToFocus,
      eventTag: "DEAT",
      dateRaw: person.deathDate,
      placeRaw: person.deathPlace,
      reference: `${referencePrefix}:${personId}:DEAT_FIELD`,
      flags: opts.flags,
      layer: opts.layer,
      generationDelta: opts.generationDelta,
      relationPath: opts.relationPath
    });
  }

  if (person.residence) {
    into.push({
      personId,
      relationToFocus,
      eventTag: "NOTE",
      value: person.residence,
      placeRaw: person.residence,
      reference: `${referencePrefix}:${personId}:RESI`,
      flags: opts.flags,
      layer: opts.layer,
      generationDelta: opts.generationDelta,
      relationPath: opts.relationPath
    });
  }

  if (opts.includePersonNotes && person.rawTags?.NOTE?.length) {
    person.rawTags.NOTE.forEach((note, index) => {
      if (!note || note.trim().length === 0) return;
      into.push({
        personId,
        relationToFocus,
        eventTag: "NOTE",
        value: note.trim(),
        reference: `${referencePrefix}:${personId}:NOTE:${index + 1}`,
        flags: opts.flags,
        layer: opts.layer,
        generationDelta: opts.generationDelta,
        relationPath: opts.relationPath
      });
    });
  }
}

function pushFamilyEvents(
  document: GeneaDocument,
  familyId: string,
  relationToFocus: Relation,
  referencePrefix: string,
  into: FactEvent[],
  opts: { flags?: string[]; layer?: 1 | 2 | 3; generationDelta?: number; relationPath?: string[] } = {}
) {
  const family = document.families[familyId];
  if (!family) return;

  for (const event of family.events || []) {
    if (event.type !== "MARR" && event.type !== "DIV") continue;
    into.push({
      personId: family.husbandId || family.wifeId || "family",
      relationToFocus,
      eventTag: event.type,
      dateRaw: event.date,
      placeRaw: event.place,
      quality: event.quality,
      reference: `${referencePrefix}:${familyId}:${event.type}`,
      flags: opts.flags,
      layer: opts.layer,
      generationDelta: opts.generationDelta,
      relationPath: opts.relationPath
    });
  }

  if (family.rawTags?.NOTE?.length) {
    family.rawTags.NOTE.forEach((note, index) => {
      if (!note || note.trim().length === 0) return;
      into.push({
        personId: family.husbandId || family.wifeId || "family",
        relationToFocus,
        eventTag: "NOTE",
        value: note.trim(),
        reference: `${referencePrefix}:${familyId}:NOTE:${index + 1}`,
        flags: opts.flags,
        layer: opts.layer,
        generationDelta: opts.generationDelta,
        relationPath: opts.relationPath
      });
    });
  }
}

function relationFromHint(hint: "parent" | "child" | "spouse" | "sibling" | "other"): Relation {
  if (hint === "parent" || hint === "child" || hint === "spouse" || hint === "sibling") return hint;
  return "other";
}

export function collectBirthEstimationFacts(document: GeneaDocument, focusPersonId: string): FactEvent[] {
  const focus = document.persons[focusPersonId];
  if (!focus) return [];

  const facts: FactEvent[] = [];

  // Focus direct events and notes.
  pushPersonEvents(document, focusPersonId, "focus", "focus", facts, {
    layer: 1,
    generationDelta: 0,
    includePersonNotes: true,
    includeBirthFacts: false
  });

  // Keep PEDI flags for direct parent family links.
  const pediByFamily = new Map<string, string[]>();
  for (const famcLink of getFamcLinks(focus)) {
    const nonBiological = famcLink.pedi !== "BIRTH" && famcLink.pedi !== "UNKNOWN";
    const flags = nonBiological
      ? ["non_biological_link", `pedi:${famcLink.pedi}`]
      : famcLink.pedi === "UNKNOWN"
        ? ["pedi_unknown"]
        : ["pedi_birth"];
    pediByFamily.set(famcLink.familyId, flags);
  }

  const kinshipNodes = collectKinshipNodes(document, focusPersonId, 3);
  for (const node of kinshipNodes) {
    const relation = relationFromHint(node.relationHint);
    const flags = node.layer === 1 && node.relationHint === "parent"
      ? (focus.famc || []).flatMap((familyId) => pediByFamily.get(familyId) || [])
      : undefined;
    pushPersonEvents(document, node.personId, relation, `layer${node.layer}:${node.relationHint}`, facts, {
      flags,
      layer: node.layer,
      generationDelta: node.generationDelta,
      relationPath: node.relationPath,
      includePersonNotes: true
    });
  }

  // Family events/notes in current unions and origin families should always be considered.
  for (const familyId of [...(focus.famc || []), ...(focus.fams || [])]) {
    pushFamilyEvents(document, familyId, "focus", "focus_family", facts, { layer: 1, generationDelta: 0 });
  }

  const dedupe = new Map<string, FactEvent>();
  for (const fact of facts) {
    const key = `${fact.personId}|${fact.eventTag}|${fact.dateRaw || ""}|${fact.placeRaw || ""}|${fact.value || ""}|${(fact.layer || 1)}|${fact.reference}`;
    if (!dedupe.has(key)) dedupe.set(key, fact);
  }
  return Array.from(dedupe.values()).sort((a, b) => a.reference.localeCompare(b.reference));
}
