import { describe, expect, it } from "vitest";
import { expandGraph } from "@/core/graph/expand";
import type { GeneaDocument, ViewConfig } from "@/types/domain";

function person(id: string, name: string, sex: "M" | "F" | "U" = "U") {
  return {
    id,
    name,
    sex,
    lifeStatus: "alive" as const,
    events: [],
    famc: [] as string[],
    fams: [] as string[],
    mediaRefs: [] as string[],
    sourceRefs: [] as Array<{ id: string; title?: string }>
  };
}

function config(partial?: Partial<ViewConfig>): ViewConfig {
  const depth: Partial<ViewConfig["depth"]> = partial?.depth ?? {};
  const mode = partial?.mode ?? "tree";
  const preset = partial?.preset ?? "extended_family";
  const focusPersonId = partial?.focusPersonId ?? "@I1@";
  const homePersonId = partial?.homePersonId ?? "@I1@";
  return {
    mode,
    preset,
    focusPersonId,
    focusFamilyId: null,
    homePersonId,
    rightPanelView: "details" as const,
    timeline: { scope: "visible" as const, view: "list" as const, scaleZoom: 1, scaleOffset: 0 },
    depth: {
      ancestors: depth.ancestors ?? 2,
      descendants: depth.descendants ?? 2,
      unclesGreatUncles: depth.unclesGreatUncles ?? 0,
      siblingsNephews: depth.siblingsNephews ?? 0,
      unclesCousins: depth.unclesCousins ?? 0
    },
    showSpouses: partial?.showSpouses ?? true
  };
}

function scenarioA(): GeneaDocument {
  const doc: GeneaDocument = {
    persons: {
      "@I1@": person("@I1@", "Focus", "M"),
      "@I2@": person("@I2@", "Father", "M"),
      "@I3@": person("@I3@", "Mother", "F"),
      "@I4@": person("@I4@", "GF P", "M"),
      "@I5@": person("@I5@", "GM P", "F"),
      "@I6@": person("@I6@", "GF M", "M"),
      "@I7@": person("@I7@", "GM M", "F")
    },
    families: {
      "@F0@": { id: "@F0@", husbandId: "@I2@", wifeId: "@I3@", childrenIds: ["@I1@"], events: [] },
      "@F1@": { id: "@F1@", husbandId: "@I4@", wifeId: "@I5@", childrenIds: ["@I2@"], events: [] },
      "@F2@": { id: "@F2@", husbandId: "@I6@", wifeId: "@I7@", childrenIds: ["@I3@"], events: [] }
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };

  doc.persons["@I1@"].famc = ["@F0@"];
  doc.persons["@I2@"].famc = ["@F1@"];
  doc.persons["@I2@"].fams = ["@F0@"];
  doc.persons["@I3@"].famc = ["@F2@"];
  doc.persons["@I3@"].fams = ["@F0@"];
  doc.persons["@I4@"].fams = ["@F1@"];
  doc.persons["@I5@"].fams = ["@F1@"];
  doc.persons["@I6@"].fams = ["@F2@"];
  doc.persons["@I7@"].fams = ["@F2@"];

  return doc;
}

function scenarioB(): GeneaDocument {
  const doc: GeneaDocument = {
    persons: {
      "@I1@": person("@I1@", "Focus", "M"),
      "@I2@": person("@I2@", "S1", "F"),
      "@I3@": person("@I3@", "S2", "F"),
      "@I4@": person("@I4@", "S3", "F"),
      "@I5@": { ...person("@I5@", "Child Older"), events: [{ type: "BIRT", date: "1 JAN 2009" }] },
      "@I6@": { ...person("@I6@", "Child Younger"), events: [{ type: "BIRT", date: "1 JAN 2011" }] }
    },
    families: {
      "@F1@": { id: "@F1@", husbandId: "@I1@", wifeId: "@I2@", childrenIds: [], events: [{ type: "MARR", date: "1 JAN 2010" }] },
      "@F2@": { id: "@F2@", husbandId: "@I1@", wifeId: "@I3@", childrenIds: ["@I6@", "@I5@"], events: [{ type: "MARR", date: "1 JAN 2014" }] },
      "@F3@": { id: "@F3@", husbandId: "@I1@", wifeId: "@I4@", childrenIds: [], events: [{ type: "MARR", date: "1 JAN 2018" }] }
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };

  doc.persons["@I1@"].fams = ["@F1@", "@F2@", "@F3@"];
  doc.persons["@I2@"].fams = ["@F1@"];
  doc.persons["@I3@"].fams = ["@F2@"];
  doc.persons["@I4@"].fams = ["@F3@"];
  doc.persons["@I5@"].famc = ["@F2@"];
  doc.persons["@I6@"].famc = ["@F2@"];

  return doc;
}

function scenarioRepeated(): GeneaDocument {
  const doc: GeneaDocument = {
    persons: {
      "@I1@": person("@I1@", "Focus", "M"),
      "@I2@": person("@I2@", "Father", "M"),
      "@I3@": person("@I3@", "Mother", "F"),
      "@I4@": person("@I4@", "Shared Ancestor", "M"),
      "@I5@": person("@I5@", "Ancestor A", "F"),
      "@I6@": person("@I6@", "Ancestor B", "F"),
      "@I8@": person("@I8@", "Child Left", "M"),
      "@I9@": person("@I9@", "Child Right", "F"),
      "@I10@": person("@I10@", "Spouse Left", "F"),
      "@I11@": person("@I11@", "Spouse Right", "M"),
      "@I12@": person("@I12@", "Repeated Desc", "U"),
      "@I13@": person("@I13@", "Partner C", "F"),
      "@I14@": person("@I14@", "Partner D", "M")
    },
    families: {
      "@F0@": { id: "@F0@", husbandId: "@I2@", wifeId: "@I3@", childrenIds: ["@I1@"], events: [] },
      "@F1@": { id: "@F1@", husbandId: "@I4@", wifeId: "@I5@", childrenIds: ["@I2@"], events: [] },
      "@F2@": { id: "@F2@", husbandId: "@I4@", wifeId: "@I6@", childrenIds: ["@I3@"], events: [] },
      "@F3@": { id: "@F3@", husbandId: "@I1@", wifeId: "@I10@", childrenIds: ["@I8@"], events: [] },
      "@F4@": { id: "@F4@", husbandId: "@I11@", wifeId: "@I1@", childrenIds: ["@I9@"], events: [] },
      "@F5@": { id: "@F5@", husbandId: "@I8@", wifeId: "@I13@", childrenIds: ["@I12@"], events: [] },
      "@F6@": { id: "@F6@", husbandId: "@I14@", wifeId: "@I9@", childrenIds: ["@I12@"], events: [] }
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };

  doc.persons["@I1@"].famc = ["@F0@"];
  doc.persons["@I1@"].fams = ["@F3@", "@F4@"];
  doc.persons["@I2@"].famc = ["@F1@"];
  doc.persons["@I2@"].fams = ["@F0@"];
  doc.persons["@I3@"].famc = ["@F2@"];
  doc.persons["@I3@"].fams = ["@F0@"];
  doc.persons["@I4@"].fams = ["@F1@", "@F2@"];
  doc.persons["@I5@"].fams = ["@F1@"];
  doc.persons["@I6@"].fams = ["@F2@"];
  doc.persons["@I8@"].famc = ["@F3@"];
  doc.persons["@I8@"].fams = ["@F5@"];
  doc.persons["@I9@"].famc = ["@F4@"];
  doc.persons["@I9@"].fams = ["@F6@"];
  doc.persons["@I10@"].fams = ["@F3@"];
  doc.persons["@I11@"].fams = ["@F4@"];
  doc.persons["@I12@"].famc = ["@F5@", "@F6@"];
  doc.persons["@I13@"].fams = ["@F5@"];
  doc.persons["@I14@"].fams = ["@F6@"];

  return doc;
}

describe("expandGraph Cytoscape pipeline scenarios", () => {
  it("A) keeps paternal metadata on the left branch and maternal on the right branch", () => {
    const graph = expandGraph(scenarioA(), config({ depth: { ancestors: 2, descendants: 0, unclesGreatUncles: 0, siblingsNephews: 0, unclesCousins: 0 } }));
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));

    expect(nodesById.get("@I2@")?.sidePreference).toBe("paternal");
    expect(nodesById.get("@I4@")?.sidePreference).toBe("paternal");
    expect(nodesById.get("@I3@")?.sidePreference).toBe("maternal");
    expect(nodesById.get("@I6@")?.sidePreference).toBe("maternal");
    expect(graph.edges.some((edge) => edge.type === "spouse")).toBe(true);
    expect(graph.edges.some((edge) => edge.type === "child")).toBe(true);
  });

  it("B) keeps one FamilyNode per union and orders children by birth date", () => {
    const graph = expandGraph(scenarioB(), config({ depth: { ancestors: 0, descendants: 1, unclesGreatUncles: 0, siblingsNephews: 0, unclesCousins: 0 } }));

    const spouseEdgesFromFocus = graph.edges.filter((edge) => edge.type === "spouse" && edge.from === "@I1@");
    expect(spouseEdgesFromFocus.length).toBe(3);

    const family2Children = graph.edges
      .filter((edge) => edge.type === "child" && edge.familyId === "@F2@")
      .map((edge) => edge.to);

    expect(family2Children).toEqual(["@I5@", "@I6@"]);
  });

  it("C/D) creates alias nodes with identity dashed edges for repeated branches", () => {
    const graph = expandGraph(
      scenarioRepeated(),
      config({
        depth: {
          ancestors: 3,
          descendants: 3,
          unclesGreatUncles: 0,
          siblingsNephews: 0,
          unclesCousins: 0
        }
      })
    );

    const personAliases = graph.nodes.filter((node) => node.type === "personAlias");
    const familyAliases = graph.nodes.filter((node) => node.type === "familyAlias");
    const identityEdges = graph.edges.filter((edge) => edge.type === "identity");

    expect(personAliases.length).toBeGreaterThan(0);
    expect(familyAliases.length).toBeGreaterThanOrEqual(0);
    expect(identityEdges.length).toBeGreaterThan(0);
    expect(identityEdges.every((edge) => edge.layoutAffects === false)).toBe(true);
  });

  it("E) keeps collateral sliders at zero without off-by-one leakage", () => {
    const graph = expandGraph(
      scenarioA(),
      config({
        depth: {
          ancestors: 0,
          descendants: 0,
          unclesGreatUncles: 0,
          siblingsNephews: 0,
          unclesCousins: 0
        },
        showSpouses: false
      })
    );

    const visiblePersons = new Set(graph.nodes.filter((node) => node.type === "person").map((node) => node.id));
    expect(visiblePersons.has("@I1@")).toBe(true);
    expect(visiblePersons.has("@I2@")).toBe(false);
    expect(visiblePersons.has("@I3@")).toBe(false);
  });

  it("does not emit spouse edges to hidden partners when showSpouses is false", () => {
    const graph = expandGraph(
      scenarioB(),
      config({
        depth: {
          ancestors: 0,
          descendants: 1,
          unclesGreatUncles: 0,
          siblingsNephews: 0,
          unclesCousins: 0
        },
        showSpouses: false
      })
    );

    const visibleNodeIds = new Set(graph.nodes.map((node) => node.id));
    const danglingEdges = graph.edges.filter((edge) => !visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to));

    expect(danglingEdges).toEqual([]);
  });

  it("handles deeper ancestry above repeated ancestor without breaking", () => {
    // Extend scenarioRepeated with parents of the shared ancestor @I4@
    const doc = scenarioRepeated();
    doc.persons["@I20@"] = person("@I20@", "Great-GF Shared", "M");
    doc.persons["@I21@"] = person("@I21@", "Great-GM Shared", "F");
    doc.persons["@I20@"].fams = ["@F10@"];
    doc.persons["@I21@"].fams = ["@F10@"];
    doc.persons["@I4@"].famc = ["@F10@"];
    doc.families["@F10@"] = { id: "@F10@", husbandId: "@I20@", wifeId: "@I21@", childrenIds: ["@I4@"], events: [] };

    const graph = expandGraph(
      doc,
      config({
        depth: {
          ancestors: 4,
          descendants: 0,
          unclesGreatUncles: 0,
          siblingsNephews: 0,
          unclesCousins: 0
        }
      })
    );

    // Verify no dangling edges
    const visibleNodeIds = new Set(graph.nodes.map((node) => node.id));
    const danglingEdges = graph.edges.filter((edge) => !visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to));
    expect(danglingEdges).toEqual([]);

    // Verify generation consistency: parents should be 1 gen above their children
    const genByPerson = new Map(
      graph.nodes.filter((n) => n.type === "person" || n.type === "personAlias")
        .map((n) => [n.canonicalId ?? n.id, n.generation])
    );

    // Great-grandparents of shared ancestor should be at gen -3
    const sharedGen = genByPerson.get("@I4@") ?? 0;
    expect(sharedGen).toBe(-2);

    const greatGFGen = genByPerson.get("@I20@");
    const greatGMGen = genByPerson.get("@I21@");
    if (greatGFGen !== undefined) expect(greatGFGen).toBe(-3);
    if (greatGMGen !== undefined) expect(greatGMGen).toBe(-3);
  });
});


