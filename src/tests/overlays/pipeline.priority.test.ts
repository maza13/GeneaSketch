import { describe, expect, it } from "vitest";
import { buildOverlayPrecomputedData } from "@/views/kindra-v31/overlays/contextBuilders";
import { TREE_PALETTE } from "@/views/kindra-v31/overlays/palette";
import { resolveOverlayPipeline } from "@/views/kindra-v31/overlays/pipeline";
import type { OverlayResolverRegistry } from "@/views/kindra-v31/overlays/types";
import type { ColorThemeConfig } from "@/types/editor";
import type { ExpandedGraph, GraphDocument } from "@/types/domain";

function createTinyDocument(): GraphDocument {
  return {
    persons: {
      P1: {
        id: "P1",
        name: "Alpha",
        sex: "M",
        lifeStatus: "alive",
        events: [{ type: "BIRT", date: "1980" }],
        famc: [],
        fams: ["F1"],
        mediaRefs: [],
        sourceRefs: []
      },
      P2: {
        id: "P2",
        name: "Beta",
        sex: "F",
        lifeStatus: "alive",
        events: [{ type: "BIRT", date: "1982" }],
        famc: [],
        fams: ["F1"],
        mediaRefs: [],
        sourceRefs: []
      }
    },
    families: {
      F1: {
        id: "F1",
        husbandId: "P1",
        wifeId: "P2",
        childrenIds: [],
        events: []
      }
    },
    media: {},
    metadata: {
      sourceFormat: "GED",
      gedVersion: "7.0.x"
    }
  };
}

function createTinyGraph(): ExpandedGraph {
  return {
    nodes: [
      {
        id: "P1",
        label: "Alpha",
        isAlias: false,
        generation: 0,
        generationDepth: 0,
        sidePreference: "neutral",
        type: "person"
      },
      {
        id: "P2",
        label: "Beta",
        isAlias: false,
        generation: 0,
        generationDepth: 0,
        sidePreference: "neutral",
        type: "person"
      },
      {
        id: "F1",
        label: "",
        isAlias: false,
        generation: 0,
        generationDepth: 0,
        sidePreference: "neutral",
        type: "family"
      }
    ],
    edges: [
      {
        id: "E1",
        from: "P1",
        to: "F1",
        type: "spouse",
        familyId: "F1",
        spouseRole: "husband",
        layoutAffects: true
      },
      {
        id: "E2",
        from: "P2",
        to: "F1",
        type: "spouse",
        familyId: "F1",
        spouseRole: "wife",
        layoutAffects: true
      }
    ]
  };
}

const COLOR_THEME: ColorThemeConfig = {
  background: "#000",
  personNode: "#111",
  text: "#fff",
  edges: "#888",
  nodeFontSize: 14,
  edgeThickness: 1.4,
  nodeWidth: 200,
  nodeHeight: 100
};

describe("overlay pipeline priority and fault tolerance", () => {
  it("applies last-writer-wins by priority and continues after resolver failure", () => {
    const document = createTinyDocument();
    const graph = createTinyGraph();
    const overlays = [
      { id: "o2", type: "kinship", priority: 20, config: {} },
      { id: "o1", type: "lineage", priority: 10, config: {} },
      { id: "o3", type: "heatmap", priority: 30, config: {} }
    ] as const;
    const precomputed = buildOverlayPrecomputedData({ overlays: [...overlays], document, graph });

    const registry: OverlayResolverRegistry = {
      lineage: () => ({
        nodeStyles: new Map([["P1", { fill: "#114488", opacity: 1 }]]),
        badges: [{ type: "lineage", order: "first" }]
      }),
      kinship: () => ({
        nodeStyles: new Map([["P1", { fill: "#cc3300", opacity: 1 }]]),
        edgeStyles: new Map([["E1", { color: "#cc3300", opacity: 0.9, thickness: 2 }]]),
        badges: [{ type: "kinship", order: "second" }]
      }),
      heatmap: () => {
        throw new Error("synthetic resolver crash");
      }
    };

    const resolved = resolveOverlayPipeline({
      overlays: [...overlays],
      document,
      graph,
      colorTheme: COLOR_THEME,
      selectedPersonId: "P1",
      focusPersonId: "P2",
      palette: TREE_PALETTE,
      precomputed,
      registry
    });

    expect(resolved.nodeStyles.get("P1")?.fill).toBe("#cc3300");
    expect(resolved.nodeStyles.get("P1")?.stroke).toBe(TREE_PALETTE.selectedStroke);
    expect(resolved.nodeStyles.get("P2")?.stroke).toBe(TREE_PALETTE.focusStroke);
    expect(resolved.edgeStyles.get("E1")?.color).toBe("#cc3300");
    expect(resolved.activeBadges.map((badge) => badge.type)).toEqual(["lineage", "kinship"]);
    expect(resolved.warnings.some((warning) => warning.includes("Resolver failure"))).toBe(true);
    expect(resolved.perfMeta).toHaveLength(3);
    expect(resolved.perfMeta[2]?.warning).toContain("synthetic resolver crash");
  });

  it("keeps deterministic multi-overlay priority with layer/timeline/merge_focus", () => {
    const document = createTinyDocument();
    const graph = createTinyGraph();
    const overlays = [
      { id: "ov-merge", type: "merge_focus", priority: 95, config: {} },
      { id: "ov-timeline", type: "timeline", priority: 80, config: {} },
      { id: "ov-layer", type: "layer", priority: 50, config: { layerId: "layer-warnings" } }
    ] as const;
    const precomputed = buildOverlayPrecomputedData({ overlays: [...overlays], document, graph });

    const registry: OverlayResolverRegistry = {
      layer: () => ({
        nodeStyles: new Map([["P1", { fill: "#222222", opacity: 0.5 }]])
      }),
      timeline: () => ({
        nodeStyles: new Map([["P1", { fill: "#777700", opacity: 0.8 }]]),
        edgeStyles: new Map([["E1", { color: "#777700", opacity: 0.8, thickness: 1.5 }]])
      }),
      merge_focus: () => ({
        nodeStyles: new Map([["P1", { fill: "#0044aa", opacity: 1 }]]),
        edgeStyles: new Map([["E1", { color: "#0044aa", opacity: 0.9, thickness: 2.2 }]])
      })
    };

    const resolved = resolveOverlayPipeline({
      overlays: [...overlays],
      document,
      graph,
      colorTheme: COLOR_THEME,
      selectedPersonId: null,
      focusPersonId: null,
      palette: TREE_PALETTE,
      precomputed,
      registry
    });

    expect(resolved.nodeStyles.get("P1")?.fill).toBe("#0044aa");
    expect(resolved.edgeStyles.get("E1")?.color).toBe("#0044aa");
    expect(resolved.warnings).toEqual([]);
    expect(resolved.perfMeta.map((item) => item.overlayId)).toEqual(["ov-layer", "ov-timeline", "ov-merge"]);
  });
});
