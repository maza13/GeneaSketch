import {
  getPersonMarkerPlace,
  type GeographicLayerMode
} from "@/core/graph/locationMarkers";
import type {
  EdgeVisualStyle,
  NodeVisualStyle,
  OverlayResolver
} from "@/views/kindra-v31/overlays/types";

function applyWarningsLayer(context: Parameters<OverlayResolver>[0]) {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();
  const issueTargetIds = context.precomputed.diagnosticIssueTargetIds;

  for (const node of context.graph.nodes) {
    const canonicalId = node.canonicalId ?? node.id;
    if (issueTargetIds.has(canonicalId)) {
      nodeStyles.set(node.id, {
        fill: context.palette.danger,
        opacity: 1
      });
    } else if (!nodeStyles.has(node.id)) {
      nodeStyles.set(node.id, { opacity: 0.15 });
    }
  }

  for (const edge of context.graph.edges) {
    const fromCanonicalId = context.nodeById.get(edge.from)?.canonicalId ?? edge.from;
    const toCanonicalId = context.nodeById.get(edge.to)?.canonicalId ?? edge.to;
    if (issueTargetIds.has(fromCanonicalId) && issueTargetIds.has(toCanonicalId)) {
      edgeStyles.set(edge.id, {
        color: context.palette.danger,
        opacity: 0.8,
        thickness: context.colorTheme.edgeThickness * 1.5
      });
    } else if (!edgeStyles.has(edge.id)) {
      edgeStyles.set(edge.id, { opacity: 0.1 });
    }
  }

  return { nodeStyles, edgeStyles };
}

function applySymmetryLayer(context: Parameters<OverlayResolver>[0]) {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();

  for (const node of context.graph.nodes) {
    if (node.type === "person" || node.type === "personAlias") {
      const person = context.document.persons[node.canonicalId ?? node.id];
      let knownParents = 0;
      if (person?.famc.length) {
        const family = context.document.families[person.famc[0]!];
        if (family?.husbandId) knownParents += 1;
        if (family?.wifeId) knownParents += 1;
      }
      const fill =
        knownParents === 2
          ? context.palette.success
          : knownParents === 1
            ? context.palette.warning
            : context.palette.danger;
      nodeStyles.set(node.id, { fill, opacity: 1 });
      continue;
    }

    nodeStyles.set(node.id, { opacity: 0.15 });
  }

  for (const edge of context.graph.edges) {
    edgeStyles.set(edge.id, { opacity: 0.25 });
  }

  return { nodeStyles, edgeStyles };
}

function applyPlacesLayer(context: Parameters<OverlayResolver>[0], mode: GeographicLayerMode) {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();

  for (const node of context.graph.nodes) {
    if (node.type === "person" || node.type === "personAlias") {
      const person = context.document.persons[node.canonicalId ?? node.id];
      if (!person) continue;

      const place = getPersonMarkerPlace(person, mode);
      if (place?.trim()) {
        const normalized = place.trim().toUpperCase();
        let hash = 0;
        for (let i = 0; i < normalized.length; i += 1) {
          hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
        }
        nodeStyles.set(node.id, {
          fill: `hsl(${Math.abs(hash) % 360}, 75%, 28%)`,
          opacity: 1
        });
      } else {
        nodeStyles.set(node.id, { opacity: 0.25 });
      }
      continue;
    }

    nodeStyles.set(node.id, { opacity: 0.15 });
  }

  for (const edge of context.graph.edges) {
    edgeStyles.set(edge.id, { opacity: 0.25 });
  }

  return { nodeStyles, edgeStyles };
}

function applyEndogamyLayer(context: Parameters<OverlayResolver>[0]) {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();
  const roles = context.precomputed.endogamyData.roles;
  const edgeColors = context.precomputed.endogamyData.edgeColors;

  for (const node of context.graph.nodes) {
    const nodeRoles = roles.get(node.id) ?? [];
    const uniqueColors = Array.from(
      new Set(nodeRoles.map((role) => role.color))
    );
    const isChild = nodeRoles.some((role) => role.role === "child");

    if (uniqueColors.length > 0) {
      nodeStyles.set(node.id, {
        fill: uniqueColors.length === 1 ? uniqueColors[0] : `url(#grad-endo-${node.id})`,
        opacity: 1,
        stroke: isChild
          ? context.palette.endogamyChildStroke
          : uniqueColors.length === 1
            ? uniqueColors[0]
            : undefined,
        strokeWidth: isChild ? 6 : 3.5
      });
      continue;
    }

    nodeStyles.set(node.id, { opacity: 0.15 });
  }

  for (const edge of context.graph.edges) {
    const colors = edgeColors.get(edge.id);
    if (colors && colors.length > 0) {
      edgeStyles.set(edge.id, {
        color: colors[0],
        opacity: 0.8,
        thickness: context.colorTheme.edgeThickness * 1.5
      });
    } else {
      edgeStyles.set(edge.id, { opacity: 0.1 });
    }
  }

  return { nodeStyles, edgeStyles };
}

export const layersResolver: OverlayResolver = (context) => {
  const config = context.overlay.config ?? {};
  const layerId = String(config.layerId ?? "");

  if (layerId === "layer-warnings") {
    return { ...applyWarningsLayer(context), badges: [] };
  }
  if (layerId === "layer-symmetry") {
    return { ...applySymmetryLayer(context), badges: [] };
  }
  if (layerId === "layer-places") {
    const rawMode = String(config.mode ?? "intelligent");
    const mode: GeographicLayerMode = (
      rawMode === "birth" || rawMode === "residence" || rawMode === "death" || rawMode === "intelligent"
    )
      ? rawMode
      : "intelligent";
    return { ...applyPlacesLayer(context, mode), badges: [] };
  }
  if (layerId === "layer-endogamy") {
    return { ...applyEndogamyLayer(context), badges: [] };
  }

  return {
    nodeStyles: new Map<string, NodeVisualStyle>(),
    edgeStyles: new Map<string, EdgeVisualStyle>(),
    badges: [],
    warnings: [`Unsupported layer id: ${layerId}`]
  };
};
