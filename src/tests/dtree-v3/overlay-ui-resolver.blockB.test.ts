import { describe, expect, it } from "vitest";
import { expandGraph } from "@/core/graph/expand";
import {
  createLayoutFixtureDoc,
  createLayoutFixtureViewConfig
} from "@/tests/layout/fixture";
import { buildOverlayPrecomputedData } from "@/views/dtree-v3/overlays/contextBuilders";
import { TREE_PALETTE } from "@/views/dtree-v3/overlays/palette";
import { resolveOverlayPipeline } from "@/views/dtree-v3/overlays/pipeline";
import { resolveOverlayUiDescriptor } from "@/views/dtree-v3/ui/overlayUiResolver";
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

describe("overlay ui resolver block B", () => {
  it("prioritizes layer hover mode for all layer ids", () => {
    const layerIds = ["layer-symmetry", "layer-places", "layer-warnings", "layer-endogamy"];
    const document = createLayoutFixtureDoc();
    const graph = expandGraph(document, createLayoutFixtureViewConfig());

    for (const layerId of layerIds) {
      const overlays: ActiveOverlay[] = [
        {
          id: `ov-${layerId}`,
          type: "layer",
          priority: 50,
          config: { layerId }
        }
      ];
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

      expect(descriptor.activeLayerOverlay?.config.layerId).toBe(layerId);
      expect(descriptor.hoverMode).toBe("layer");
      expect(descriptor.showLegend).toBe(true);
    }
  });
});
