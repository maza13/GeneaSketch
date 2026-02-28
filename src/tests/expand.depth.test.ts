import { describe, expect, it } from "vitest";
import { expandGraph } from "@/core/graph/expand";
import type { GeneaDocument, ViewConfig } from "@/types/domain";

function createDepthFixture(): GeneaDocument {
  return {
    persons: {
      "@I1@": { id: "@I1@", name: "Focus", sex: "M", lifeStatus: "alive", events: [], famc: ["@F0@"], fams: [], mediaRefs: [], sourceRefs: [] },
      "@I2@": { id: "@I2@", name: "Father", sex: "M", lifeStatus: "alive", events: [], famc: ["@F2@"], fams: ["@F0@"], mediaRefs: [], sourceRefs: [] },
      "@I3@": { id: "@I3@", name: "Mother", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: ["@F0@"], mediaRefs: [], sourceRefs: [] },
      "@I4@": { id: "@I4@", name: "Sibling", sex: "U", lifeStatus: "alive", events: [], famc: ["@F0@"], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
      "@I5@": { id: "@I5@", name: "Nephew", sex: "U", lifeStatus: "alive", events: [], famc: ["@F1@"], fams: ["@F4@"], mediaRefs: [], sourceRefs: [] },
      "@I6@": { id: "@I6@", name: "SiblingSpouse", sex: "U", lifeStatus: "alive", events: [], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
      "@I7@": { id: "@I7@", name: "Uncle", sex: "M", lifeStatus: "alive", events: [], famc: ["@F2@"], fams: ["@F3@"], mediaRefs: [], sourceRefs: [] },
      "@I8@": { id: "@I8@", name: "Grandfather", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: ["@F2@"], mediaRefs: [], sourceRefs: [] },
      "@I9@": { id: "@I9@", name: "Grandmother", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: ["@F2@"], mediaRefs: [], sourceRefs: [] },
      "@I10@": { id: "@I10@", name: "Cousin", sex: "U", lifeStatus: "alive", events: [], famc: ["@F3@"], fams: [], mediaRefs: [], sourceRefs: [] },
      "@I11@": { id: "@I11@", name: "UncleSpouse", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: ["@F3@"], mediaRefs: [], sourceRefs: [] },
      "@I12@": { id: "@I12@", name: "GrandNephew", sex: "U", lifeStatus: "alive", events: [], famc: ["@F4@"], fams: [], mediaRefs: [], sourceRefs: [] },
      "@I13@": { id: "@I13@", name: "NephewSpouse", sex: "U", lifeStatus: "alive", events: [], famc: [], fams: ["@F4@"], mediaRefs: [], sourceRefs: [] }
    },
    families: {
      "@F0@": { id: "@F0@", husbandId: "@I2@", wifeId: "@I3@", childrenIds: ["@I1@", "@I4@"], events: [] },
      "@F1@": { id: "@F1@", husbandId: "@I4@", wifeId: "@I6@", childrenIds: ["@I5@"], events: [] },
      "@F2@": { id: "@F2@", husbandId: "@I8@", wifeId: "@I9@", childrenIds: ["@I2@", "@I7@"], events: [] },
      "@F3@": { id: "@F3@", husbandId: "@I7@", wifeId: "@I11@", childrenIds: ["@I10@"], events: [] },
      "@F4@": { id: "@F4@", husbandId: "@I5@", wifeId: "@I13@", childrenIds: ["@I12@"], events: [] }
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

function createConfig(depth: Partial<ViewConfig["depth"]>): ViewConfig {
  return {
    mode: "tree",
    preset: "extended_family",
    focusPersonId: "@I1@",
    focusFamilyId: null,
    homePersonId: "@I1@",
    rightPanelView: "details" as const,
    timeline: { scope: "visible" as const, view: "list" as const, scaleZoom: 1, scaleOffset: 0 },
    depth: {
      ancestors: 0,
      descendants: 0,
      unclesGreatUncles: depth.unclesGreatUncles ?? 0,
      siblingsNephews: depth.siblingsNephews ?? 0,
      unclesCousins: depth.unclesCousins ?? 0
    },
    showSpouses: false
  };
}

function visiblePersonIds(config: ViewConfig): Set<string> {
  const graph = expandGraph(createDepthFixture(), config);
  return new Set(graph.nodes.filter((node) => node.type === "person").map((node) => node.id));
}

describe("expandGraph collateral depths", () => {
  it("unclesGreatUncles=0 shows zero uncles", () => {
    const visible = visiblePersonIds(createConfig({ unclesGreatUncles: 0 }));
    expect(visible.has("@I7@")).toBe(false);
  });

  it("siblingsNephews=0 shows zero siblings/nephews", () => {
    const visible = visiblePersonIds(createConfig({ siblingsNephews: 0 }));
    expect(visible.has("@I4@")).toBe(false);
    expect(visible.has("@I5@")).toBe(false);
  });

  it("unclesCousins=0 shows zero uncles/cousins", () => {
    const visible = visiblePersonIds(createConfig({ unclesCousins: 0 }));
    expect(visible.has("@I7@")).toBe(false);
    expect(visible.has("@I10@")).toBe(false);
  });

  it("siblingsNephews=1 includes only first layer (siblings)", () => {
    const visible = visiblePersonIds(createConfig({ siblingsNephews: 1 }));
    expect(visible.has("@I4@")).toBe(true);
    expect(visible.has("@I5@")).toBe(false);
    expect(visible.has("@I12@")).toBe(false);
  });

  it("siblingsNephews=2 includes siblings and nephews only", () => {
    const visible = visiblePersonIds(createConfig({ siblingsNephews: 2 }));
    expect(visible.has("@I4@")).toBe(true);
    expect(visible.has("@I5@")).toBe(true);
    expect(visible.has("@I12@")).toBe(false);
  });

  it("siblingsNephews=3 includes deeper descendants from sibling branch", () => {
    const visible = visiblePersonIds(createConfig({ siblingsNephews: 3 }));
    expect(visible.has("@I4@")).toBe(true);
    expect(visible.has("@I5@")).toBe(true);
    expect(visible.has("@I12@")).toBe(true);
  });

  it("unclesCousins=1 includes only first layer (uncles)", () => {
    const visible = visiblePersonIds(createConfig({ unclesCousins: 1 }));
    expect(visible.has("@I7@")).toBe(true);
    expect(visible.has("@I10@")).toBe(false);
  });
});

