import * as d3 from "d3";
import { analyzeGeneaDocument } from "@/core/diagnostics/analyzer";
import { findKinship } from "@/core/graph/kinship";
import {
  consanguinityAlphaFromIntensity,
  normalizeConsanguinityIntensity
} from "@/core/graph/endogamyVisual";
import type { ActiveOverlay, ExpandedGraph, GraphDocument } from "@/types/domain";
import { createKinshipHeatmapRuntime } from "@/views/dtree-v3/overlays/kinshipHeatmapRuntime";
import type {
  DeepestAncestorSets,
  EndogamyData,
  EndogamyRole,
  FamilyOriginData,
  OverlayPrecomputedData,
  TimelineNodeSets
} from "@/views/dtree-v3/overlays/types";

function findOverlay(overlays: ActiveOverlay[], type: ActiveOverlay["type"]): ActiveOverlay | undefined {
  return overlays.find((overlay) => overlay.type === type);
}

function findLayerOverlay(overlays: ActiveOverlay[], layerId: string): ActiveOverlay | undefined {
  return overlays.find(
    (overlay) => overlay.type === "layer" && overlay.config?.layerId === layerId
  );
}

function createEmptyTimelineSets(): TimelineNodeSets {
  return {
    livingNodeIds: new Set<string>(),
    deceasedNodeIds: new Set<string>(),
    eventNodeIds: new Set<string>()
  };
}

function buildDiagnosticIssueData(
  document: GraphDocument | null,
  overlays: ActiveOverlay[]
): { issueMap: Map<string, any[]>; issueTargetIds: Set<string> } {
  const issueMap = new Map<string, any[]>();
  const issueTargetIds = new Set<string>();
  const overlay = findLayerOverlay(overlays, "layer-warnings");

  if (!document || !overlay) {
    return { issueMap, issueTargetIds };
  }

  const report = analyzeGeneaDocument(document);
  const issues = report.issues as Array<{
    severity: string;
    entityId: string;
    relatedEntityId?: string;
  }>;

  for (const issue of issues) {
    if (issue.severity !== "error" && issue.severity !== "warning") {
      continue;
    }

    issueTargetIds.add(issue.entityId);
    if (!issueMap.has(issue.entityId)) {
      issueMap.set(issue.entityId, []);
    }
    issueMap.get(issue.entityId)?.push(issue);

    if (issue.relatedEntityId) {
      issueTargetIds.add(issue.relatedEntityId);
      if (!issueMap.has(issue.relatedEntityId)) {
        issueMap.set(issue.relatedEntityId, []);
      }
      issueMap.get(issue.relatedEntityId)?.push(issue);
    }
  }

  return { issueMap, issueTargetIds };
}

function buildEndogamyData(
  document: GraphDocument | null,
  graph: ExpandedGraph,
  overlays: ActiveOverlay[]
): EndogamyData {
  const data: EndogamyData = {
    edgeColors: new Map<string, string[]>(),
    roles: new Map<string, EndogamyRole[]>()
  };

  if (!document || !findLayerOverlay(overlays, "layer-endogamy")) {
    return data;
  }

  const addRole = (nodeId: string, roleData: EndogamyRole) => {
    if (!data.roles.has(nodeId)) {
      data.roles.set(nodeId, []);
    }

    const existing = data.roles.get(nodeId)!;
    const roleKey = roleData.kinship?.relationship?.canonicalKey ?? roleData.kinship?.relationshipText;
    const alreadyExists = existing.some((entry) => {
      const existingRoleKey = entry.kinship?.relationship?.canonicalKey ?? entry.kinship?.relationshipText;
      return (
        entry.role === roleData.role
        && existingRoleKey === roleKey
        && entry.contextText === roleData.contextText
      );
    });

    if (!alreadyExists) {
      existing.push(roleData);
    }
  };

  const consanguineousFamilies = Object.values(document.families).filter((family) => {
    if (!family.husbandId || !family.wifeId) return false;
    const kinship = findKinship(document, family.husbandId, family.wifeId);
    return Boolean(kinship && kinship.sharedDnaPercentage > 0);
  });

  const registerNode = (
    canonicalId: string,
    role: EndogamyRole["role"],
    kinship: EndogamyRole["kinship"],
    color: string,
    contextText?: string
  ): Set<string> => {
    const nodeIds = new Set<string>();
    const matchingNodes = graph.nodes.filter(
      (node) => (node.canonicalId ?? node.id) === canonicalId
    );
    for (const node of matchingNodes) {
      nodeIds.add(node.id);
      addRole(node.id, { role, kinship, color, contextText });
    }
    return nodeIds;
  };

  const setEdgeColor = (edgeId: string, color: string) => {
    if (!data.edgeColors.has(edgeId)) {
      data.edgeColors.set(edgeId, []);
    }
    const values = data.edgeColors.get(edgeId)!;
    if (!values.includes(color)) {
      values.push(color);
    }
  };

  for (const family of consanguineousFamilies) {
    const kinship = findKinship(document, family.husbandId!, family.wifeId!);
    if (!kinship) continue;

    const dnaFactor = normalizeConsanguinityIntensity(kinship.sharedDnaPercentage);
    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, 0.55, 1])
      .range(["#64748b", "#f59e0b", "#dc2626"])
      .interpolate(d3.interpolateHcl);
    const baseColor = colorScale(dnaFactor);
    const withAlpha = d3.color(baseColor);
    if (withAlpha) {
      withAlpha.opacity = consanguinityAlphaFromIntensity(dnaFactor);
    }
    const caseColor = withAlpha ? withAlpha.formatRgb() : baseColor;

    const mrcas = kinship.pathPersonIds.filter((personId) => {
      const person = document.persons[personId];
      if (!person) return false;
      let hasParentInPath = false;
      for (const famcId of person.famc ?? []) {
        const fam = document.families[famcId];
        if (!fam) continue;
        const inPath =
          (fam.husbandId && kinship.pathPersonIds.includes(fam.husbandId))
          || (fam.wifeId && kinship.pathPersonIds.includes(fam.wifeId));
        if (inPath) {
          hasParentInPath = true;
          break;
        }
      }
      return !hasParentInPath;
    });

    const pathNodeIds = new Set<string>();
    const p1Label = `${document.persons[family.husbandId!]?.name ?? family.husbandId} ${document.persons[family.husbandId!]?.surname ?? ""}`.trim();
    const p2Label = `${document.persons[family.wifeId!]?.name ?? family.wifeId} ${document.persons[family.wifeId!]?.surname ?? ""}`.trim();
    const ancestorContext = `Punto de convergencia de una ramificacion recurrente entre ${p1Label} y ${p2Label}.`;

    const markNode = (canonicalId: string, role: EndogamyRole["role"], contextText?: string) => {
      const ids = registerNode(canonicalId, role, kinship, caseColor, contextText);
      for (const nodeId of ids) {
        pathNodeIds.add(nodeId);
      }
    };

    for (const ancestorId of mrcas) {
      markNode(ancestorId, "ancestor", ancestorContext);
    }
    for (const pathId of kinship.pathPersonIds) {
      if (!mrcas.includes(pathId) && pathId !== family.husbandId && pathId !== family.wifeId) {
        markNode(pathId, "path");
      }
    }
    for (const innerFamily of Object.values(document.families)) {
      const hasParentInPath =
        (innerFamily.husbandId && kinship.pathPersonIds.includes(innerFamily.husbandId))
        || (innerFamily.wifeId && kinship.pathPersonIds.includes(innerFamily.wifeId));
      const hasChildInPath = innerFamily.childrenIds.some((childId) =>
        kinship.pathPersonIds.includes(childId)
      );
      if (hasParentInPath && hasChildInPath && innerFamily.id !== family.id) {
        markNode(innerFamily.id, "path");
      }
    }
    markNode(family.husbandId!, "parent");
    markNode(family.wifeId!, "parent");
    for (const childId of family.childrenIds) {
      markNode(childId, "child");
    }
    markNode(family.id, "family");

    for (const edge of graph.edges) {
      const fromNode = graph.nodes.find((node) => node.id === edge.from);
      const toNode = graph.nodes.find((node) => node.id === edge.to);
      if (!fromNode || !toNode) continue;

      if (pathNodeIds.has(fromNode.id) && pathNodeIds.has(toNode.id)) {
        setEdgeColor(edge.id, caseColor);
        continue;
      }

      if (fromNode.type === "junction" && pathNodeIds.has(toNode.id)) {
        const feedingEdge = graph.edges.find(
          (candidate) => candidate.to === fromNode.id && pathNodeIds.has(candidate.from)
        );
        if (feedingEdge) {
          setEdgeColor(edge.id, caseColor);
          setEdgeColor(feedingEdge.id, caseColor);
          pathNodeIds.add(fromNode.id);
        }
        continue;
      }

      if (toNode.type === "junction" && pathNodeIds.has(fromNode.id)) {
        const outgoingEdge = graph.edges.find(
          (candidate) => candidate.from === toNode.id && pathNodeIds.has(candidate.to)
        );
        if (outgoingEdge) {
          setEdgeColor(edge.id, caseColor);
          setEdgeColor(outgoingEdge.id, caseColor);
          pathNodeIds.add(toNode.id);
        }
      }
    }
  }

  return data;
}

function buildFamilyOriginTarget(overlays: ActiveOverlay[]): string | null {
  const overlay = findOverlay(overlays, "origin");
  return overlay?.config?.personId ?? null;
}

function buildFamilyOriginData(
  document: GraphDocument | null,
  graph: ExpandedGraph,
  familyOriginTargetId: string | null
): FamilyOriginData {
  const empty: FamilyOriginData = {
    highlightIds: new Set<string>(),
    summary: null
  };

  if (!document || !familyOriginTargetId) {
    return empty;
  }

  const person = document.persons[familyOriginTargetId];
  if (!person) {
    return empty;
  }

  if ((person.famc?.length ?? 0) === 0) {
    return {
      highlightIds: new Set<string>([familyOriginTargetId]),
      summary: null
    };
  }

  const originFamId = person.famc[0]!;
  const originFamily = document.families[originFamId];
  if (!originFamily) {
    return empty;
  }

  const highlightIds = new Set<string>([familyOriginTargetId]);
  if (originFamily.husbandId) highlightIds.add(originFamily.husbandId);
  if (originFamily.wifeId) highlightIds.add(originFamily.wifeId);
  for (const siblingId of originFamily.childrenIds) {
    highlightIds.add(siblingId);
  }
  for (const node of graph.nodes) {
    if (node.id === originFamId || node.canonicalId === originFamId) {
      highlightIds.add(node.id);
    }
  }

  const marriageDate = originFamily.events?.find((event) => event.type === "MARR")?.date;
  const birthYears: number[] = [];
  for (const childId of originFamily.childrenIds) {
    const value = document.persons[childId]?.events.find((event) => event.type === "BIRT")?.date;
    if (!value) continue;
    const year = parseInt(value.replace(/\D/g, "").slice(0, 4), 10);
    if (Number.isFinite(year) && year > 0) {
      birthYears.push(year);
    }
  }
  for (const personId of [originFamily.husbandId, originFamily.wifeId]) {
    if (!personId) continue;
    const value = document.persons[personId]?.events.find((event) => event.type === "BIRT")?.date;
    if (!value) continue;
    const year = parseInt(value.replace(/\D/g, "").slice(0, 4), 10);
    if (Number.isFinite(year) && year > 0) {
      birthYears.push(year);
    }
  }

  const averageBirthYear =
    birthYears.length > 0
      ? Math.round(birthYears.reduce((acc, value) => acc + value, 0) / birthYears.length)
      : 0;
  const romans = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
  const century = averageBirthYear > 0 ? Math.ceil(averageBirthYear / 100) : 0;
  const era = averageBirthYear > 0 ? `S.${romans[century] ?? century} (~${averageBirthYear})` : undefined;

  const locationCounts = new Map<string, number>();
  for (const childId of originFamily.childrenIds) {
    const place = document.persons[childId]?.events.find((event) => event.type === "BIRT")?.place?.trim();
    if (place) {
      locationCounts.set(place, (locationCounts.get(place) ?? 0) + 1);
    }
  }
  if (locationCounts.size === 0) {
    for (const personId of [originFamily.husbandId, originFamily.wifeId]) {
      if (!personId) continue;
      const place = document.persons[personId]?.events.find((event) => event.type === "BIRT")?.place?.trim();
      if (place) {
        locationCounts.set(place, (locationCounts.get(place) ?? 0) + 1);
      }
    }
  }

  const location = [...locationCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];

  return {
    highlightIds,
    summary: {
      famId: originFamId,
      children: originFamily.childrenIds.length,
      marriageDate,
      era,
      location
    }
  };
}

function buildDeepestAncestorSets(
  graph: ExpandedGraph,
  overlays: ActiveOverlay[]
): DeepestAncestorSets | null {
  const overlay = findOverlay(overlays, "deepest");
  if (!overlay) {
    return null;
  }

  const config = overlay.config ?? {};
  const mapToNodeIds = (personIds: string[]): Set<string> => {
    const values = new Set<string>();
    for (const personId of personIds) {
      values.add(personId);
      for (const node of graph.nodes) {
        if (node.canonicalId === personId || node.id === personId) {
          values.add(node.id);
        }
      }
    }

    for (const node of graph.nodes) {
      if (node.type !== "family" && node.type !== "familyAlias" && node.type !== "junction") {
        continue;
      }

      const neighbors = graph.edges
        .filter((edge) => edge.from === node.id || edge.to === node.id)
        .map((edge) => (edge.from === node.id ? edge.to : edge.from));
      if (neighbors.filter((neighborId) => values.has(neighborId)).length >= 2) {
        values.add(node.id);
      }
    }

    return values;
  };

  return {
    exact: mapToNodeIds(config.exactPath ?? []),
    estimated: mapToNodeIds(config.estimatedPath ?? []),
    deepest: mapToNodeIds(config.deepestPath ?? []),
    targetId: config.targetId,
    exactEndId: config.exactId,
    estimatedEndId: config.estimatedId,
    deepestEndId: config.deepestId
  };
}

function buildTimelineNodeSets(
  graph: ExpandedGraph,
  overlays: ActiveOverlay[]
): TimelineNodeSets {
  const overlay = findOverlay(overlays, "timeline");
  if (!overlay) {
    return createEmptyTimelineSets();
  }

  const livingSet = new Set<string>(overlay.config?.livingIds ?? []);
  const deceasedSet = new Set<string>(overlay.config?.deceasedIds ?? []);
  const eventSet = new Set<string>(overlay.config?.eventPersonIds ?? []);
  const nodeSets = createEmptyTimelineSets();

  for (const node of graph.nodes) {
    if (node.type !== "person" && node.type !== "personAlias") {
      continue;
    }
    const canonicalId = node.canonicalId ?? node.id;
    if (livingSet.has(canonicalId)) nodeSets.livingNodeIds.add(node.id);
    if (deceasedSet.has(canonicalId)) nodeSets.deceasedNodeIds.add(node.id);
    if (eventSet.has(canonicalId)) nodeSets.eventNodeIds.add(node.id);
  }

  return nodeSets;
}

export function buildOverlayPrecomputedData(params: {
  overlays?: ActiveOverlay[];
  document: GraphDocument | null;
  graph: ExpandedGraph;
}): OverlayPrecomputedData {
  const overlays = params.overlays ?? [];
  const { document, graph } = params;

  const diagnostics = buildDiagnosticIssueData(document, overlays);
  const endogamyData = buildEndogamyData(document, graph, overlays);
  const familyOriginTargetId = buildFamilyOriginTarget(overlays);
  const familyOriginData = buildFamilyOriginData(document, graph, familyOriginTargetId);
  const deepestAncestorSets = buildDeepestAncestorSets(graph, overlays);
  const timelineNodeSets = buildTimelineNodeSets(graph, overlays);
  const kinshipHeatmapRuntime = document ? createKinshipHeatmapRuntime(document) : null;

  return {
    diagnosticIssues: diagnostics.issueMap,
    diagnosticIssueTargetIds: diagnostics.issueTargetIds,
    endogamyData,
    familyOriginTargetId,
    familyOriginData,
    deepestAncestorSets,
    timelineNodeSets,
    kinshipHeatmapRuntime
  };
}
