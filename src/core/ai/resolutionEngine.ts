import { resolvePersonMatch } from "@/core/ai/matching";
import type {
  AiExtractionV4,
  AiExtractionV4PersonRole,
  AiInputContext,
  AiResolvedAction,
  AiResolutionV2
} from "@/types/ai";
import type { GraphDocument } from "@/types/domain";

type MentionRef = {
  tempId: string;
  name: string;
  surname?: string;
  role: AiExtractionV4PersonRole;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitName(fullName: string): { name: string; surname?: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { name: parts[0] || fullName.trim() };
  if (parts.length === 2) return { name: parts[0], surname: parts[1] };
  return { name: parts.slice(0, 2).join(" "), surname: parts.slice(2).join(" ") };
}

function safeTempId(value: string, index: number): string {
  const normalized = (value || "").trim();
  if (!normalized) return `P${index + 1}`;
  return normalized;
}

function fullName(name: string, surname?: string): string {
  return `${name}${surname ? ` ${surname}` : ""}`.trim();
}

function extractionToMentionMap(extraction: AiExtractionV4): Map<string, MentionRef> {
  const map = new Map<string, MentionRef>();
  for (let i = 0; i < extraction.persons.length; i += 1) {
    const p = extraction.persons[i];
    const tempId = safeTempId(p.tempId, i);
    map.set(tempId, {
      tempId,
      name: p.name,
      surname: p.surname,
      role: p.role
    });
  }
  if (!map.has("ANCHOR")) {
    const focus = splitName(extraction.focus.name || "Persona foco");
    map.set("ANCHOR", {
      tempId: "ANCHOR",
      name: focus.name || "Persona",
      surname: focus.surname,
      role: "focus"
    });
  }
  return map;
}

function relationToPendingType(type: "spouse" | "parent" | "child" | "sibling"): "spouse" | "child" | "father" | "sibling" {
  if (type === "spouse") return "spouse";
  if (type === "parent") return "father";
  if (type === "sibling") return "sibling";
  return "child";
}

function personQueryFromMention(ref: MentionRef): string {
  return fullName(ref.name, ref.surname);
}

function buildCreatePersonAction(ref: MentionRef): AiResolvedAction {
  return {
    kind: "create_person",
    preferredId: ref.tempId,
    person: {
      name: ref.name,
      surname: ref.surname
    }
  };
}

function bestPersonIdForMention(
  doc: GraphDocument,
  context: AiInputContext,
  mention: MentionRef,
  hints?: { eventYear?: number; relationToAnchor?: "parent" | "child" | "spouse" | "sibling" }
): { personId?: string; level: "strong_match" | "ambiguous_match" | "no_match"; query: string } {
  if (context.kind === "local" && mention.tempId === "ANCHOR") {
    return { personId: context.anchorPersonId, level: "strong_match", query: personQueryFromMention(mention) };
  }
  const query = personQueryFromMention(mention);
  const match = resolvePersonMatch(doc, undefined, query, {
    surname: mention.surname,
    relationToAnchor: hints?.relationToAnchor,
    eventYear: hints?.eventYear
  });

  if (match.level === "strong_match" && match.id) {
    return { personId: match.id, level: match.level, query };
  }
  if (match.level === "ambiguous_match") {
    return { personId: match.candidates[0]?.id, level: match.level, query };
  }
  return { level: "no_match", query };
}

function ensureMentionExists(
  actions: AiResolvedAction[],
  createdByTempId: Set<string>,
  mention: MentionRef,
  personId?: string
): { id?: string; query?: string; requiresDecision: boolean } {
  if (personId) return { id: personId, query: personQueryFromMention(mention), requiresDecision: false };
  if (!createdByTempId.has(mention.tempId)) {
    actions.push(buildCreatePersonAction(mention));
    createdByTempId.add(mention.tempId);
  }
  return { query: personQueryFromMention(mention), requiresDecision: false };
}

function applyPersonFacts(
  extraction: AiExtractionV4,
  mentions: Map<string, MentionRef>,
  mentionResolution: Map<string, { id?: string; query: string; level: "strong_match" | "ambiguous_match" | "no_match" }>,
  actions: AiResolvedAction[]
): void {
  const patchByPerson = new Map<string, Partial<AiResolvedAction & { patch: Record<string, string> }>>();

  for (const fact of extraction.personFacts || []) {
    const mention = mentions.get(fact.person);
    if (!mention) continue;
    const resolved = mentionResolution.get(mention.tempId);
    const targetKey = resolved?.id || resolved?.query || personQueryFromMention(mention);
    if (!targetKey) continue;

    const current = (patchByPerson.get(targetKey) as { patch: Record<string, string>; personId?: string; query?: string } | undefined) || {
      patch: {},
      personId: resolved?.id,
      query: resolved?.query || personQueryFromMention(mention)
    };

    if (fact.type === "BIRT") {
      if (fact.date) current.patch.birthDate = fact.date;
      if (fact.place) current.patch.birthPlace = fact.place;
    }
    if (fact.type === "DEAT") {
      if (fact.date) current.patch.deathDate = fact.date;
      if (fact.place) current.patch.deathPlace = fact.place;
    }
    if (fact.type === "RESI") {
      if (fact.place) current.patch.residence = fact.place;
      if (fact.value && !current.patch.residence) current.patch.residence = fact.value;
    }

    patchByPerson.set(targetKey, current as any);
  }

  for (const item of patchByPerson.values()) {
    const patch = (item as any).patch as Record<string, string>;
    if (Object.keys(patch).length === 0) continue;
    actions.push({
      kind: "update_person",
      personId: (item as any).personId,
      matchQuery: (item as any).query,
      patch
    });
  }
}

function addRelationAction(
  actions: AiResolvedAction[],
  left: { id?: string; query?: string },
  right: { id?: string; query?: string },
  relationType: "parent" | "child" | "spouse" | "sibling"
): void {
  actions.push({
    kind: "create_relation",
    anchorPersonId: left.id,
    anchorQuery: left.query,
    relatedPersonId: right.id,
    relatedQuery: right.query,
    relationType: relationToPendingType(relationType),
    createRelatedIfMissing: true
  });
}

function buildFamilyUpdates(
  extraction: AiExtractionV4,
  mentionResolution: Map<string, { id?: string; query: string }>,
  actions: AiResolvedAction[]
): void {
  for (const fact of extraction.familyFacts || []) {
    const [leftTemp, rightTemp] = fact.spouses || [];
    if (!leftTemp || !rightTemp) continue;
    const left = mentionResolution.get(leftTemp);
    const right = mentionResolution.get(rightTemp);

    actions.push({
      kind: "create_relation",
      anchorPersonId: left?.id,
      anchorQuery: left?.query,
      relatedPersonId: right?.id,
      relatedQuery: right?.query,
      relationType: "spouse",
      createRelatedIfMissing: true
    });

    if (fact.date || fact.place || fact.type === "DIV") {
      actions.push({
        kind: "update_family",
        familyQuery: `${left?.query || leftTemp} <-> ${right?.query || rightTemp}`,
        patch: {
          events: [
            {
              type: fact.type,
              date: fact.date,
              place: fact.place
            }
          ]
        }
      });
    }
  }
}

function actionSortRank(action: AiResolvedAction): number {
  if (action.kind === "create_person") return 0;
  if (action.kind === "create_relation") return 1;
  if (action.kind === "update_family") return 2;
  if (action.kind === "update_person") return 3;
  if (action.kind === "delete_person" || action.kind === "delete_relation" || action.kind === "delete_family") return 4;
  return 5;
}

function sortActionsDeterministically(actions: AiResolvedAction[]): AiResolvedAction[] {
  return [...actions].sort((a, b) => {
    const rank = actionSortRank(a) - actionSortRank(b);
    if (rank !== 0) return rank;
    return JSON.stringify(a).localeCompare(JSON.stringify(b));
  });
}

export function heuristicExtractionFromText(text: string, context: AiInputContext): AiExtractionV4 {
  const normalized = normalizeKey(text);
  const focusName = context.kind === "local" ? context.anchorLabel || context.anchorPersonId : "Persona foco";
  const persons: AiExtractionV4["persons"] = [{
    tempId: "ANCHOR",
    ...splitName(focusName),
    role: "focus",
    confidence: 0.95
  }];
  const relations: AiExtractionV4["relations"] = [];
  const familyFacts: AiExtractionV4["familyFacts"] = [];

  const year = (text.match(/\b(19|20)\d{2}\b/) || [])[0];
  const spouseRegex = /\bcon\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,3})/iu;
  const spouseMatch = text.match(spouseRegex);

  if (/\bse\s+cas[ooó]\b/i.test(normalized) || /\bcasad[oa]\b/i.test(normalized)) {
    if (spouseMatch?.[1]) {
      const parsed = splitName(spouseMatch[1]);
      persons.push({ tempId: "P2", name: parsed.name, surname: parsed.surname, role: "spouse", confidence: 0.72 });
      relations.push({ type: "spouse", from: "ANCHOR", to: "P2", confidence: 0.72 });
      familyFacts.push({ type: "MARR", date: year, spouses: ["ANCHOR", "P2"], confidence: 0.72 });
    }
  }

  return {
    focus: {
      name: focusName,
      idHint: "ANCHOR",
      confidence: context.kind === "local" ? 1 : 0.5
    },
    persons,
    familyFacts,
    personFacts: [],
    relations,
    rawText: text,
    confidence: 0.4,
    assumptions: ["Extraccion local heuristica aplicada por respuesta IA insuficiente."],
    userMessage: "Se aplico una extraccion heuristica local por respuesta IA insuficiente."
  };
}

export function resolveExtractionToResolution(
  doc: GraphDocument,
  extraction: AiExtractionV4,
  context: AiInputContext,
  extractionConsistencyIssues: string[]
): AiResolutionV2 {
  const mentions = extractionToMentionMap(extraction);
  const actions: AiResolvedAction[] = [];
  const mentionResolution = new Map<string, { id?: string; query: string; level: "strong_match" | "ambiguous_match" | "no_match" }>();
  const createdByTempId = new Set<string>();

  for (const mention of mentions.values()) {
    const relHint = mention.role === "focus" ? undefined : mention.role;
    const match = bestPersonIdForMention(doc, context, mention, {
      relationToAnchor: relHint as any,
      eventYear: undefined
    });
    mentionResolution.set(mention.tempId, {
      id: match.personId,
      query: match.query,
      level: match.level
    });

    if (mention.role === "focus") continue;
    if (!match.personId) {
      const ensured = ensureMentionExists(actions, createdByTempId, mention);
      mentionResolution.set(mention.tempId, {
        id: ensured.id,
        query: ensured.query || match.query,
        level: "no_match"
      });
    }
  }

  for (const relation of extraction.relations || []) {
    const leftMention = mentions.get(relation.from);
    const rightMention = mentions.get(relation.to);
    if (!leftMention || !rightMention) continue;

    const leftRes = mentionResolution.get(leftMention.tempId);
    const rightRes = mentionResolution.get(rightMention.tempId);
    if (!leftRes || !rightRes) continue;

    addRelationAction(
      actions,
      { id: leftRes.id, query: leftRes.query },
      { id: rightRes.id, query: rightRes.query },
      relation.type
    );
  }

  buildFamilyUpdates(extraction, mentionResolution as any, actions);
  applyPersonFacts(extraction, mentions, mentionResolution, actions);

  const dedup = new Set<string>();
  const uniqueActions: AiResolvedAction[] = [];
  for (const action of actions) {
    const key = JSON.stringify(action);
    if (dedup.has(key)) continue;
    dedup.add(key);
    uniqueActions.push(action);
  }

  const extractionScore = clamp01(extraction.confidence || 0.5);
  const matchingSignals = Array.from(mentionResolution.values()).map((item) => {
    if (item.level === "strong_match") return 1;
    if (item.level === "ambiguous_match") return 0.78;
    return 0.55;
  });
  const matching = matchingSignals.length
    ? clamp01(matchingSignals.reduce((acc, v) => acc + v, 0) / matchingSignals.length)
    : 0.8;
  const ruleConsistency = clamp01(1 - extractionConsistencyIssues.length * 0.22);
  const confidence = clamp01(extractionScore * 0.45 + matching * 0.35 + ruleConsistency * 0.2);

  return {
    informantName: "No identificado",
    confidence,
    resolutionSource: "code_engine_v5",
    confidenceBreakdown: {
      extraction: extractionScore,
      matching,
      ruleConsistency
    },
    notes: [
      "Resolucion local determinista por fases A-F.",
      ...extractionConsistencyIssues.map((issue) => `consistency:${issue}`)
    ],
    actions: sortActionsDeterministically(uniqueActions),
    userMessage: extraction.userMessage || "Extraccion procesada por motor determinista local."
  };
}


