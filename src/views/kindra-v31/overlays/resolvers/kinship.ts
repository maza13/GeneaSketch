import { findKinship } from "@/core/graph/kinship";
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

export const kinshipResolver: OverlayResolver = (context) => {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();
  const badges: any[] = [];
  const warnings: string[] = [];

  const config = context.overlay.config ?? {};
  const person1Id = String(config.person1Id ?? "");
  const person2Id = String(config.person2Id ?? "");
  if (!person1Id || !person2Id) {
    return { nodeStyles, edgeStyles, badges, warnings };
  }

  if (!context.document.persons[person1Id] || !context.document.persons[person2Id]) {
    warnings.push(
      `Overlay "${context.overlay.id}" ignored: kinship ids are not present in current document (${person1Id}, ${person2Id}).`
    );
    return { nodeStyles, edgeStyles, badges, warnings };
  }

  const runtime = context.precomputed.kinshipHeatmapRuntime;
  const kinshipResult = runtime
    ? runtime.getKinship(person1Id, person2Id)
    : findKinship(context.document, person1Id, person2Id);
  if (!kinshipResult) {
    return { nodeStyles, edgeStyles, badges, warnings };
  }

  const pathIds = new Set<string>(kinshipResult.pathPersonIds);
  for (const personId of pathIds) {
    for (const node of context.graph.nodes) {
      if (node.id === personId || node.canonicalId === personId) {
        nodeStyles.set(node.id, { fill: context.palette.highlight, opacity: 1 });
      }
    }
  }

  const fullPathIds = new Set<string>(pathIds);
  for (const node of context.graph.nodes) {
    if (node.type !== "family" && node.type !== "familyAlias" && node.type !== "junction") {
      continue;
    }

    const familyId = resolveFamilyId(node.id, node.canonicalId);
    const family = context.document.families[familyId];
    if (!family) continue;

    const members = [family.husbandId, family.wifeId, ...family.childrenIds].filter((memberId): memberId is string => {
      if (!memberId) return false;
      return pathIds.has(memberId);
    });
    if (members.length >= 2) {
      fullPathIds.add(node.id);
    }
  }

  for (const edge of context.graph.edges) {
    const fromNode = context.nodeById.get(edge.from);
    const toNode = context.nodeById.get(edge.to);
    if (!fromNode || !toNode) continue;

    const fromId = fromNode.canonicalId ?? fromNode.id;
    const toId = toNode.canonicalId ?? toNode.id;
    if (fullPathIds.has(fromId) && fullPathIds.has(toId)) {
      edgeStyles.set(edge.id, {
        color: context.palette.highlight,
        opacity: 0.9,
        thickness: context.colorTheme.edgeThickness * 1.5
      });
    }
  }

  badges.push({
    type: "kinship",
    text: kinshipResult.relationship?.primary ?? kinshipResult.relationshipText,
    textSecondary: kinshipResult.relationship?.secondary,
    p1: context.document.persons[person1Id]?.name ?? person1Id,
    p2: context.document.persons[person2Id]?.name ?? person2Id,
    sharedDnaPercentage: kinshipResult.sharedDnaPercentage,
    yDnaShared: kinshipResult.yDnaShared,
    mtDnaShared: kinshipResult.mtDnaShared
  });

  return { nodeStyles, edgeStyles, badges, warnings };
};
