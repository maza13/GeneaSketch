import type {
  EdgeVisualStyle,
  NodeVisualStyle,
  OverlayResolver
} from "@/views/dtree-v3/overlays/types";

export const deepestResolver: OverlayResolver = (context) => {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();
  const sets = context.precomputed.deepestAncestorSets;
  if (!sets) {
    return { nodeStyles, edgeStyles, badges: [] };
  }

  const applyPathSet = (
    ids: Set<string>,
    color: string,
    pathColor: string,
    weight: number,
    opacity: number,
    endId?: string
  ) => {
    for (const nodeId of ids) {
      const isEnd = nodeId === endId;
      const isTarget = nodeId === sets.targetId;
      nodeStyles.set(nodeId, {
        fill: isTarget ? context.palette.warning : isEnd ? color : pathColor,
        opacity
      });
    }

    for (const edge of context.graph.edges) {
      const fromNode = context.nodeById.get(edge.from);
      const toNode = context.nodeById.get(edge.to);
      if (!fromNode || !toNode) continue;

      const fromId = fromNode.canonicalId ?? fromNode.id;
      const toId = toNode.canonicalId ?? toNode.id;
      if (ids.has(fromId) && ids.has(toId)) {
        edgeStyles.set(edge.id, {
          color,
          opacity: Math.min(1, opacity + 0.1),
          thickness: context.colorTheme.edgeThickness * weight
        });
      }
    }
  };

  applyPathSet(
    sets.deepest,
    context.palette.oldestDeepest,
    context.palette.oldestDeepestPath,
    1.3,
    0.45,
    sets.deepestEndId
  );
  applyPathSet(
    sets.estimated,
    context.palette.oldestEstimated,
    context.palette.oldestEstimatedPath,
    1.6,
    0.7,
    sets.estimatedEndId
  );
  applyPathSet(
    sets.exact,
    context.palette.oldestExact,
    context.palette.oldestExactPath,
    2,
    0.95,
    sets.exactEndId
  );

  return { nodeStyles, edgeStyles, badges: [] };
};
