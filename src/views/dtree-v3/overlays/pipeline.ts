import { deepestResolver } from "@/views/dtree-v3/overlays/resolvers/deepest";
import { heatmapResolver } from "@/views/dtree-v3/overlays/resolvers/heatmap";
import { kinshipResolver } from "@/views/dtree-v3/overlays/resolvers/kinship";
import { layersResolver } from "@/views/dtree-v3/overlays/resolvers/layers";
import { lineageResolver } from "@/views/dtree-v3/overlays/resolvers/lineage";
import { mergeFocusResolver } from "@/views/dtree-v3/overlays/resolvers/mergeFocus";
import { originResolver } from "@/views/dtree-v3/overlays/resolvers/origin";
import { timelineResolver } from "@/views/dtree-v3/overlays/resolvers/timeline";
import type { OverlayType } from "@/types/domain";
import type {
  EdgeVisualStyle,
  NodeVisualStyle,
  OverlayPipelineInput,
  OverlayResolverContext,
  OverlayResolverRegistry,
  ResolvedVisuals
} from "@/views/dtree-v3/overlays/types";

const DEFAULT_REGISTRY: Record<OverlayType, NonNullable<OverlayResolverRegistry[OverlayType]>> = {
  lineage: lineageResolver,
  lineage_couple: lineageResolver,
  kinship: kinshipResolver,
  heatmap: heatmapResolver,
  origin: originResolver,
  deepest: deepestResolver,
  timeline: timelineResolver,
  merge_focus: mergeFocusResolver,
  layer: layersResolver
};

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function createNodeIndexes(
  graph: OverlayPipelineInput["graph"]
): {
  nodeById: Map<string, OverlayPipelineInput["graph"]["nodes"][number]>;
  nodesByCanonicalId: Map<string, OverlayPipelineInput["graph"]["nodes"][number][]>;
} {
  const nodeById = new Map<string, OverlayPipelineInput["graph"]["nodes"][number]>();
  const nodesByCanonicalId = new Map<
    string,
    OverlayPipelineInput["graph"]["nodes"][number][]
  >();

  for (const node of graph.nodes) {
    nodeById.set(node.id, node);
    const canonicalId = node.canonicalId ?? node.id;
    const bucket = nodesByCanonicalId.get(canonicalId) ?? [];
    bucket.push(node);
    nodesByCanonicalId.set(canonicalId, bucket);
  }

  return { nodeById, nodesByCanonicalId };
}

function applySelectionAndFocus(params: {
  graph: OverlayPipelineInput["graph"];
  nodeStyles: Map<string, NodeVisualStyle>;
  selectedPersonId: string | null;
  focusPersonId: string | null;
  focusStroke: string;
  selectedStroke: string;
  defaultStroke: string;
}) {
  for (const node of params.graph.nodes) {
    const isSelected =
      params.selectedPersonId === node.id || params.selectedPersonId === node.canonicalId;
    const isFocused =
      params.focusPersonId === node.id || params.focusPersonId === node.canonicalId;
    const currentStyle = params.nodeStyles.get(node.id) ?? {};

    if (isFocused) {
      params.nodeStyles.set(node.id, {
        ...currentStyle,
        stroke: params.focusStroke,
        strokeWidth: 2.4,
        opacity: 1
      });
      continue;
    }

    if (isSelected) {
      params.nodeStyles.set(node.id, {
        ...currentStyle,
        stroke: params.selectedStroke,
        strokeWidth: 3,
        opacity: 1
      });
      continue;
    }

    if (!currentStyle.stroke) {
      params.nodeStyles.set(node.id, {
        ...currentStyle,
        stroke: params.defaultStroke,
        strokeWidth: 1.2
      });
    }
  }
}

export function resolveOverlayPipeline(input: OverlayPipelineInput): ResolvedVisuals {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();
  const activeBadges: any[] = [];
  const perfMeta: ResolvedVisuals["perfMeta"] = [];
  const warnings: string[] = [];

  if (!input.document || !input.overlays) {
    return { nodeStyles, edgeStyles, activeBadges, perfMeta, warnings };
  }

  const registry: OverlayResolverRegistry = {
    ...DEFAULT_REGISTRY,
    ...(input.registry ?? {})
  };
  const sortedOverlays = [...input.overlays].sort(
    (left, right) => left.priority - right.priority
  );
  const indexes = createNodeIndexes(input.graph);

  for (const overlay of sortedOverlays) {
    const resolver = registry[overlay.type];
    if (!resolver) {
      const warning = `No resolver registered for overlay type "${overlay.type}".`;
      warnings.push(warning);
      perfMeta.push({
        overlayId: overlay.id,
        overlayType: overlay.type,
        durationMs: 0,
        warning
      });
      continue;
    }

    const startedAt = nowMs();
    try {
      const context: OverlayResolverContext = {
        overlay,
        document: input.document,
        graph: input.graph,
        colorTheme: input.colorTheme,
        selectedPersonId: input.selectedPersonId,
        focusPersonId: input.focusPersonId,
        palette: input.palette,
        precomputed: input.precomputed,
        nodeById: indexes.nodeById,
        nodesByCanonicalId: indexes.nodesByCanonicalId,
        currentNodeStyles: nodeStyles,
        currentEdgeStyles: edgeStyles
      };
      const result = resolver(context);

      if (result.nodeStyles) {
        for (const [nodeId, style] of result.nodeStyles.entries()) {
          nodeStyles.set(nodeId, style);
        }
      }
      if (result.edgeStyles) {
        for (const [edgeId, style] of result.edgeStyles.entries()) {
          edgeStyles.set(edgeId, style);
        }
      }
      if (result.badges?.length) {
        activeBadges.push(...result.badges);
      }
      if (result.warnings?.length) {
        warnings.push(...result.warnings);
      }

      perfMeta.push({
        overlayId: overlay.id,
        overlayType: overlay.type,
        durationMs: Number((nowMs() - startedAt).toFixed(3))
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const warning = `Resolver failure for overlay "${overlay.id}" (${overlay.type}): ${message}`;
      warnings.push(warning);
      perfMeta.push({
        overlayId: overlay.id,
        overlayType: overlay.type,
        durationMs: Number((nowMs() - startedAt).toFixed(3)),
        warning
      });
    }
  }

  applySelectionAndFocus({
    graph: input.graph,
    nodeStyles,
    selectedPersonId: input.selectedPersonId,
    focusPersonId: input.focusPersonId,
    focusStroke: input.palette.focusStroke,
    selectedStroke: input.palette.selectedStroke,
    defaultStroke: input.colorTheme.edges
  });

  return {
    nodeStyles,
    edgeStyles,
    activeBadges,
    perfMeta,
    warnings
  };
}

export const overlayResolverRegistry = DEFAULT_REGISTRY;
