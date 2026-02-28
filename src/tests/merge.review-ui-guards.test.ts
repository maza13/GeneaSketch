import { describe, expect, it } from "vitest";
import { secondaryIdsFromReviewCase } from "@/ui/ImportReviewPanel";
import { getSelectedHypothesisSafe } from "@/ui/merge-review/MergeCaseDetailPane";
import type { MergeReviewCase } from "@/types/merge-review";

function baseCase(): MergeReviewCase {
  return {
    incomingId: "@X1@",
    baseId: "@B1@",
    riskLevel: "medium",
    priority: 10,
    status: "pending",
    hypothesesTopK: [],
    selectedHypothesis: 0,
    requiredActionsPlanned: [],
    requiredActionsApplied: [],
    needsTechnicalConflictReview: false,
    technicalConflictResolved: true,
    selectedCandidate: 0,
    candidates: []
  };
}

describe("merge review ui guards", () => {
  it("returns no focus secondary ids when hypothesis is missing", () => {
    expect(secondaryIdsFromReviewCase(baseCase())).toEqual([]);
  });

  it("returns null selected hypothesis when hypotheses are missing", () => {
    expect(getSelectedHypothesisSafe(baseCase())).toBeNull();
  });

  it("returns secondary ids deterministic and deduplicated", () => {
    const reviewCase = baseCase();
    reviewCase.hypothesesTopK = [
      {
        hypothesisType: "SamePerson",
        scoreFinal: 88,
        riskLevel: "medium",
        explain: {
          categoryPoints: { identity: 10, temporal: 8, geography: 4, familyNetwork: 9, documentStructure: 2 },
          subCategoryPoints: { familyParents: 2, familyUnions: 3, familyChildren: 2, familySiblings: 1, familyGrandparents: 1 },
          penalties: [],
          coverage: { comparableSignals: 5, availableSignals: 7, coverageRatio: 0.71, coveragePenalty: 5 },
          capsApplied: [],
          blockers: [],
          decisionReason: "ok",
          requiredActions: [
            { kind: "merge_person", incomingId: "@X1@", baseId: "@B2@" },
            { kind: "merge_person", incomingId: "@X1@", baseId: "@B1@" },
            { kind: "merge_person", incomingId: "@X1@", baseId: "@B2@" }
          ]
        }
      }
    ] as any;

    expect(secondaryIdsFromReviewCase(reviewCase)).toEqual(["@B1@", "@B2@"]);
  });
});
