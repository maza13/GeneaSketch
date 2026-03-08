import type { ActiveOverlay, ExpandedGraph, GraphDocument } from "@/types/domain";
import type {
  OverlayPrecomputedData,
  ResolvedVisuals,
  TreePalette
} from "@/views/kindra-v31/overlays/types";

export type HoveredNode = {
  id: string;
  canonId: string;
  isPerson: boolean;
  x: number;
  y: number;
};

export type OverlayUiContext = {
  document: GraphDocument | null;
  graph: ExpandedGraph;
  overlays: ActiveOverlay[];
  hoveredNode: HoveredNode | null;
  resolvedVisuals: ResolvedVisuals;
  precomputed: OverlayPrecomputedData;
  palette: TreePalette;
};

export type HoverMode = "none" | "layer" | "origin" | "deepest" | "heatmap" | "timeline";

export type OverlayUiDescriptor = {
  kinshipBadge: any | null;
  activeLayerOverlay: ActiveOverlay | null;
  heatmapOverlay: ActiveOverlay | null;
  timelineOverlay: ActiveOverlay | null;
  hasFamilyOriginHighlight: boolean;
  hasDeepestHighlight: boolean;
  hoverMode: HoverMode;
  showLegend: boolean;
  showTimelineBadge: boolean;
};
