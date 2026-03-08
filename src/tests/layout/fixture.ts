import { expandGraph } from "@/core/graph/expand";
import type { GeneaDocument, ViewConfig } from "@/types/domain";
import type { LayoutEngine, LayoutInput } from "@/core/layout";

export function createLayoutFixtureDoc(): GeneaDocument {
  return {
    persons: {
      P1: { id: "P1", name: "Root", sex: "M", lifeStatus: "alive", events: [{ type: "BIRT", date: "1982" }], famc: ["F_PARENT"], fams: ["F_MAIN", "F_SECOND"], mediaRefs: [], sourceRefs: [] },
      P2: { id: "P2", name: "MainSpouse", sex: "F", lifeStatus: "alive", events: [{ type: "BIRT", date: "1984" }], famc: [], fams: ["F_MAIN"], mediaRefs: [], sourceRefs: [] },
      P3: { id: "P3", name: "SecondSpouse", sex: "F", lifeStatus: "alive", events: [{ type: "BIRT", date: "1980" }], famc: [], fams: ["F_SECOND"], mediaRefs: [], sourceRefs: [] },
      C1: { id: "C1", name: "ChildA", sex: "U", lifeStatus: "alive", events: [{ type: "BIRT", date: "2010" }], famc: ["F_MAIN"], fams: [], mediaRefs: [], sourceRefs: [] },
      C2: { id: "C2", name: "ChildB", sex: "U", lifeStatus: "alive", events: [{ type: "BIRT", date: "2008" }], famc: ["F_MAIN"], fams: [], mediaRefs: [], sourceRefs: [] },
      PF: { id: "PF", name: "Father", sex: "M", lifeStatus: "alive", events: [{ type: "BIRT", date: "1955" }], famc: ["F_PAT_PARENT"], fams: ["F_PARENT", "F_FATHER_SECOND"], mediaRefs: [], sourceRefs: [] },
      PM: { id: "PM", name: "Mother", sex: "F", lifeStatus: "alive", events: [{ type: "BIRT", date: "1958" }], famc: ["F_MAT_PARENT"], fams: ["F_PARENT"], mediaRefs: [], sourceRefs: [] },
      S1: { id: "S1", name: "SiblingOlder", sex: "U", lifeStatus: "alive", events: [{ type: "BIRT", date: "1980" }], famc: ["F_PARENT"], fams: [], mediaRefs: [], sourceRefs: [] },
      S2: { id: "S2", name: "SiblingYounger", sex: "U", lifeStatus: "alive", events: [{ type: "BIRT", date: "1985" }], famc: ["F_PARENT"], fams: [], mediaRefs: [], sourceRefs: [] },
      P6: { id: "P6", name: "FatherSecondSpouse", sex: "F", lifeStatus: "alive", events: [{ type: "BIRT", date: "1960" }], famc: [], fams: ["F_FATHER_SECOND"], mediaRefs: [], sourceRefs: [] },
      U1: { id: "U1", name: "HalfUncle", sex: "U", lifeStatus: "alive", events: [{ type: "BIRT", date: "1978" }], famc: ["F_FATHER_SECOND"], fams: [], mediaRefs: [], sourceRefs: [] },
      PFM: { id: "PFM", name: "PaternalGrandfather", sex: "M", lifeStatus: "deceased", events: [{ type: "BIRT", date: "1929" }, { type: "DEAT", date: "1999" }], famc: [], fams: ["F_PAT_PARENT"], mediaRefs: [], sourceRefs: [] },
      PFW: { id: "PFW", name: "PaternalGrandmother", sex: "F", lifeStatus: "deceased", events: [{ type: "BIRT", date: "1931" }, { type: "DEAT", date: "2008" }], famc: [], fams: ["F_PAT_PARENT"], mediaRefs: [], sourceRefs: [] },
      PUS1: { id: "PUS1", name: "PaternalUncleOlder", sex: "M", lifeStatus: "alive", events: [{ type: "BIRT", date: "1950" }], famc: ["F_PAT_PARENT"], fams: [], mediaRefs: [], sourceRefs: [] },
      PUS2: { id: "PUS2", name: "PaternalUncleYounger", sex: "M", lifeStatus: "alive", events: [{ type: "BIRT", date: "1960" }], famc: ["F_PAT_PARENT"], fams: [], mediaRefs: [], sourceRefs: [] },
      MFM: { id: "MFM", name: "MaternalGrandfather", sex: "M", lifeStatus: "deceased", events: [{ type: "BIRT", date: "1930" }, { type: "DEAT", date: "2001" }], famc: [], fams: ["F_MAT_PARENT"], mediaRefs: [], sourceRefs: [] },
      MFW: { id: "MFW", name: "MaternalGrandmother", sex: "F", lifeStatus: "deceased", events: [{ type: "BIRT", date: "1933" }, { type: "DEAT", date: "2010" }], famc: [], fams: ["F_MAT_PARENT"], mediaRefs: [], sourceRefs: [] },
      MUS1: { id: "MUS1", name: "MaternalUncleOlder", sex: "U", lifeStatus: "alive", events: [{ type: "BIRT", date: "1954" }], famc: ["F_MAT_PARENT"], fams: [], mediaRefs: [], sourceRefs: [] },
      MUS2: { id: "MUS2", name: "MaternalAuntYounger", sex: "U", lifeStatus: "alive", events: [{ type: "BIRT", date: "1962" }], famc: ["F_MAT_PARENT"], fams: [], mediaRefs: [], sourceRefs: [] }
    },
    families: {
      F_PARENT: { id: "F_PARENT", husbandId: "PF", wifeId: "PM", childrenIds: ["S1", "P1", "S2"], events: [{ type: "MARR", date: "1978" }] },
      F_MAIN: { id: "F_MAIN", husbandId: "P1", wifeId: "P2", childrenIds: ["C1", "C2"], events: [{ type: "MARR", date: "2010" }] },
      F_SECOND: { id: "F_SECOND", husbandId: "P1", wifeId: "P3", childrenIds: [], events: [{ type: "MARR", date: "1990" }] },
      F_FATHER_SECOND: { id: "F_FATHER_SECOND", husbandId: "PF", wifeId: "P6", childrenIds: ["U1"], events: [{ type: "MARR", date: "1970" }] },
      F_PAT_PARENT: { id: "F_PAT_PARENT", husbandId: "PFM", wifeId: "PFW", childrenIds: ["PUS1", "PF", "PUS2"], events: [{ type: "MARR", date: "1949" }] },
      F_MAT_PARENT: { id: "F_MAT_PARENT", husbandId: "MFM", wifeId: "MFW", childrenIds: ["MUS1", "PM", "MUS2"], events: [{ type: "MARR", date: "1952" }] }
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

export function createLayoutFixtureViewConfig(): ViewConfig {
  return {
    mode: "tree",
    preset: "extended_family",
    focusPersonId: "P1",
    focusFamilyId: null,
    homePersonId: "P1",
    rightPanelView: "details",
    timeline: {
      scope: "visible",
      view: "list",
      scaleZoom: 1,
      scaleOffset: 0
    },
    depth: {
      ancestors: 3,
      descendants: 3,
      unclesGreatUncles: 2,
      siblingsNephews: 2,
      unclesCousins: 2
    },
    showSpouses: true,
    kindra: {
      isVertical: true,
      layoutEngine: "vnext",
      collapsedNodeIds: [],
      overlays: []
    }
  };
}

export function buildLayoutInput(
  engine: LayoutEngine = "vnext",
  overrides?: Partial<LayoutInput>
): { doc: GeneaDocument; graph: ReturnType<typeof expandGraph>; input: LayoutInput } {
  const doc = createLayoutFixtureDoc();
  const viewConfig = createLayoutFixtureViewConfig();
  const graph = expandGraph(doc, viewConfig);

  const input: LayoutInput = {
    graph,
    document: doc,
    focusPersonId: "P1",
    focusFamilyId: null,
    collapsedNodeIds: [],
    isVertical: true,
    generationStep: 300,
    personNodeWidth: 190,
    personNodeHeightWithPhoto: 230,
    personNodeHeightNoPhoto: 100,
    layoutEngine: engine,
    ...overrides
  };

  return { doc, graph, input };
}

export function canonicalToVisualId(graph: ReturnType<typeof expandGraph>, canonicalId: string): string {
  const exact = graph.nodes.find((node) => node.id === canonicalId);
  if (exact) return exact.id;
  const alias = graph.nodes.find((node) => node.canonicalId === canonicalId);
  if (!alias) throw new Error(`Unable to resolve visual node for canonical ID ${canonicalId}.`);
  return alias.id;
}
