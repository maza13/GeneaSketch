import { describe, expect, it } from "vitest";
import { expandGraph } from "@/core/graph/expand";
import {
  createLayoutFixtureDoc,
  createLayoutFixtureViewConfig
} from "@/tests/layout/fixture";
import { buildOverlayPrecomputedData } from "@/views/kindra-v31/overlays/contextBuilders";
import { TREE_PALETTE } from "@/views/kindra-v31/overlays/palette";
import { resolveOverlayPipeline } from "@/views/kindra-v31/overlays/pipeline";
import { resolveOverlayUiDescriptor } from "@/views/kindra-v31/ui/overlayUiResolver";
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

describe("overlay ui resolver block A", () => {
  it("resolves lineage/origin/deepest descriptor with origin hover priority", () => {
    const overlays: ActiveOverlay[] = [
      { id: "ov-lineage", type: "lineage", priority: 10, config: { personId: "P1", mode: "patrilineal" } },
      { id: "ov-origin", type: "origin", priority: 20, config: { personId: "P1" } },
      {
        id: "ov-deepest",
        type: "deepest",
        priority: 30,
        config: {
          targetId: "P1",
          exactPath: ["P1", "PF"],
          estimatedPath: ["P1", "PM"],
          deepestPath: ["P1", "PF", "PFM"],
          exactId: "PF",
          estimatedId: "PM",
          deepestId: "PFM"
        }
      }
    ];

    const document = createLayoutFixtureDoc();
    const graph = expandGraph(document, createLayoutFixtureViewConfig());
    const precomputed = buildOverlayPrecomputedData({ overlays, document, graph });
    const resolvedVisuals = resolveOverlayPipeline({
      overlays,
      document,
      graph,
      colorTheme: COLOR_THEME,
      selectedPersonId: "P1",
      focusPersonId: "P2",
      palette: TREE_PALETTE,
      precomputed
    });

    const descriptor = resolveOverlayUiDescriptor({
      document,
      graph,
      overlays,
      hoveredNode: { id: "P1", canonId: "P1", isPerson: true, x: 10, y: 10 },
      resolvedVisuals,
      precomputed,
      palette: TREE_PALETTE
    });

    expect(descriptor.kinshipBadge?.type).toBe("lineage");
    expect(descriptor.hasFamilyOriginHighlight).toBe(true);
    expect(descriptor.hasDeepestHighlight).toBe(true);
    expect(descriptor.showLegend).toBe(true);
    expect(descriptor.hoverMode).toBe("origin");
  });

  it("uses deepest hover mode when deepest is active without origin", () => {
    const overlays: ActiveOverlay[] = [
      {
        id: "ov-deepest",
        type: "deepest",
        priority: 30,
        config: {
          targetId: "P1",
          exactPath: ["P1", "PF"],
          estimatedPath: ["P1", "PM"],
          deepestPath: ["P1", "PF", "PFM"],
          exactId: "PF",
          estimatedId: "PM",
          deepestId: "PFM"
        }
      }
    ];

    const document = createLayoutFixtureDoc();
    const graph = expandGraph(document, createLayoutFixtureViewConfig());
    const precomputed = buildOverlayPrecomputedData({ overlays, document, graph });
    const resolvedVisuals = resolveOverlayPipeline({
      overlays,
      document,
      graph,
      colorTheme: COLOR_THEME,
      selectedPersonId: "P1",
      focusPersonId: "P2",
      palette: TREE_PALETTE,
      precomputed
    });

    const descriptor = resolveOverlayUiDescriptor({
      document,
      graph,
      overlays,
      hoveredNode: { id: "PF", canonId: "PF", isPerson: true, x: 12, y: 22 },
      resolvedVisuals,
      precomputed,
      palette: TREE_PALETTE
    });

    expect(descriptor.hasDeepestHighlight).toBe(true);
    expect(descriptor.hoverMode).toBe("deepest");
  });
});
