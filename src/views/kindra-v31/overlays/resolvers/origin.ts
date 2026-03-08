import type {
  EdgeVisualStyle,
  NodeVisualStyle,
  OverlayResolver
} from "@/views/kindra-v31/overlays/types";

function resolveFamilyId(nodeId: string, canonicalId: string | undefined): string {
  if (nodeId.startsWith("junction:")) {
    return nodeId.replace("junction:", "");
  }
  return canonicalId ?? nodeId;
}

export const originResolver: OverlayResolver = (context) => {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();

  const config = context.overlay.config ?? {};
  const personId = String(config.personId ?? "");
  if (!personId) {
    return { nodeStyles, edgeStyles, badges: [] };
  }

  const targetPerson = context.document.persons[personId];
  if (!targetPerson || (targetPerson.famc?.length ?? 0) === 0) {
    return { nodeStyles, edgeStyles, badges: [] };
  }

  const familyId = targetPerson.famc[0]!;
  const family = context.document.families[familyId];
  if (!family) {
    return { nodeStyles, edgeStyles, badges: [] };
  }

  const highlightIds = new Set<string>(
    [familyId, family.husbandId, family.wifeId, ...family.childrenIds].filter(
      (value): value is string => Boolean(value)
    )
  );

  for (const highlightId of highlightIds) {
    for (const node of context.graph.nodes) {
      if (node.id === highlightId || node.canonicalId === highlightId) {
        nodeStyles.set(node.id, {
          fill:
            highlightId === personId
              ? context.palette.familyOriginSelf
              : context.palette.familyOriginGroup,
          opacity: 1
        });
      }
    }
  }

  const fullHighlightIds = new Set<string>(highlightIds);
  for (const node of context.graph.nodes) {
    if (node.type !== "family" && node.type !== "familyAlias" && node.type !== "junction") {
      continue;
    }

    const resolvedFamilyId = resolveFamilyId(node.id, node.canonicalId);
    if (highlightIds.has(resolvedFamilyId)) {
      fullHighlightIds.add(node.id);
    }
  }

  for (const edge of context.graph.edges) {
    const fromId = context.nodeById.get(edge.from)?.canonicalId ?? edge.from;
    const toId = context.nodeById.get(edge.to)?.canonicalId ?? edge.to;
    if (fullHighlightIds.has(fromId) && fullHighlightIds.has(toId)) {
      edgeStyles.set(edge.id, {
        color: context.palette.info,
        opacity: 0.9,
        thickness: context.colorTheme.edgeThickness * 1.8
      });
    }
  }

  return { nodeStyles, edgeStyles, badges: [] };
};
