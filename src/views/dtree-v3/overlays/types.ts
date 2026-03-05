import type { GraphDocument, ActiveOverlay, ExpandedGraph, OverlayType } from "@/types/domain";
import type { ColorThemeConfig } from "@/types/editor";
import type { KinshipResult } from "@/core/graph/kinship";
import type { KinshipHeatmapRuntime } from "@/views/dtree-v3/overlays/kinshipHeatmapRuntime";

export type NodeVisualStyle = {
  fill?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  badge?: string;
};

export type EdgeVisualStyle = {
  color?: string;
  opacity?: number;
  thickness?: number;
};

export type EndogamyRole = {
  role: "ancestor" | "parent" | "child" | "family" | "path";
  kinship?: KinshipResult;
  color: string;
  contextText?: string;
};

export type EndogamyData = {
  edgeColors: Map<string, string[]>;
  roles: Map<string, EndogamyRole[]>;
};

export type FamilyOriginSummary = {
  famId: string;
  children: number;
  marriageDate?: string;
  era?: string;
  location?: string;
};

export type FamilyOriginData = {
  highlightIds: Set<string>;
  summary: FamilyOriginSummary | null;
};

export type DeepestAncestorSets = {
  exact: Set<string>;
  estimated: Set<string>;
  deepest: Set<string>;
  targetId?: string;
  exactEndId?: string;
  estimatedEndId?: string;
  deepestEndId?: string;
};

export type TimelineNodeSets = {
  livingNodeIds: Set<string>;
  deceasedNodeIds: Set<string>;
  eventNodeIds: Set<string>;
};

export type OverlayPrecomputedData = {
  diagnosticIssues: Map<string, any[]>;
  diagnosticIssueTargetIds: Set<string>;
  endogamyData: EndogamyData;
  familyOriginTargetId: string | null;
  familyOriginData: FamilyOriginData;
  deepestAncestorSets: DeepestAncestorSets | null;
  timelineNodeSets: TimelineNodeSets;
  kinshipHeatmapRuntime: KinshipHeatmapRuntime | null;
};

export type TreePalette = {
  endogamyCases: readonly string[];
  highlight: string;
  danger: string;
  info: string;
  oldestExact: string;
  oldestEstimated: string;
  oldestDeepest: string;
  warning: string;
  success: string;
  familyOriginSelf: string;
  familyOriginGroup: string;
  oldestExactPath: string;
  oldestEstimatedPath: string;
  oldestDeepestPath: string;
  livingFill: string;
  livingStroke: string;
  focusStroke: string;
  selectedStroke: string;
  warningStroke: string;
  endogamyChildStroke: string;
  timelinePrimaryStroke: string;
  patrilineal: string;
  matrilineal: string;
  combinedLineage: string;
  overlayBg: string;
  overlayBgSoft: string;
  overlayShadow: string;
  overlayText: string;
  overlayTextSoft: string;
  overlayTextMuted: string;
  kinshipAccent: string;
};

export type OverlayResolverResult = {
  nodeStyles?: Map<string, NodeVisualStyle>;
  edgeStyles?: Map<string, EdgeVisualStyle>;
  badges?: any[];
  warnings?: string[];
};

export type OverlayResolverContext = {
  overlay: ActiveOverlay;
  document: GraphDocument;
  graph: ExpandedGraph;
  colorTheme: ColorThemeConfig;
  selectedPersonId: string | null;
  focusPersonId: string | null;
  palette: TreePalette;
  precomputed: OverlayPrecomputedData;
  nodeById: Map<string, ExpandedGraph["nodes"][number]>;
  nodesByCanonicalId: Map<string, ExpandedGraph["nodes"][number][]>;
  currentNodeStyles: Map<string, NodeVisualStyle>;
  currentEdgeStyles: Map<string, EdgeVisualStyle>;
};

export type OverlayResolver = (
  context: OverlayResolverContext
) => OverlayResolverResult;

export type OverlayResolverRegistry = Partial<Record<OverlayType, OverlayResolver>>;

export type OverlayPerfMeta = {
  overlayId: string;
  overlayType: OverlayType;
  durationMs: number;
  warning?: string;
};

export type ResolvedVisuals = {
  nodeStyles: Map<string, NodeVisualStyle>;
  edgeStyles: Map<string, EdgeVisualStyle>;
  activeBadges: any[];
  perfMeta: OverlayPerfMeta[];
  warnings: string[];
};

export type OverlayPipelineInput = {
  overlays?: ActiveOverlay[];
  document: GraphDocument | null;
  graph: ExpandedGraph;
  colorTheme: ColorThemeConfig;
  selectedPersonId: string | null;
  focusPersonId: string | null;
  palette: TreePalette;
  precomputed: OverlayPrecomputedData;
  registry?: OverlayResolverRegistry;
};
