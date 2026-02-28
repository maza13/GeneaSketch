import { describe, expect, it } from "vitest";
import { applyApprovedAiReview } from "@/core/ai/apply";
import type { AiReviewDraft } from "@/types/ai";
import type { GeneaDocument } from "@/types/domain";

function baseDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": {
        id: "@I1@",
        name: "Juan Jesus",
        surname: "Nunez Mendoza",
        sex: "M",
        lifeStatus: "alive",
        events: [],
        famc: [],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      }
    },
    families: {},
    media: {},
    metadata: { sourceFormat: "GSZ", gedVersion: "7.0.x" }
  };
}

function reviewDraft(): AiReviewDraft {
  return {
    runId: "airun-apply-dependencies",
    context: { kind: "global" },
    executionMode: "hybrid",
    informantName: "test",
    extraction: null,
    resolution: null,
    items: [
      {
        id: "ai-item-1",
        kind: "create_person",
        title: "Crear persona",
        description: "Crear Johana Torres",
        risk: "low",
        status: "approved",
        issues: [],
        action: {
          kind: "create_person",
          person: { name: "Johana", surname: "Torres", sex: "F" }
        },
        candidates: [],
        requiresDeleteConfirmation: false
      },
      {
        id: "ai-item-2",
        kind: "create_relation",
        title: "Crear relacion",
        description: "Vincular Juan con Johana",
        risk: "medium",
        status: "approved",
        issues: [],
        action: {
          kind: "create_relation",
          relationType: "spouse",
          anchorPersonId: "@I1@",
          relatedQuery: "Johana Torres",
          createRelatedIfMissing: false
        },
        candidates: [],
        requiresDeleteConfirmation: false
      }
    ],
    warnings: [],
    deterministicProfile: "det_v1",
    deterministicWarnings: [],
    providerTrace: [],
    createdAt: new Date().toISOString()
  };
}

describe("ai apply dependencies", () => {
  it("resolves relation endpoints from people created earlier in same batch", () => {
    const result = applyApprovedAiReview(baseDoc(), reviewDraft());
    const createdId = Object.keys(result.nextDoc.persons).find((id) => id !== "@I1@");
    expect(createdId).toBeDefined();
    const relationApplied = result.appliedChanges.find(
      (change) => change.operation === "create_relation" && change.status === "applied"
    );
    expect(relationApplied).toBeTruthy();
    const family = Object.values(result.nextDoc.families)[0];
    expect(family).toBeDefined();
    expect([family.husbandId, family.wifeId]).toContain("@I1@");
    expect([family.husbandId, family.wifeId]).toContain(createdId!);
  });
});
