import { estimatePersonBirthYear } from "@/core/inference/dateInference";
import { normalizeGedcomTimelineDate, certaintyRank } from "@/core/timeline/dateNormalization";
import type { ExpandedGraph, GraphDocument, ViewConfig } from "@/types/domain";
import type { TimelineDateCertainty, TimelineEventType, TimelineItem } from "@/types/editor";

type EventCandidate = {
  certainty: TimelineDateCertainty;
  undated: boolean;
  sortDate: Date | null;
  sortTimestamp: number | null;
  displayDate: string;
  detailSuffix?: string;
};

const EVENT_ORDER: Record<TimelineEventType, number> = {
  BIRT: 0,
  MARR: 1,
  DIV: 2,
  DEAT: 3
};

function fullName(name?: string, surname?: string): string {
  const value = `${name ?? ""}${surname ? ` ${surname}` : ""}`.trim();
  return value || "Sin nombre";
}

function collectScopePersonIds(
  document: GraphDocument,
  expandedGraph: ExpandedGraph,
  viewConfig: ViewConfig
): Set<string> {
  if (viewConfig.timeline.scope === "all") {
    return new Set(Object.keys(document.persons));
  }

  const scoped = new Set<string>();
  for (const node of expandedGraph.nodes) {
    if (node.type !== "person" && node.type !== "personAlias") continue;
    const canonicalId = node.canonicalId ?? node.id;
    if (document.persons[canonicalId]) scoped.add(canonicalId);
  }

  if (scoped.size === 0 && viewConfig.focusPersonId && document.persons[viewConfig.focusPersonId]) {
    scoped.add(viewConfig.focusPersonId);
  }

  return scoped;
}

function compareCandidates(left: EventCandidate, right: EventCandidate): number {
  const certaintyDelta = certaintyRank(right.certainty) - certaintyRank(left.certainty);
  if (certaintyDelta !== 0) return certaintyDelta;

  const leftTs = left.sortTimestamp ?? Number.POSITIVE_INFINITY;
  const rightTs = right.sortTimestamp ?? Number.POSITIVE_INFINITY;
  if (leftTs !== rightTs) return leftTs - rightTs;

  return left.displayDate.localeCompare(right.displayDate);
}

function pickBestCandidate(candidates: EventCandidate[]): EventCandidate | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort(compareCandidates)[0] ?? null;
}

function fallbackBirthYearFromContext(document: GraphDocument, personId: string): number {
  const person = document.persons[personId];
  if (!person) return new Date().getFullYear() - 30;

  const death = normalizeGedcomTimelineDate(person.events.find((event) => event.type === "DEAT")?.date);
  if (death.sortDate) return death.sortDate.getUTCFullYear() - 70;

  const marriageYears: number[] = [];
  const childBirthYears: number[] = [];

  for (const famId of person.fams) {
    const fam = document.families[famId];
    if (!fam) continue;

    const marriage = normalizeGedcomTimelineDate(
      fam.events.find((event) => event.type === "MARR")?.date
    );
    if (marriage.sortDate) marriageYears.push(marriage.sortDate.getUTCFullYear());

    for (const childId of fam.childrenIds) {
      const child = document.persons[childId];
      if (!child) continue;
      const childBirth = normalizeGedcomTimelineDate(
        child.events.find((event) => event.type === "BIRT")?.date
      );
      if (childBirth.sortDate) childBirthYears.push(childBirth.sortDate.getUTCFullYear());
    }
  }

  if (childBirthYears.length > 0) return Math.min(...childBirthYears) - 28;
  if (marriageYears.length > 0) return Math.min(...marriageYears) - 24;

  return new Date().getFullYear() - 30;
}

function makePersonItem(
  document: GraphDocument,
  personId: string,
  eventType: "BIRT" | "DEAT",
  candidate: EventCandidate
): TimelineItem {
  const person = document.persons[personId]!;
  const personName = fullName(person.name, person.surname);
  const parents = new Set<string>();

  if (eventType === "BIRT") {
    for (const familyId of person.famc) {
      const family = document.families[familyId];
      if (!family) continue;
      if (family.husbandId) parents.add(family.husbandId);
      if (family.wifeId) parents.add(family.wifeId);
    }
  }

  const eventLabel = eventType === "BIRT" ? "Nacimiento" : "Defuncion";
  const detail = `Persona: ${personName} (${person.id})${candidate.detailSuffix ? ` · ${candidate.detailSuffix}` : ""}`;

  return {
    id: `person:${personId}:${eventType}`,
    eventType,
    label: `${personName} — ${eventLabel}`,
    detail,
    displayDate: candidate.displayDate,
    sortDate: candidate.sortDate,
    sortTimestamp: candidate.sortTimestamp,
    certainty: candidate.certainty,
    undated: candidate.undated,
    personIds: [personId],
    primaryPersonId: personId,
    secondaryPersonIds: Array.from(parents).filter((id) => id !== personId)
  };
}

function buildPersonEvent(
  document: GraphDocument,
  personId: string,
  eventType: "BIRT" | "DEAT"
): TimelineItem | null {
  const person = document.persons[personId];
  if (!person) return null;

  const eventRows = person.events.filter((event) => event.type === eventType);
  const candidates: EventCandidate[] = eventRows.map((event) => {
    const parsed = normalizeGedcomTimelineDate(event.date);
    return {
      certainty: parsed.certainty,
      undated: parsed.undated,
      sortDate: parsed.sortDate,
      sortTimestamp: parsed.sortTimestamp,
      displayDate: parsed.displayDate,
      detailSuffix: event.place ? `Lugar: ${event.place}` : undefined
    };
  });

  if (eventType === "BIRT") {
    // Preserve user-entered informal/undated dates; infer only when no birth signal exists.
    if (candidates.length === 0) {
      const inferred = estimatePersonBirthYear(personId, document);
      const inferredYear =
        typeof inferred?.suggestedYear === "number"
          ? inferred.suggestedYear
          : fallbackBirthYearFromContext(document, personId);

      if (Number.isFinite(inferredYear)) {
        const inferredDate = new Date(Date.UTC(inferredYear, 0, 1));
        const rangeText = inferred?.suggestedRange
          ? `Rango ${inferred.suggestedRange[0]}-${inferred.suggestedRange[1]}`
          : "Referencia contextual";

        candidates.push({
          certainty: "inferred_auto",
          undated: false,
          sortDate: inferredDate,
          sortTimestamp: inferredDate.getTime(),
          displayDate: `~${inferredYear} (calculada)`,
          detailSuffix: `Fecha calculada solo de referencia · ${rangeText}`
        });
      }
    }
  }

  if (candidates.length === 0) return null;
  const best = pickBestCandidate(candidates);
  if (!best) return null;
  return makePersonItem(document, personId, eventType, best);
}

function makeFamilyLabel(document: GraphDocument, familyId: string, eventType: "MARR" | "DIV"): string {
  const family = document.families[familyId]!;
  const left =
    family.husbandId
      ? fullName(document.persons[family.husbandId]?.name, document.persons[family.husbandId]?.surname)
      : "Sin padre";
  const right =
    family.wifeId
      ? fullName(document.persons[family.wifeId]?.name, document.persons[family.wifeId]?.surname)
      : "Sin madre";
  return `${left} + ${right} — ${eventType === "MARR" ? "Matrimonio" : "Divorcio"}`;
}

function buildFamilyEvent(
  document: GraphDocument,
  familyId: string,
  eventType: "MARR" | "DIV"
): TimelineItem | null {
  const family = document.families[familyId];
  if (!family) return null;

  const rows = family.events.filter((event) => event.type === eventType);
  if (rows.length === 0) return null;

  const candidates: EventCandidate[] = rows.map((event) => {
    const parsed = normalizeGedcomTimelineDate(event.date);
    return {
      certainty: parsed.certainty,
      undated: parsed.undated,
      sortDate: parsed.sortDate,
      sortTimestamp: parsed.sortTimestamp,
      displayDate: parsed.displayDate,
      detailSuffix: event.place ? `Lugar: ${event.place}` : undefined
    };
  });

  const best = pickBestCandidate(candidates);
  if (!best) return null;

  const personIds = [family.husbandId, family.wifeId].filter(
    (id): id is string => Boolean(id && document.persons[id])
  );
  const primaryPersonId = personIds[0] ?? null;
  const secondaryPersonIds = primaryPersonId ? personIds.filter((id) => id !== primaryPersonId) : [];

  return {
    id: `family:${familyId}:${eventType}`,
    eventType,
    label: makeFamilyLabel(document, familyId, eventType),
    detail: `Familia: ${family.id}${best.detailSuffix ? ` · ${best.detailSuffix}` : ""}`,
    displayDate: best.displayDate,
    sortDate: best.sortDate,
    sortTimestamp: best.sortTimestamp,
    certainty: best.certainty,
    undated: best.undated,
    personIds,
    primaryPersonId,
    secondaryPersonIds,
    familyId
  };
}

function compareTimelineItems(left: TimelineItem, right: TimelineItem): number {
  if (left.undated !== right.undated) return left.undated ? 1 : -1;

  const leftTs = left.sortTimestamp ?? Number.POSITIVE_INFINITY;
  const rightTs = right.sortTimestamp ?? Number.POSITIVE_INFINITY;
  if (leftTs !== rightTs) return leftTs - rightTs;

  if (EVENT_ORDER[left.eventType] !== EVENT_ORDER[right.eventType]) {
    return EVENT_ORDER[left.eventType] - EVENT_ORDER[right.eventType];
  }

  return left.label.localeCompare(right.label);
}

export function buildTimeline(
  document: GraphDocument,
  expandedGraph: ExpandedGraph,
  viewConfig: ViewConfig
): TimelineItem[] {
  const scopePersonIds = collectScopePersonIds(document, expandedGraph, viewConfig);
  const items: TimelineItem[] = [];

  const sortedPersonIds = [...scopePersonIds].sort();
  for (const personId of sortedPersonIds) {
    const birth = buildPersonEvent(document, personId, "BIRT");
    if (birth) items.push(birth);

    const death = buildPersonEvent(document, personId, "DEAT");
    if (death) items.push(death);
  }

  const familyIds =
    viewConfig.timeline.scope === "all"
      ? new Set(Object.keys(document.families))
      : new Set<string>();

  if (viewConfig.timeline.scope === "visible") {
    for (const personId of scopePersonIds) {
      const person = document.persons[personId];
      if (!person) continue;
      for (const famId of [...person.famc, ...person.fams]) {
        if (document.families[famId]) familyIds.add(famId);
      }
    }
  }

  for (const familyId of familyIds) {
    const marriage = buildFamilyEvent(document, familyId, "MARR");
    if (marriage) items.push(marriage);

    const divorce = buildFamilyEvent(document, familyId, "DIV");
    if (divorce) items.push(divorce);
  }

  return items.sort(compareTimelineItems);
}

