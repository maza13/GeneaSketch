import { describe, expect, it } from "vitest";
import { applyApprovedAiReview } from "@/core/ai/apply";
import type { AiReviewDraft } from "@/types/ai";
import type { GeneaDocument } from "@/types/domain";

function baseDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": { id: "@I1@", name: "Juan Jesus", surname: "Nunez Mendoza", sex: "M", lifeStatus: "alive", events: [{ type: "BIRT", date: "1990" }], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
      "@I2@": { id: "@I2@", name: "Johana", surname: "Torres Perez", sex: "F", lifeStatus: "alive", events: [{ type: "BIRT", date: "1992" }], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] }
    },
    families: {
      "@F1@": { id: "@F1@", husbandId: "@I1@", wifeId: "@I2@", childrenIds: [], events: [] }
    },
    media: {},
    metadata: { sourceFormat: "GSK", gedVersion: "7.0.x" }
  };
}

function reviewDraft(): AiReviewDraft {
  return {
    runId: "airun-selection",
    context: { kind: "global" },
    executionMode: "hybrid",
    informantName: "Test",
    extraction: null,
    resolution: null,
    items: [
      {
        id: "ai-item-1",
        kind: "create_relation",
        title: "Crear relaciï¿½n",
        description: "Crear hijo",
        risk: "high",
        status: "approved",
        issues: [],
        action: {
          kind: "create_relation",
          relationType: "child",
          anchorQuery: "Juan",
          createRelatedIfMissing: true,
          relatedPerson: { name: "Josa", sex: "M" }
        },
        candidates: [],
        requiresDeleteConfirmation: false,
        blocked: true,
        blockReason: "ambiguous",
        selection: {
          anchorPersonId: "@I1@",
          targetFamilyId: "@F1@",
          createNewRelatedPerson: true
        }
      }
    ],
    warnings: [],
    deterministicProfile: "det_v1",
    deterministicWarnings: [],
    providerTrace: [],
    createdAt: new Date().toISOString()
  };
}

describe("ai surname inference", () => {
  it("infers mexican compound surnames for a new child", () => {
    const result = applyApprovedAiReview(baseDoc(), reviewDraft());
    const createdId = Object.keys(result.nextDoc.persons).find((id) => !["@I1@", "@I2@"].includes(id));
    expect(createdId).toBeDefined();
    const created = result.nextDoc.persons[createdId!];
    expect(created.surname).toBe("Nunez Torres");
    expect(result.nextDoc.families["@F1@"].childrenIds.includes(createdId!)).toBe(true);
  });
});


