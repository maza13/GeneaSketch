import { rankPersonCandidates, resolvePersonMatch } from "@/core/ai/matching";
import type { AiPersonInput, AiResolvedAction, AiReviewCandidate } from "@/types/ai";
import type { GraphDocument } from "@/types/domain";

export type SafetyAnnotation = {
  blocked?: boolean;
  blockReason?: string;
  issues?: string[];
  candidateGroups?: {
    anchor: AiReviewCandidate[];
    related: AiReviewCandidate[];
    families: Array<{ id: string; label: string }>;
  };
  selection?: {
    anchorPersonId?: string;
    relatedPersonId?: string;
    targetFamilyId?: string;
    createNewRelatedPerson?: boolean;
  };
};

type SafetyResult = {
  actions: AiResolvedAction[];
  warnings: string[];
  annotations: Record<number, SafetyAnnotation>;
};

function personQueryFromInput(input: { name: string; surname?: string }): string {
  return `${input.name}${input.surname ? ` ${input.surname}` : ""}`.trim();
}

function toUpdatePatch(input: AiPersonInput) {
  return {
    name: input.name,
    surname: input.surname,
    sex: input.sex,
    birthDate: input.birthDate,
    birthPlace: input.birthPlace,
    deathDate: input.deathDate,
    deathPlace: input.deathPlace,
    residence: input.residence,
    lifeStatus: input.lifeStatus
  };
}

function block(annotations: Record<number, SafetyAnnotation>, index: number, reason: string): void {
  const current = annotations[index] || {};
  annotations[index] = {
    ...current,
    blocked: true,
    blockReason: reason,
    issues: [...(current.issues || []), reason]
  };
}

function toReviewCandidates(doc: GraphDocument, query?: string, explicitId?: string): AiReviewCandidate[] {
  if (explicitId && doc.persons[explicitId]) {
    const person = doc.persons[explicitId];
    const label = `${person.name}${person.surname ? ` ${person.surname}` : ""} (${person.id})`;
    return [{ id: explicitId, label, score: 1, reason: "ID explicito" }];
  }
  if (!query) return [];
  return rankPersonCandidates(doc, query, 6).map((candidate) => ({
    id: candidate.id,
    label: candidate.label,
    score: candidate.score,
    reason: candidate.reason
  }));
}

function familyChoices(doc: GraphDocument, anchorId?: string): Array<{ id: string; label: string }> {
  if (!anchorId || !doc.persons[anchorId]) return [];
  return doc.persons[anchorId].fams
    .filter((familyId) => Boolean(doc.families[familyId]))
    .map((familyId) => {
      const family = doc.families[familyId];
      const husband = family.husbandId ? doc.persons[family.husbandId] : undefined;
      const wife = family.wifeId ? doc.persons[family.wifeId] : undefined;
      const left = husband ? `${husband.name}${husband.surname ? ` ${husband.surname}` : ""}` : "?";
      const right = wife ? `${wife.name}${wife.surname ? ` ${wife.surname}` : ""}` : "?";
      return { id: familyId, label: `${familyId}: ${left} <-> ${right}` };
    });
}

function anchorNetworkCandidateIds(doc: GraphDocument, anchorId?: string): string[] {
  if (!anchorId || !doc.persons[anchorId]) return [];
  const ids = new Set<string>([anchorId]);
  const anchor = doc.persons[anchorId];
  for (const familyId of [...anchor.fams, ...anchor.famc]) {
    const family = doc.families[familyId];
    if (!family) continue;
    if (family.husbandId) ids.add(family.husbandId);
    if (family.wifeId) ids.add(family.wifeId);
    for (const childId of family.childrenIds) ids.add(childId);
  }
  for (const personId of Array.from(ids)) {
    const person = doc.persons[personId];
    if (!person) continue;
    for (const familyId of [...person.fams, ...person.famc]) {
      const family = doc.families[familyId];
      if (!family) continue;
      if (family.husbandId) ids.add(family.husbandId);
      if (family.wifeId) ids.add(family.wifeId);
      for (const childId of family.childrenIds) ids.add(childId);
    }
  }
  return Array.from(ids);
}

export function normalizeActionsWithSafety(doc: GraphDocument, actions: AiResolvedAction[]): SafetyResult {
  const normalized: AiResolvedAction[] = [];
  const warnings: string[] = [];
  const annotations: Record<number, SafetyAnnotation> = {};

  actions.forEach((action, index) => {
    if (action.kind === "create_person") {
      const query = personQueryFromInput(action.person);
      const match = resolvePersonMatch(doc, undefined, query, {
        surname: action.person.surname,
        sex: action.person.sex,
        birthDate: action.person.birthDate,
        deathDate: action.person.deathDate
      });
      if (match.level === "strong_match" && match.id) {
        warnings.push(`Sugerencia: "${query}" parece coincidir con una persona existente.`);
        normalized.push({
          kind: "update_person",
          personId: match.id,
          patch: toUpdatePatch(action.person),
          normalizedPlaces: action.person.normalizedPlaces
        });
        return;
      }
      if (match.level === "ambiguous_match") {
        block(annotations, index, `create_person ambiguo para "${query}". Requiere selecciÃ³n manual.`);
      }
      normalized.push(action);
      return;
    }

    if (action.kind === "create_relation") {
      const nextAction: AiResolvedAction = { ...action };
      const anchorCandidates = toReviewCandidates(doc, action.anchorQuery, action.anchorPersonId);
      const relatedCandidates = toReviewCandidates(doc, action.relatedQuery, action.relatedPersonId);
      const anchorMatch = resolvePersonMatch(doc, action.anchorPersonId, action.anchorQuery);
      if (!anchorMatch.id) {
        block(annotations, index, "create_relation sin ancla univoca.");
      } else {
        nextAction.anchorPersonId = anchorMatch.id;
        nextAction.anchorQuery = undefined;
      }

      if (action.relatedPersonId || action.relatedQuery) {
        const localCandidates = anchorNetworkCandidateIds(doc, nextAction.anchorPersonId);
        let relatedMatch = resolvePersonMatch(doc, action.relatedPersonId, action.relatedQuery, {
          surname: action.relatedPerson?.surname,
          sex: action.relatedPerson?.sex,
          birthDate: action.relatedPerson?.birthDate,
          deathDate: action.relatedPerson?.deathDate,
          candidateIds: localCandidates
        });
        if (!relatedMatch.id && relatedMatch.level !== "strong_match") {
          relatedMatch = resolvePersonMatch(doc, action.relatedPersonId, action.relatedQuery, {
            surname: action.relatedPerson?.surname,
            sex: action.relatedPerson?.sex,
            birthDate: action.relatedPerson?.birthDate,
            deathDate: action.relatedPerson?.deathDate
          });
        }
        if (relatedMatch.id) {
          nextAction.relatedPersonId = relatedMatch.id;
          nextAction.relatedQuery = undefined;
          nextAction.createRelatedIfMissing = false;
          nextAction.relatedPerson = undefined;
        } else if (relatedMatch.level === "ambiguous_match") {
          block(annotations, index, "create_relation con persona relacionada ambigua.");
        }
      }

      if (!nextAction.relatedPersonId && !nextAction.createRelatedIfMissing) {
        block(annotations, index, "create_relation sin persona relacionada univoca.");
      }

      const families = familyChoices(doc, nextAction.anchorPersonId);
      if (nextAction.relationType === "child" && !nextAction.targetFamilyId) {
        if (families.length !== 1) {
          block(
            annotations,
            index,
            "create_relation(child) requiere familia objetivo univoca; no se puede elegir 'primera familia' por defecto."
          );
        } else {
          nextAction.targetFamilyId = families[0].id;
        }
      }

      if (annotations[index]?.blocked) {
        annotations[index] = {
          ...(annotations[index] || {}),
          candidateGroups: {
            anchor: anchorCandidates,
            related: relatedCandidates,
            families
          },
          selection: {
            anchorPersonId: nextAction.anchorPersonId || anchorCandidates[0]?.id,
            relatedPersonId: nextAction.relatedPersonId || relatedCandidates[0]?.id,
            targetFamilyId: nextAction.targetFamilyId || families[0]?.id,
            createNewRelatedPerson: Boolean(nextAction.createRelatedIfMissing)
          }
        };
      }

      normalized.push(nextAction);
      return;
    }

    normalized.push(action);
  });

  return { actions: normalized, warnings, annotations };
}

