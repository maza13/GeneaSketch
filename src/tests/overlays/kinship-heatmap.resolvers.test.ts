import { describe, expect, it } from "vitest";
import { expandGraph } from "@/core/graph/expand";
import {
  createLayoutFixtureDoc,
  createLayoutFixtureViewConfig
} from "@/tests/layout/fixture";
import { buildOverlayPrecomputedData } from "@/views/kindra-v31/overlays/contextBuilders";
import { TREE_PALETTE } from "@/views/kindra-v31/overlays/palette";
import { resolveOverlayPipeline } from "@/views/kindra-v31/overlays/pipeline";
import type { ActiveOverlay } from "@/types/domain";
import type { ColorThemeConfig } from "@/types/editor";

const COLOR_THEME: ColorThemeConfig = {
  background: "#0f172a",
  personNode: "#1e293b",
  text: "#e2e8f0",
  edges: "#64748b",
  nodeFontSize: 14,
  edgeThickness: 1.5,
  nodeWidth: 210,
  nodeHeight: 100
};

function resolve(overlays: ActiveOverlay[]) {
  const document = createLayoutFixtureDoc();
  const graph = expandGraph(document, createLayoutFixtureViewConfig());
  const precomputed = buildOverlayPrecomputedData({
    overlays,
    document,
    graph
  });
  return resolveOverlayPipeline({
    overlays,
    document,
    graph,
    colorTheme: COLOR_THEME,
    selectedPersonId: "P1",
    focusPersonId: "P2",
    palette: TREE_PALETTE,
    precomputed
  });
}

describe("kinship and heatmap resolvers", () => {
  it("returns warning no-op for invalid ids", () => {
    const overlays: ActiveOverlay[] = [
      {
        id: "invalid-kinship",
        type: "kinship",
        priority: 10,
        config: { person1Id: "P1", person2Id: "UNKNOWN" }
      }
    ];
    const resolved = resolve(overlays);
    expect(resolved.activeBadges.length).toBe(0);
    expect(resolved.warnings.length).toBeGreaterThan(0);
    expect(resolved.warnings[0]).toContain("ignored");
  });

  it("keeps kinship badge output for heatmap target", () => {
    const overlays: ActiveOverlay[] = [
      {
        id: "heatmap",
        type: "heatmap",
        priority: 10,
        config: { personId: "P1", targetId: "PM", mode: "vibrant" }
      }
    ];
    const resolved = resolve(overlays);
    expect(resolved.activeBadges.some((badge) => badge.type === "kinship")).toBe(true);
    expect(resolved.perfMeta).toHaveLength(1);
    expect(resolved.warnings).toEqual([]);
  });
});
