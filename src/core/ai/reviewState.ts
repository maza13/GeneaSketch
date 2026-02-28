import type { AiReviewDraft, AiReviewItemStatus } from "@/types/ai";

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function queriesLookRelated(left?: string, right?: string): boolean {
  const a = normalizeKey(left || "");
  const b = normalizeKey(right || "");
  if (!a || !b) return false;
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

export function updateAiReviewItemStatus(
  review: AiReviewDraft,
  itemId: string,
  status: AiReviewItemStatus
): AiReviewDraft {
  return {
    ...review,
    items: review.items.map((item) => (item.id === itemId ? { ...item, status } : item))
  };
}

export function updateAiReviewItemCandidate(
  review: AiReviewDraft,
  itemId: string,
  candidateId: string
): AiReviewDraft {
  const target = review.items.find((item) => item.id === itemId);
  const matchQuery = target?.kind === "update_person" && target.action.kind === "update_person" ? target.action.matchQuery : undefined;

  return {
    ...review,
    items: review.items.map((item) => {
      // Direct update
      if (item.id === itemId) return { ...item, selectedCandidateId: candidateId };

      // Implicit update: same query or same logical person
      if (matchQuery && item.kind === "update_person" && item.action.kind === "update_person" && queriesLookRelated(item.action.matchQuery, matchQuery)) {
        return { ...item, selectedCandidateId: candidateId };
      }

      return item;
    })
  };
}

export function updateAiReviewItemSelection(
  review: AiReviewDraft,
  itemId: string,
  patch: {
    anchorPersonId?: string;
    relatedPersonId?: string;
    targetFamilyId?: string;
    createNewRelatedPerson?: boolean;
  }
): AiReviewDraft {
  const target = review.items.find((item) => item.id === itemId);
  if (!target) return review;

  const anchorQuery = target.kind === "create_relation" && target.action.kind === "create_relation" ? target.action.anchorQuery : undefined;
  const relatedQuery = target.kind === "create_relation" && target.action.kind === "create_relation" ? target.action.relatedQuery : undefined;

  return {
    ...review,
    items: review.items.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          selection: {
            ...item.selection,
            ...patch
          }
        };
      }

      // Propagate anchor resolution
      if (patch.anchorPersonId && anchorQuery && item.kind === "create_relation" && item.action.kind === "create_relation" && queriesLookRelated(item.action.anchorQuery, anchorQuery)) {
        return {
          ...item,
          selection: {
            ...item.selection,
            anchorPersonId: patch.anchorPersonId
          }
        };
      }

      // Propagate related resolution or creation decision
      const relatedUpdate = patch.relatedPersonId !== undefined || patch.createNewRelatedPerson !== undefined;
      if (relatedUpdate && relatedQuery && item.kind === "create_relation" && item.action.kind === "create_relation" && queriesLookRelated(item.action.relatedQuery, relatedQuery)) {
        return {
          ...item,
          selection: {
            ...item.selection,
            relatedPersonId: patch.relatedPersonId !== undefined ? patch.relatedPersonId : item.selection?.relatedPersonId,
            createNewRelatedPerson: patch.createNewRelatedPerson !== undefined ? patch.createNewRelatedPerson : item.selection?.createNewRelatedPerson
          }
        };
      }

      return item;
    })
  };
}

export function approveAllLowRisk(review: AiReviewDraft): AiReviewDraft {
  return {
    ...review,
    items: review.items.map((item) => (item.risk === "low" ? { ...item, status: "approved" } : item))
  };
}
