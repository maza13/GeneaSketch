import * as d3 from "d3";
import {
  calculateGeneticHeatmap,
  findKinship
} from "@/core/graph/kinship";
import { normalizeConsanguinityIntensity } from "@/core/graph/endogamyVisual";
import type {
  EdgeVisualStyle,
  NodeVisualStyle,
  OverlayResolver
} from "@/views/dtree-v3/overlays/types";

function interpolateHeatmapColor(
  value: number,
  mode: "vibrant" | "monochromatic"
): string {
  const scaled = normalizeConsanguinityIntensity(value);
  if (mode === "monochromatic") {
    return d3.interpolateBlues(0.2 + scaled * 0.8);
  }
  return d3.interpolateTurbo(scaled);
}

function resolveFamilyId(nodeId: string, canonicalId: string | undefined): string {
  if (nodeId.startsWith("junction:")) {
    return nodeId.replace("junction:", "");
  }
  return canonicalId ?? nodeId;
}

export const heatmapResolver: OverlayResolver = (context) => {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();
  const badges: any[] = [];
  const warnings: string[] = [];

  const config = context.overlay.config ?? {};
  const personId = String(config.personId ?? "");
  const targetId = config.targetId ? String(config.targetId) : null;
  const mode = String(config.mode ?? "vibrant") as "vibrant" | "monochromatic";
  if (!personId) {
    return { nodeStyles, edgeStyles, badges, warnings };
  }
  if (!context.document.persons[personId]) {
    warnings.push(
      `Overlay "${context.overlay.id}" ignored: heatmap base person "${personId}" does not exist in current document.`
    );
    return { nodeStyles, edgeStyles, badges, warnings };
  }

  const runtime = context.precomputed.kinshipHeatmapRuntime;
  const heatmap = runtime
    ? runtime.getHeatmap(personId)
    : calculateGeneticHeatmap(context.document, personId);

  for (const node of context.graph.nodes) {
    const canonicalId = node.canonicalId ?? node.id;
    const dna = heatmap.dnaMap.get(canonicalId) ?? 0;
    if (dna > 0) {
      nodeStyles.set(node.id, {
        fill: interpolateHeatmapColor(dna, mode),
        opacity: 1
      });
    } else if (!nodeStyles.has(node.id)) {
      nodeStyles.set(node.id, { opacity: 0.15 });
    }
  }

  for (const edge of context.graph.edges) {
    const fromCanonicalId = context.nodeById.get(edge.from)?.canonicalId ?? edge.from;
    const toCanonicalId = context.nodeById.get(edge.to)?.canonicalId ?? edge.to;
    const dnaFrom = heatmap.dnaMap.get(fromCanonicalId) ?? 0;
    const dnaTo = heatmap.dnaMap.get(toCanonicalId) ?? 0;

    if (dnaFrom > 0 || dnaTo > 0) {
      edgeStyles.set(edge.id, {
        color: interpolateHeatmapColor(Math.max(dnaFrom, dnaTo), mode),
        opacity: 0.8,
        thickness: context.colorTheme.edgeThickness * 1.2
      });
    } else if (!edgeStyles.has(edge.id)) {
      edgeStyles.set(edge.id, { opacity: 0.1 });
    }
  }

  if (!targetId) {
    return { nodeStyles, edgeStyles, badges, warnings };
  }
  if (!context.document.persons[targetId]) {
    warnings.push(
      `Overlay "${context.overlay.id}" ignored: heatmap target person "${targetId}" does not exist in current document.`
    );
    return { nodeStyles, edgeStyles, badges, warnings };
  }

  const kinshipResult = runtime
    ? runtime.getHeatmapKinship(personId, targetId)
    : findKinship(context.document, personId, targetId);
  if (!kinshipResult) {
    return { nodeStyles, edgeStyles, badges, warnings };
  }

  const pathIds = new Set<string>(kinshipResult.pathPersonIds);
  for (const personPathId of pathIds) {
    for (const node of context.graph.nodes) {
      if (node.id === personPathId || node.canonicalId === personPathId) {
        const currentStyle = nodeStyles.get(node.id) ?? {};
        nodeStyles.set(node.id, {
          ...currentStyle,
          stroke: context.palette.warning,
          strokeWidth: 3.5,
          opacity: 1
        });
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
      const currentStyle = nodeStyles.get(node.id) ?? {};
      nodeStyles.set(node.id, {
        ...currentStyle,
        stroke: context.palette.warning,
        strokeWidth: 2,
        opacity: 1
      });
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
        color: context.palette.warning,
        opacity: 1,
        thickness: context.colorTheme.edgeThickness * 2.5
      });
    }
  }

  badges.push({
    type: "kinship",
    text: kinshipResult.relationship?.primary ?? kinshipResult.relationshipText,
    textSecondary: kinshipResult.relationship?.secondary,
    p1: context.document.persons[personId]?.name ?? personId,
    p2: context.document.persons[targetId]?.name ?? targetId,
    sharedDnaPercentage: kinshipResult.sharedDnaPercentage,
    yDnaShared: kinshipResult.yDnaShared,
    mtDnaShared: kinshipResult.mtDnaShared
  });

  return { nodeStyles, edgeStyles, badges, warnings };
};
