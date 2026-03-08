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

describe("overlay ui resolver block C", () => {
  it("keeps timeline badge active with merge_focus without hover conflicts", () => {
    const overlays: ActiveOverlay[] = [
      {
        id: "ov-timeline",
        type: "timeline",
        priority: 100,
        config: {
          year: 1999,
          livingIds: ["P1", "P2"],
          deceasedIds: ["PFM"],
          primaryId: "P1",
          secondaryIds: ["P2"],
          eventPersonIds: ["P1"]
        }
      },
      {
        id: "ov-merge-focus",
        type: "merge_focus",
        priority: 95,
        config: {
          primaryIds: ["P1"],
          secondaryLevel1Ids: ["PF"],
          secondaryLevel2Ids: ["PM"]
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
      hoveredNode: { id: "P1", canonId: "P1", isPerson: true, x: 20, y: 20 },
      resolvedVisuals,
      precomputed,
      palette: TREE_PALETTE
    });

    expect(descriptor.timelineOverlay?.type).toBe("timeline");
    expect(descriptor.showTimelineBadge).toBe(true);
    expect(descriptor.showLegend).toBe(false);
    expect(descriptor.hoverMode).toBe("timeline");
  });
});
