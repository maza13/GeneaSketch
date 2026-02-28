import { describe, expect, it } from "vitest";
import { applyApprovedAiReview } from "@/core/ai/apply";
import { addRelation, updatePerson } from "@/core/edit/commands";
import type { AiReviewDraft } from "@/types/ai";
import type { GeneaDocument } from "@/types/domain";

function buildDoc(): GeneaDocument {
  const base = updatePerson(
    {
      persons: {
        "@I1@": { id: "@I1@", name: "(Sin nombre)", sex: "U", lifeStatus: "alive", isPlaceholder: true, events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
      },
      families: {},
      media: {},
      metadata: { sourceFormat: "GSZ", gedVersion: "7.0.x" }
    },
    "@I1@",
    { name: "A Mendoza", isPlaceholder: false }
  );
  return addRelation(base, "@I1@", "child", { name: "Juan Abel", surname: "Nunez Saucedo", sex: "M", birthDate: "1971" }).next;
}

function draft(): AiReviewDraft {
  return {
    runId: "airun-test",
    context: { kind: "global" },
    executionMode: "hybrid",
    informantName: "A Mendoza",
    extraction: null,
    resolution: null,
    items: [
      {
        id: "ai-item-1",
        kind: "delete_person",
        title: "Delete",
        description: "delete",
        risk: "high",
        status: "approved",
        issues: [],
        action: { kind: "delete_person", matchQuery: "Juan Abel Nunez Saucedo", reason: "duplicate" },
        candidates: [{ id: "@I2@", label: "Juan Abel Nunez Saucedo", score: 0.99, reason: "exact" }],
        selectedCandidateId: "@I2@",
        requiresDeleteConfirmation: true
      }
    ],
    warnings: [],
    deterministicProfile: "det_v1",
    deterministicWarnings: [],
    providerTrace: [],
    createdAt: new Date().toISOString()
  };
}

describe("ai apply soft delete", () => {
  it("moves deleted person to recycle bin and appends ai audit", () => {
    const base = buildDoc();
    const result = applyApprovedAiReview(base, draft());
    expect(result.nextDoc.persons["@I2@"]).toBeUndefined();
    expect(result.nextDoc.metadata.recycleBin?.length).toBe(1);
    expect(result.nextDoc.metadata.recycleBin?.[0].entityType).toBe("person");
    expect(result.nextDoc.metadata.aiAuditTrail?.length).toBe(1);
    expect(result.nextDoc.metadata.aiAuditTrail?.[0].informantName).toBe("A Mendoza");
  });
});


