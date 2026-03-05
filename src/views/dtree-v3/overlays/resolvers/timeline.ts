import type {
  EdgeVisualStyle,
  NodeVisualStyle,
  OverlayResolver
} from "@/views/dtree-v3/overlays/types";

export const timelineResolver: OverlayResolver = (context) => {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();

  const config = context.overlay.config ?? {};
  const livingSet = new Set<string>(config.livingIds ?? []);
  const deceasedSet = new Set<string>(config.deceasedIds ?? []);
  const primaryId = config.primaryId ? String(config.primaryId) : null;
  const secondarySet = new Set<string>(
    (config.secondaryIds ?? []).map((id: string | number) => String(id))
  );

  for (const node of context.graph.nodes) {
    const canonicalId = node.canonicalId ?? node.id;
    if (primaryId && canonicalId === primaryId) {
      nodeStyles.set(node.id, { fill: context.palette.warning, opacity: 1 });
      continue;
    }
    if (secondarySet.has(canonicalId)) {
      nodeStyles.set(node.id, { fill: context.palette.warning, opacity: 1 });
      continue;
    }
    if (livingSet.has(canonicalId)) {
      nodeStyles.set(node.id, { fill: context.palette.success, opacity: 1 });
      continue;
    }
    if (deceasedSet.has(canonicalId)) {
      nodeStyles.set(node.id, { fill: context.palette.danger, opacity: 1 });
    }
  }

  for (const edge of context.graph.edges) {
    const fromCanonicalId = context.nodeById.get(edge.from)?.canonicalId ?? edge.from;
    const toCanonicalId = context.nodeById.get(edge.to)?.canonicalId ?? edge.to;
    const isPrimary = Boolean(primaryId && (fromCanonicalId === primaryId || toCanonicalId === primaryId));
    const isSecondary = secondarySet.has(fromCanonicalId) || secondarySet.has(toCanonicalId);
    if (!isPrimary && !isSecondary) continue;
    edgeStyles.set(edge.id, {
      color: context.palette.warning,
      opacity: isPrimary ? 0.95 : 0.62,
      thickness: context.colorTheme.edgeThickness * (isPrimary ? 2.1 : 1.6)
    });
  }

  return { nodeStyles, edgeStyles, badges: [] };
};
