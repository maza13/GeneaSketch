import type {
  EdgeVisualStyle,
  NodeVisualStyle,
  OverlayResolver
} from "@/views/kindra-v31/overlays/types";

export const mergeFocusResolver: OverlayResolver = (context) => {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();

  const config = context.overlay.config ?? {};
  const primarySet = new Set<string>(
    (config.primaryIds ?? []).map((id: string | number) => String(id))
  );
  const secondaryLevel1Set = new Set<string>(
    (config.secondaryLevel1Ids ?? config.secondaryIds ?? []).map(
      (id: string | number) => String(id)
    )
  );
  const secondaryLevel2Set = new Set<string>(
    (config.secondaryLevel2Ids ?? []).map((id: string | number) => String(id))
  );

  if (
    primarySet.size === 0
    && secondaryLevel1Set.size === 0
    && secondaryLevel2Set.size === 0
  ) {
    return { nodeStyles, edgeStyles, badges: [] };
  }

  for (const node of context.graph.nodes) {
    const canonicalId = node.canonicalId ?? node.id;
    const current = context.currentNodeStyles.get(node.id) ?? {};

    if (primarySet.has(canonicalId)) {
      nodeStyles.set(node.id, {
        ...current,
        opacity: 1,
        stroke: context.palette.timelinePrimaryStroke,
        strokeWidth: 4
      });
      continue;
    }

    if (secondaryLevel1Set.has(canonicalId)) {
      nodeStyles.set(node.id, {
        ...current,
        opacity: 0.82,
        stroke: context.palette.warning,
        strokeWidth: 2.5
      });
      continue;
    }

    if (secondaryLevel2Set.has(canonicalId)) {
      nodeStyles.set(node.id, {
        ...current,
        opacity: 0.64,
        stroke: context.palette.highlight,
        strokeWidth: 1.8
      });
      continue;
    }

    nodeStyles.set(node.id, {
      ...current,
      opacity: Math.min(current.opacity ?? 1, 0.16)
    });
  }

  for (const edge of context.graph.edges) {
    const fromCanonicalId = context.nodeById.get(edge.from)?.canonicalId ?? edge.from;
    const toCanonicalId = context.nodeById.get(edge.to)?.canonicalId ?? edge.to;
    const current = context.currentEdgeStyles.get(edge.id) ?? {};

    const touchesPrimary =
      primarySet.has(fromCanonicalId) || primarySet.has(toCanonicalId);
    const touchesSecondary1 =
      secondaryLevel1Set.has(fromCanonicalId) || secondaryLevel1Set.has(toCanonicalId);
    const touchesSecondary2 =
      secondaryLevel2Set.has(fromCanonicalId) || secondaryLevel2Set.has(toCanonicalId);

    if (touchesPrimary || touchesSecondary1 || touchesSecondary2) {
      edgeStyles.set(edge.id, {
        ...current,
        color: touchesPrimary
          ? context.palette.timelinePrimaryStroke
          : touchesSecondary1
            ? context.palette.warning
            : context.palette.highlight,
        opacity: touchesPrimary ? 0.96 : touchesSecondary1 ? 0.66 : 0.48,
        thickness: context.colorTheme.edgeThickness * (
          touchesPrimary ? 2.2 : touchesSecondary1 ? 1.6 : 1.2
        )
      });
      continue;
    }

    edgeStyles.set(edge.id, {
      ...current,
      opacity: Math.min(current.opacity ?? 1, 0.08)
    });
  }

  return { nodeStyles, edgeStyles, badges: [] };
};
