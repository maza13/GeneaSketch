import type { ActiveOverlay } from "@/types/domain";
import type {
  OverlayUiContext,
  OverlayUiDescriptor,
  HoverMode
} from "@/views/kindra-v31/ui/overlayUiModel";

function findOverlay(overlays: ActiveOverlay[], type: ActiveOverlay["type"]): ActiveOverlay | null {
  return overlays.find((overlay) => overlay.type === type) ?? null;
}

export function resolveOverlayUiDescriptor(context: OverlayUiContext): OverlayUiDescriptor {
  const kinshipBadge =
    context.resolvedVisuals.activeBadges.find((badge) => badge.type === "kinship" || badge.type === "lineage")
    ?? null;
  const activeLayerOverlay = findOverlay(context.overlays, "layer");
  const heatmapOverlay = findOverlay(context.overlays, "heatmap");
  const timelineOverlay = findOverlay(context.overlays, "timeline");
  const originOverlay = findOverlay(context.overlays, "origin");
  const deepestOverlay = findOverlay(context.overlays, "deepest");
  const hasFamilyOriginHighlight = context.precomputed.familyOriginData.highlightIds.size > 0;
  const hasDeepestHighlight = Boolean(deepestOverlay);

  let hoverMode: HoverMode = "none";
  if (context.hoveredNode && context.overlays.length > 0) {
    if (activeLayerOverlay) {
      hoverMode = "layer";
    } else if (hasFamilyOriginHighlight && originOverlay) {
      hoverMode = "origin";
    } else if (deepestOverlay) {
      hoverMode = "deepest";
    } else if (heatmapOverlay) {
      hoverMode = "heatmap";
    } else if (timelineOverlay) {
      hoverMode = "timeline";
    }
  }

  return {
    kinshipBadge,
    activeLayerOverlay,
    heatmapOverlay,
    timelineOverlay,
    hasFamilyOriginHighlight,
    hasDeepestHighlight,
    hoverMode,
    showLegend: Boolean(activeLayerOverlay || originOverlay || deepestOverlay),
    showTimelineBadge: Boolean(timelineOverlay)
  };
}
