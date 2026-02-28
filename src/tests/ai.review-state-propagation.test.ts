import { describe, expect, it } from "vitest";
import { updateAiReviewItemSelection } from "@/core/ai/reviewState";
import type { AiReviewDraft } from "@/types/ai";

function draft(): AiReviewDraft {
  return {
    runId: "airun-propagation",
    context: { kind: "global" },
    executionMode: "hybrid",
    informantName: "test",
    extraction: null,
    resolution: null,
    items: [
      {
        id: "ai-item-1",
        kind: "create_relation",
        title: "R1",
        description: "",
        risk: "high",
        status: "proposed",
        issues: [],
        action: {
          kind: "create_relation",
          relationType: "spouse",
          anchorQuery: "Juan Jesus",
          relatedQuery: "Johana Torres"
        },
        candidates: [],
        candidateGroups: { anchor: [], related: [], families: [] },
        selection: {},
        requiresDeleteConfirmation: false
      },
      {
        id: "ai-item-2",
        kind: "create_relation",
        title: "R2",
        description: "",
        risk: "high",
        status: "proposed",
        issues: [],
        action: {
          kind: "create_relation",
          relationType: "child",
          anchorQuery: "Juan",
          relatedQuery: "Josa"
        },
        candidates: [],
        candidateGroups: { anchor: [], related: [], families: [] },
        selection: {},
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

describe("ai review state propagation", () => {
  it("propagates selected anchor across related relation actions", () => {
    const updated = updateAiReviewItemSelection(draft(), "ai-item-1", { anchorPersonId: "@I99@" });
    expect(updated.items[0].selection?.anchorPersonId).toBe("@I99@");
    expect(updated.items[1].selection?.anchorPersonId).toBe("@I99@");
  });
});

