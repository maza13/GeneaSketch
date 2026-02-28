import { describe, expect, it } from "vitest";
import { applyApprovedAiReview } from "@/core/ai/apply";
import type { AiReviewDraft } from "@/types/ai";
import type { GeneaDocument } from "@/types/domain";

function doc(): GeneaDocument {
  return {
    persons: {
      "@I1@": { id: "@I1@", name: "Juan", surname: "Nunez", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
      "@I2@": { id: "@I2@", name: "Johana", surname: "Torres", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
      "@I3@": { id: "@I3@", name: "Leonarda", surname: "Torres", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
    },
    families: {
      "@F1@": { id: "@F1@", husbandId: "@I1@", wifeId: "@I2@", childrenIds: [], events: [] }
    },
    media: {},
    metadata: { sourceFormat: "GSZ", gedVersion: "7.0.x" }
  };
}

function draft(): AiReviewDraft {
  return {
    runId: "airun-apply-selection",
    context: { kind: "global" },
    executionMode: "hybrid",
    informantName: "test",
    extraction: null,
    resolution: null,
    items: [
      {
        id: "ai-item-1",
        kind: "create_relation",
        title: "Crear relaciï¿½n",
        description: "Vincular pareja",
        risk: "high",
        status: "approved",
        issues: [],
        action: {
          kind: "create_relation",
          relationType: "spouse",
          anchorQuery: "Juan",
          relatedQuery: "Torres",
          createRelatedIfMissing: false
        },
        candidates: [],
        requiresDeleteConfirmation: false,
        blocked: true,
        blockReason: "ambigua",
        selection: {
          anchorPersonId: "@I1@",
          relatedPersonId: "@I2@"
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

describe("ai apply selection", () => {
  it("uses wizard selection to resolve blocked relation", () => {
    const result = applyApprovedAiReview(doc(), draft());
    expect(result.appliedChanges.some((change) => change.status === "applied" && change.operation === "create_relation")).toBe(true);
    expect(result.warnings.length).toBe(0);
  });
});

