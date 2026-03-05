import { getLineagePath } from "@/core/graph/kinship";
import type {
  EdgeVisualStyle,
  NodeVisualStyle,
  OverlayResolver,
  OverlayResolverContext
} from "@/views/dtree-v3/overlays/types";

function resolveFamilyIdFromNode(context: OverlayResolverContext, nodeId: string): string {
  const node = context.nodeById.get(nodeId);
  if (!node) return nodeId;
  if (node.type === "junction") return node.id.replace("junction:", "");
  return node.canonicalId ?? node.id;
}

function applySingleLineage(context: OverlayResolverContext) {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();
  const badges: any[] = [];

  const config = context.overlay.config ?? {};
  const personId = String(config.personId ?? "");
  const mode = String(config.mode ?? "all") as "patrilineal" | "matrilineal" | "all";

  if (!personId || mode === "all") {
    return { nodeStyles, edgeStyles, badges };
  }

  const { personIds, oldestId } = getLineagePath(context.document, personId, mode);
  const color =
    mode === "patrilineal"
      ? context.palette.patrilineal
      : mode === "matrilineal"
        ? context.palette.matrilineal
        : context.palette.highlight;

  for (const person of personIds) {
    for (const node of context.graph.nodes) {
      if (node.id === person || node.canonicalId === person) {
        nodeStyles.set(node.id, { fill: color, opacity: 1 });
      }
    }
  }

  const fullPathIds = new Set<string>(personIds);
  for (const node of context.graph.nodes) {
    if (node.type !== "family" && node.type !== "familyAlias" && node.type !== "junction") {
      continue;
    }
    const familyId = resolveFamilyIdFromNode(context, node.id);
    const family = context.document.families[familyId];
    if (!family) continue;
    const members = [family.husbandId, family.wifeId, ...family.childrenIds].filter((memberId): memberId is string => {
      if (!memberId) return false;
      return personIds.has(memberId);
    });
    if (members.length >= 2) {
      fullPathIds.add(node.id);
    }
  }

  for (const edge of context.graph.edges) {
    const fromId = context.nodeById.get(edge.from)?.canonicalId ?? edge.from;
    const toId = context.nodeById.get(edge.to)?.canonicalId ?? edge.to;
    if (fullPathIds.has(fromId) && fullPathIds.has(toId)) {
      edgeStyles.set(edge.id, {
        color,
        opacity: 0.9,
        thickness: context.colorTheme.edgeThickness * 1.5
      });
    }
  }

  const oldestPerson = context.document.persons[oldestId];
  const targetPerson = context.document.persons[personId];
  badges.push({
    type: "lineage",
    mode,
    targetName: targetPerson?.name ?? personId,
    oldestName: oldestPerson?.name ?? oldestId,
    count: personIds.size
  });

  return { nodeStyles, edgeStyles, badges };
}

function applyCoupleLineage(context: OverlayResolverContext) {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();
  const badges: any[] = [];

  const config = context.overlay.config ?? {};
  const husbandId = String(config.husbandId ?? "");
  const wifeId = String(config.wifeId ?? "");
  if (!husbandId || !wifeId) {
    return { nodeStyles, edgeStyles, badges };
  }

  const husbandPath = getLineagePath(context.document, husbandId, "patrilineal");
  const wifePath = getLineagePath(context.document, wifeId, "matrilineal");

  const husbandColor = context.palette.patrilineal;
  const wifeColor = context.palette.matrilineal;
  const combinedColor = context.palette.combinedLineage;

  const allPersons = new Set<string>([
    ...Array.from(husbandPath.personIds),
    ...Array.from(wifePath.personIds)
  ]);

  for (const personId of allPersons) {
    const isHusbandPath = husbandPath.personIds.has(personId);
    const isWifePath = wifePath.personIds.has(personId);
    const color = isHusbandPath && isWifePath
      ? combinedColor
      : isHusbandPath
        ? husbandColor
        : wifeColor;

    for (const node of context.graph.nodes) {
      const isSamePerson = node.id === personId || node.canonicalId === personId;
      const isPersonNode = node.type === "person" || node.type === "personAlias";
      if (isSamePerson && isPersonNode) {
        nodeStyles.set(node.id, { fill: color, opacity: 1 });
      }
    }
  }

  for (const node of context.graph.nodes) {
    if (node.type !== "family" && node.type !== "familyAlias" && node.type !== "junction") {
      continue;
    }

    const familyId = resolveFamilyIdFromNode(context, node.id);
    const family = context.document.families[familyId];
    if (!family) continue;

    const husbandNodeId = family.husbandId;
    const wifeNodeId = family.wifeId;
    const husbandInHusbandPath = Boolean(husbandNodeId && husbandPath.personIds.has(husbandNodeId));
    const husbandInWifePath = Boolean(husbandNodeId && wifePath.personIds.has(husbandNodeId));
    const wifeInHusbandPath = Boolean(wifeNodeId && husbandPath.personIds.has(wifeNodeId));
    const wifeInWifePath = Boolean(wifeNodeId && wifePath.personIds.has(wifeNodeId));

    if (
      (husbandInHusbandPath && wifeInWifePath)
      || (husbandInWifePath && wifeInHusbandPath)
      || (husbandInHusbandPath && wifeInHusbandPath)
      || (husbandInWifePath && wifeInWifePath)
    ) {
      nodeStyles.set(node.id, { fill: combinedColor, opacity: 1 });
      continue;
    }

    if (
      husbandInHusbandPath
      || husbandInWifePath
      || family.childrenIds.some((childId) => husbandPath.personIds.has(childId))
    ) {
      nodeStyles.set(node.id, { fill: husbandColor, opacity: 1 });
      continue;
    }

    if (
      wifeInWifePath
      || wifeInHusbandPath
      || family.childrenIds.some((childId) => wifePath.personIds.has(childId))
    ) {
      nodeStyles.set(node.id, { fill: wifeColor, opacity: 1 });
    }
  }

  for (const edge of context.graph.edges) {
    const fromStyle = nodeStyles.get(edge.from);
    const toStyle = nodeStyles.get(edge.to);
    if (!fromStyle || !toStyle) continue;

    if (fromStyle.fill === combinedColor && toStyle.fill === combinedColor) {
      edgeStyles.set(edge.id, {
        color: combinedColor,
        opacity: 0.95,
        thickness: context.colorTheme.edgeThickness * 2
      });
      continue;
    }

    const isPartHusband =
      fromStyle.fill === husbandColor
      || toStyle.fill === husbandColor
      || fromStyle.fill === combinedColor
      || toStyle.fill === combinedColor;
    const isPartWife =
      fromStyle.fill === wifeColor
      || toStyle.fill === wifeColor
      || fromStyle.fill === combinedColor
      || toStyle.fill === combinedColor;

    if (isPartHusband && isPartWife) {
      edgeStyles.set(edge.id, {
        color: combinedColor,
        opacity: 0.9,
        thickness: context.colorTheme.edgeThickness * 1.5
      });
      continue;
    }

    if (isPartHusband) {
      edgeStyles.set(edge.id, {
        color: husbandColor,
        opacity: 0.9,
        thickness: context.colorTheme.edgeThickness * 1.5
      });
      continue;
    }

    if (isPartWife) {
      edgeStyles.set(edge.id, {
        color: wifeColor,
        opacity: 0.9,
        thickness: context.colorTheme.edgeThickness * 1.5
      });
    }
  }

  badges.push({
    type: "lineage",
    mode: "couple",
    husbandName: context.document.persons[husbandId]?.name ?? husbandId,
    wifeName: context.document.persons[wifeId]?.name ?? wifeId,
    husbandCount: husbandPath.personIds.size,
    wifeCount: wifePath.personIds.size
  });

  return { nodeStyles, edgeStyles, badges };
}

export const lineageResolver: OverlayResolver = (context) => {
  if (context.overlay.type === "lineage") {
    return applySingleLineage(context);
  }
  return applyCoupleLineage(context);
};
