import { parseDateToYearSpan } from "@/core/inference/dateSpanParser";
import { collectBirthEstimationFacts } from "@/core/inference/factCollector";
import type { FactEvent } from "@/core/inference/types";
import type {
  AiBirthRefinementLevel,
  AiBirthRefinementNotesScope,
  AiBirthRangeRefinementFact
} from "@/types/ai";
import type { GeneaDocument } from "@/types/domain";

type PlannerInput = {
  document: GeneaDocument;
  focusPersonId: string;
  level: AiBirthRefinementLevel;
  includeNotes: boolean;
  notesScope: AiBirthRefinementNotesScope;
  minimumSimpleDates?: number;
};

type PlannerOutput = {
  facts: AiBirthRangeRefinementFact[];
  layersUsed: Array<1 | 2 | 3>;
  contextStats: {
    factsCount: number;
    notesCount: number;
    layer1Count: number;
    layer2Count: number;
    layer3Count: number;
  };
  selectionTrace: string[];
};

type InternalFact = AiBirthRangeRefinementFact & {
  sourceFact: FactEvent;
};

function isApproximate(raw?: string): boolean {
  const upper = (raw || "").toUpperCase();
  return /^ABT\b|^EST\b|^CAL\b|^CIR\b|^C\.\b|^CA\b/.test(upper);
}

function classifyDateKind(raw?: string): "exact" | "approximate" | "range" | "unknown" {
  const span = parseDateToYearSpan(raw);
  if (span.precision === "unknown") return "unknown";
  if (span.precision === "range" || span.precision === "open_before" || span.precision === "open_after") return "range";
  if (span.precision === "exact") return "exact";
  if (span.precision === "year") return isApproximate(raw) ? "approximate" : "exact";
  return "unknown";
}

function relationAllowedForLevel(
  relation: AiBirthRangeRefinementFact["relationToFocus"],
  level: AiBirthRefinementLevel,
  layer: 1 | 2 | 3
): boolean {
  if (level === "simple") {
    if (relation === "focus" || relation === "parent" || relation === "spouse" || relation === "child") return true;
    return layer >= 2;
  }
  if (level === "balanced") return relation === "focus" || relation === "parent" || relation === "spouse" || relation === "child" || relation === "sibling";
  return true;
}

function defaultLayerCap(level: AiBirthRefinementLevel): 1 | 2 | 3 {
  if (level === "simple") return 1;
  if (level === "balanced") return 1;
  return 3;
}

function sourceKindFromFact(fact: FactEvent): AiBirthRangeRefinementFact["sourceKind"] {
  if (fact.reference.startsWith("focus_family:")) {
    if (fact.eventTag === "NOTE") return "family_note";
    return "family_event";
  }
  if (fact.eventTag === "NOTE") return "raw_note";
  if (fact.eventTag === "RESI") return "residence";
  return "event";
}

function toAiFact(document: GeneaDocument, fact: FactEvent): InternalFact {
  const eventType = fact.eventTag === "BIRT" || fact.eventTag === "DEAT" || fact.eventTag === "MARR" || fact.eventTag === "DIV"
    ? fact.eventTag
    : "NOTE";
  const span = parseDateToYearSpan(fact.dateRaw);
  const person = document.persons[fact.personId];
  const personLabel = person ? `${person.name}${person.surname ? ` ${person.surname}` : ""}`.trim() || person.id : fact.personId;
  const min = span.minYear;
  const max = span.maxYear;
  return {
    sourceFact: fact,
    personId: fact.personId,
    personLabel,
    relationToFocus: fact.relationToFocus,
    eventType,
    date: fact.dateRaw,
    place: fact.placeRaw,
    value: fact.value,
    sourceKind: sourceKindFromFact(fact),
    relatedEntityId: fact.personId,
    reference: fact.reference,
    layer: fact.layer,
    relationPath: fact.relationPath,
    dateKind: classifyDateKind(fact.dateRaw),
    dateYearSpan: min !== undefined && max !== undefined ? [min, max] : undefined
  };
}

function dedupeFacts(facts: InternalFact[]): InternalFact[] {
  const unique = new Map<string, InternalFact>();
  for (const fact of facts) {
    const key = `${fact.reference}|${fact.personId}|${fact.eventType}|${fact.date || ""}|${fact.value || ""}|${fact.layer || 1}`;
    if (!unique.has(key)) unique.set(key, fact);
  }
  return Array.from(unique.values());
}

function stripInternal(facts: InternalFact[]): AiBirthRangeRefinementFact[] {
  return facts.map(({ sourceFact: _ignored, ...fact }) => fact);
}

function isDateFact(fact: InternalFact): boolean {
  return fact.eventType !== "NOTE" && !!fact.date;
}

function withLayerCap(facts: InternalFact[], maxLayer: 1 | 2 | 3): InternalFact[] {
  return facts.filter((fact) => (fact.layer || 1) <= maxLayer);
}

function filterAllowedByLevel(facts: InternalFact[], level: AiBirthRefinementLevel): InternalFact[] {
  return facts.filter((fact) => relationAllowedForLevel(fact.relationToFocus, level, fact.layer || 1));
}

function filterDatePolicy(facts: InternalFact[], level: AiBirthRefinementLevel): InternalFact[] {
  if (level === "complex") return facts;
  return facts.filter((fact) => {
    if (!isDateFact(fact)) return true;
    return fact.dateKind === "exact" || fact.dateKind === "approximate";
  });
}

function selectExtremesByRelation(facts: InternalFact[], relation: "child" | "sibling"): InternalFact[] {
  const dateFacts = facts.filter((fact) => fact.relationToFocus === relation && isDateFact(fact));
  const notes = facts.filter((fact) => fact.relationToFocus === relation && fact.eventType === "NOTE");
  if (dateFacts.length <= 2) return [...dateFacts, ...notes];

  const birthFirst = dateFacts
    .filter((fact) => fact.eventType === "BIRT" && fact.dateYearSpan)
    .sort((a, b) => (a.dateYearSpan![0] - b.dateYearSpan![0]));
  const deathFirst = dateFacts
    .filter((fact) => fact.eventType === "DEAT" && fact.dateYearSpan)
    .sort((a, b) => (a.dateYearSpan![0] - b.dateYearSpan![0]));
  const source = birthFirst.length > 0 ? birthFirst : deathFirst;
  if (source.length === 0) return [...dateFacts.slice(0, 2), ...notes];

  const first = source[0];
  const last = source[source.length - 1];
  const selected = first.reference === last.reference ? [first] : [first, last];
  return [...selected, ...notes];
}

function includeNotesForFact(
  fact: InternalFact,
  includeNotes: boolean,
  notesScope: AiBirthRefinementNotesScope,
  focusPersonId: string
): boolean {
  if (fact.eventType !== "NOTE") return true;
  if (!includeNotes || notesScope === "none") return false;
  if (notesScope === "focus_only") return fact.personId === focusPersonId && fact.sourceKind !== "family_note";
  return fact.personId === focusPersonId || fact.relationToFocus === "parent" || fact.relationToFocus === "child";
}

function countDateFacts(facts: InternalFact[]): number {
  return facts.filter((fact) => isDateFact(fact)).length;
}

function computeLayers(facts: InternalFact[]): Array<1 | 2 | 3> {
  const set = new Set<1 | 2 | 3>();
  for (const fact of facts) {
    set.add(fact.layer || 1);
  }
  const layers = Array.from(set.values()).sort((a, b) => a - b);
  return layers.length ? layers : [1];
}

function withBalancedRecuts(facts: InternalFact[]): InternalFact[] {
  const siblings = selectExtremesByRelation(facts, "sibling");
  const withoutSibling = facts.filter((fact) => fact.relationToFocus !== "sibling");
  return [...withoutSibling, ...siblings];
}

function withSimpleRecuts(facts: InternalFact[]): InternalFact[] {
  const children = selectExtremesByRelation(facts, "child");
  const withoutChildren = facts.filter((fact) => fact.relationToFocus !== "child");
  return [...withoutChildren, ...children];
}

function toStats(facts: InternalFact[]) {
  return {
    factsCount: facts.length,
    notesCount: facts.filter((fact) => fact.eventType === "NOTE").length,
    layer1Count: facts.filter((fact) => (fact.layer || 1) === 1).length,
    layer2Count: facts.filter((fact) => (fact.layer || 1) === 2).length,
    layer3Count: facts.filter((fact) => (fact.layer || 1) === 3).length
  };
}

export function planBirthAiContext(input: PlannerInput): PlannerOutput {
  const minimumSimpleDates = input.minimumSimpleDates ?? 3;
  const trace: string[] = [];
  const sourceFacts = collectBirthEstimationFacts(input.document, input.focusPersonId)
    .map((fact) => toAiFact(input.document, fact))
    .filter((fact) => !(fact.relationToFocus === "focus" && fact.eventType === "BIRT"));

  let facts = dedupeFacts(sourceFacts);
  facts = filterAllowedByLevel(facts, input.level);
  let maxLayer = defaultLayerCap(input.level);
  facts = withLayerCap(facts, maxLayer);
  facts = filterDatePolicy(facts, input.level);
  facts = facts.filter((fact) => includeNotesForFact(fact, input.includeNotes, input.notesScope, input.focusPersonId));

  if (input.level === "simple") {
    facts = withSimpleRecuts(facts);
    if (countDateFacts(facts) < minimumSimpleDates) {
      maxLayer = 2;
      trace.push(`simple:escala_a_capa2:min_dates=${minimumSimpleDates}`);
      facts = filterAllowedByLevel(sourceFacts, input.level);
      facts = withLayerCap(facts, maxLayer);
      facts = filterDatePolicy(facts, input.level);
      facts = facts.filter((fact) => includeNotesForFact(fact, false, "none", input.focusPersonId));
      facts = withSimpleRecuts(facts);
    }
  } else if (input.level === "balanced") {
    if (countDateFacts(facts) < 6) {
      maxLayer = 2;
      trace.push("balanced:escala_a_capa2");
      facts = filterAllowedByLevel(sourceFacts, input.level);
      facts = withLayerCap(facts, maxLayer);
      facts = filterDatePolicy(facts, input.level);
      facts = facts.filter((fact) => includeNotesForFact(fact, input.includeNotes, input.notesScope, input.focusPersonId));
    }
    facts = withBalancedRecuts(facts);
  } else {
    maxLayer = 3;
    facts = withLayerCap(facts, maxLayer);
  }

  facts = dedupeFacts(facts).sort((a, b) => a.reference.localeCompare(b.reference));
  const stats = toStats(facts);
  const layersUsed = computeLayers(facts);
  trace.push(`facts_total=${stats.factsCount}`);
  trace.push(`notes_total=${stats.notesCount}`);
  trace.push(`layers=${layersUsed.join(",")}`);
  trace.push(`notes_scope=${input.includeNotes ? input.notesScope : "none"}`);

  return {
    facts: stripInternal(facts),
    layersUsed,
    contextStats: stats,
    selectionTrace: trace
  };
}
