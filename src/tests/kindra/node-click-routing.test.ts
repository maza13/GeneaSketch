import { describe, expect, it } from "vitest";
import { resolveNodeClickRouting } from "@/core/kindra/nodeClickRouting";
import type { ActiveOverlay } from "@/types/domain";
import type { NodeInteraction } from "@/types/editor";

function personClick(id: string): NodeInteraction {
  return {
    nodeId: id,
    nodeKind: "person",
    view: "tree",
    clientX: 10,
    clientY: 20
  };
}

describe("node click routing", () => {
  it("routes pending kinship click to kinship overlay", () => {
    const decision = resolveNodeClickRouting({
      interaction: personClick("P2"),
      pendingKinshipSourceId: "P1",
      heatmapOverlay: null
    });

    expect(decision.consume).toBe(true);
    expect(decision.clearPendingKinship).toBe(true);
    expect(decision.nextOverlay?.type).toBe("kinship");
    expect(decision.nextOverlay?.config).toEqual({ person1Id: "P1", person2Id: "P2" });
  });

  it("updates heatmap target when heatmap is active", () => {
    const heatmapOverlay: ActiveOverlay = {
      id: "genetic-heatmap",
      type: "heatmap",
      priority: 80,
      config: { personId: "P1", mode: "vibrant" }
    };
    const decision = resolveNodeClickRouting({
      interaction: personClick("PM"),
      pendingKinshipSourceId: null,
      heatmapOverlay
    });

    expect(decision.consume).toBe(true);
    expect(decision.nextOverlay?.type).toBe("heatmap");
    expect(decision.nextOverlay?.config.targetId).toBe("PM");
    expect(decision.inspectPersonId).toBe("PM");
  });

  it("falls back to regular inspect/menu flow without overlays", () => {
    const decision = resolveNodeClickRouting({
      interaction: personClick("P1"),
      pendingKinshipSourceId: null,
      heatmapOverlay: null
    });

    expect(decision.consume).toBe(false);
    expect(decision.nextOverlay).toBeNull();
    expect(decision.inspectPersonId).toBe("P1");
    expect(decision.clearPendingKinship).toBe(false);
  });
});
