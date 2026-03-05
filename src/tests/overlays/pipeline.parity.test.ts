import { describe, expect, it } from "vitest";
import { expandGraph } from "@/core/graph/expand";
import {
  createLayoutFixtureDoc,
  createLayoutFixtureViewConfig
} from "@/tests/layout/fixture";
import { buildOverlayPrecomputedData } from "@/views/dtree-v3/overlays/contextBuilders";
import { TREE_PALETTE } from "@/views/dtree-v3/overlays/palette";
import { resolveOverlayPipeline } from "@/views/dtree-v3/overlays/pipeline";
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

function createAllOverlayFixtures(): ActiveOverlay[] {
  return [
    {
      id: "ov-lineage",
      type: "lineage",
      priority: 5,
      config: { personId: "P1", mode: "patrilineal" }
    },
    {
      id: "ov-lineage-couple",
      type: "lineage_couple",
      priority: 10,
      config: { husbandId: "P1", wifeId: "P2" }
    },
    {
      id: "ov-kinship",
      type: "kinship",
      priority: 15,
      config: { person1Id: "P1", person2Id: "PM" }
    },
    {
      id: "ov-heatmap",
      type: "heatmap",
      priority: 20,
      config: { personId: "P1", targetId: "PM", mode: "vibrant" }
    },
    {
      id: "ov-origin",
      type: "origin",
      priority: 25,
      config: { personId: "P1" }
    },
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
    },
    {
      id: "ov-timeline",
      type: "timeline",
      priority: 35,
      config: {
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
      priority: 40,
      config: {
        primaryIds: ["P1"],
        secondaryLevel1Ids: ["PF"],
        secondaryLevel2Ids: ["PM"]
      }
    },
    {
      id: "ov-layer-warnings",
      type: "layer",
      priority: 45,
      config: { layerId: "layer-warnings" }
    },
    {
      id: "ov-layer-symmetry",
      type: "layer",
      priority: 46,
      config: { layerId: "layer-symmetry" }
    },
    {
      id: "ov-layer-places",
      type: "layer",
      priority: 47,
      config: { layerId: "layer-places", mode: "intelligent" }
    },
    {
      id: "ov-layer-endogamy",
      type: "layer",
      priority: 48,
      config: { layerId: "layer-endogamy" }
    }
  ];
}

function serializeMapValues<T>(map: Map<string, T>): Array<[string, T]> {
  return [...map.entries()].sort((left, right) => left[0].localeCompare(right[0]));
}

describe("overlay pipeline parity", () => {
  it("keeps deterministic output and covers all overlay families", () => {
    const document = createLayoutFixtureDoc();
    const viewConfig = createLayoutFixtureViewConfig();
    const graph = expandGraph(document, viewConfig);
    const overlays = createAllOverlayFixtures();

    const precomputedOrdered = buildOverlayPrecomputedData({
      overlays,
      document,
      graph
    });
    expect(precomputedOrdered.kinshipHeatmapRuntime).not.toBeNull();
    const ordered = resolveOverlayPipeline({
      overlays,
      document,
      graph,
      colorTheme: COLOR_THEME,
      selectedPersonId: "P1",
      focusPersonId: "P2",
      palette: TREE_PALETTE,
      precomputed: precomputedOrdered
    });

    const shuffled = [...overlays].reverse();
    const precomputedShuffled = buildOverlayPrecomputedData({
      overlays: shuffled,
      document,
      graph
    });
    const reversed = resolveOverlayPipeline({
      overlays: shuffled,
      document,
      graph,
      colorTheme: COLOR_THEME,
      selectedPersonId: "P1",
      focusPersonId: "P2",
      palette: TREE_PALETTE,
      precomputed: precomputedShuffled
    });

    expect(serializeMapValues(ordered.nodeStyles)).toEqual(serializeMapValues(reversed.nodeStyles));
    expect(serializeMapValues(ordered.edgeStyles)).toEqual(serializeMapValues(reversed.edgeStyles));
    expect(ordered.activeBadges).toEqual(reversed.activeBadges);

    expect(ordered.perfMeta).toHaveLength(overlays.length);
    expect(new Set(ordered.perfMeta.map((entry) => entry.overlayType))).toEqual(
      new Set(["lineage", "lineage_couple", "kinship", "heatmap", "origin", "deepest", "timeline", "merge_focus", "layer"])
    );

    const selectedNodeIds = graph.nodes
      .filter((node) => node.id === "P1" || node.canonicalId === "P1")
      .map((node) => node.id);
    const focusNodeIds = graph.nodes
      .filter((node) => node.id === "P2" || node.canonicalId === "P2")
      .map((node) => node.id);

    const hasSelectedStroke = selectedNodeIds.some(
      (nodeId) => ordered.nodeStyles.get(nodeId)?.stroke === TREE_PALETTE.selectedStroke
    );
    const hasFocusStroke = focusNodeIds.some(
      (nodeId) => ordered.nodeStyles.get(nodeId)?.stroke === TREE_PALETTE.focusStroke
    );
    expect(hasSelectedStroke).toBe(true);
    expect(hasFocusStroke).toBe(true);

    expect(ordered.activeBadges.some((badge) => badge.type === "kinship")).toBe(true);
    expect(ordered.activeBadges.some((badge) => badge.type === "lineage")).toBe(true);
    expect(ordered.warnings).toEqual([]);
  });
});
