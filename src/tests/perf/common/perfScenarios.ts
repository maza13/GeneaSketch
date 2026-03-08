import { expandGraph } from "@/core/graph/expand";
import type { LayoutInput } from "@/core/layout";
import { TreeGenerator } from "@/core/testing/generator";
import {
  createLayoutFixtureDoc,
  createLayoutFixtureViewConfig
} from "@/tests/layout/fixture";
import type { ColorThemeConfig } from "@/types/editor";
import type { ExpandedGraph, GraphDocument, ViewConfig } from "@/types/domain";

export type PerfScenarioId =
  | "S1_layout_fixture"
  | "S2_standard_tree"
  | "S3_endogamy_tree";

export type PerfScenario = {
  id: PerfScenarioId;
  document: GraphDocument;
  graph: ExpandedGraph;
  focusPersonId: string;
  timelineYear: number;
};

export type OverlayPerfTargets = {
  kinshipPair: [string, string];
  heatmapBaseId: string;
  heatmapTargets: string[];
  lineagePersonId: string;
};

const TIMELINE_YEAR = 1990;

const DEFAULT_COLOR_THEME: ColorThemeConfig = {
  background: "#0f172a",
  personNode: "#1e293b",
  text: "#e2e8f0",
  edges: "#64748b",
  nodeFontSize: 14,
  edgeThickness: 1.4,
  nodeWidth: 220,
  nodeHeight: 100
};

function getFirstPersonId(document: GraphDocument): string {
  const firstPersonId = Object.keys(document.persons)[0];
  if (!firstPersonId) {
    throw new Error("Unable to build perf scenario: document has no persons.");
  }
  return firstPersonId;
}

function buildViewConfig(focusPersonId: string): ViewConfig {
  const fixture = createLayoutFixtureViewConfig();
  const fixtureKindra = fixture.kindra ?? {
    isVertical: true,
    layoutEngine: "vnext" as const,
    collapsedNodeIds: [],
    overlays: []
  };
  return {
    ...fixture,
    focusPersonId,
    homePersonId: focusPersonId,
    kindra: {
      isVertical: fixtureKindra.isVertical,
      layoutEngine: "vnext",
      collapsedNodeIds: [...fixtureKindra.collapsedNodeIds],
      overlays: []
    }
  };
}

function buildScenario(id: PerfScenarioId, document: GraphDocument, focusPersonId: string): PerfScenario {
  const viewConfig = buildViewConfig(focusPersonId);
  const graph = expandGraph(document, viewConfig);
  return {
    id,
    document,
    graph,
    focusPersonId,
    timelineYear: TIMELINE_YEAR
  };
}

export function createPerfScenarios(): PerfScenario[] {
  const fixtureDoc = createLayoutFixtureDoc();
  const fixtureFocus = createLayoutFixtureViewConfig().focusPersonId ?? getFirstPersonId(fixtureDoc);

  const standardDoc = new TreeGenerator({ seed: "phase0-standard" }).generateStandard(8, 3);
  const standardFocus = getFirstPersonId(standardDoc);

  const endogamyDoc = new TreeGenerator({ seed: "phase0-endogamy" }).generateEndogamy(14, 5);
  const endogamyFocus = getFirstPersonId(endogamyDoc);

  return [
    buildScenario("S1_layout_fixture", fixtureDoc, fixtureFocus),
    buildScenario("S2_standard_tree", standardDoc, standardFocus),
    buildScenario("S3_endogamy_tree", endogamyDoc, endogamyFocus)
  ];
}

export function buildLayoutInputForScenario(scenario: PerfScenario): LayoutInput {
  return {
    graph: scenario.graph,
    document: scenario.document,
    focusPersonId: scenario.focusPersonId,
    focusFamilyId: null,
    collapsedNodeIds: [],
    isVertical: true,
    generationStep: 300,
    personNodeWidth: 190,
    personNodeHeightWithPhoto: 230,
    personNodeHeightNoPhoto: 100,
    layoutEngine: "vnext"
  };
}

export function getColorThemeForPerf(): ColorThemeConfig {
  return DEFAULT_COLOR_THEME;
}

export function selectOverlayPerfTargets(document: GraphDocument): OverlayPerfTargets {
  const personIds = Object.keys(document.persons);
  if (personIds.length < 2) {
    throw new Error("Unable to select overlay perf targets: document has fewer than 2 persons.");
  }

  let kinshipPair: [string, string] | null = null;
  for (const family of Object.values(document.families)) {
    if (family.husbandId && family.wifeId) {
      kinshipPair = [family.husbandId, family.wifeId];
      break;
    }
  }

  if (!kinshipPair) {
    kinshipPair = [personIds[0]!, personIds[1]!];
  }

  const lineagePerson =
    personIds.find((id) => document.persons[id]?.sex === "M")
    ?? personIds[0]!;

  const heatmapBaseId = kinshipPair[0];
  const heatmapTargets = Array.from(
    new Set(
      [
        kinshipPair[1],
        personIds[0],
        personIds[1],
        personIds[2]
      ].filter((id): id is string => Boolean(id) && id !== heatmapBaseId)
    )
  ).slice(0, 3);

  if (heatmapTargets.length === 0) {
    heatmapTargets.push(kinshipPair[1]);
  }

  return {
    kinshipPair,
    heatmapBaseId,
    heatmapTargets,
    lineagePersonId: lineagePerson
  };
}
