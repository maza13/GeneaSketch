import { beforeEach, describe, expect, it } from "vitest";
import { createNewTree } from "@/core/edit/commands";
import { documentToGSchema } from "@/core/gschema/GedcomBridge";
import {
  clearGraphProjectionCache,
  selectFamilies,
  selectGraphStats,
  selectPersons,
  selectSearchEntries,
  selectTimelineInput,
} from "@/core/read-model";

function buildGraph() {
  const doc = createNewTree();
  doc.persons["@I1@"].name = "Root Person";
  doc.persons["@I1@"].isPlaceholder = false;
  doc.persons["@I2@"] = {
    id: "@I2@",
    name: "Second Person",
    sex: "U",
    lifeStatus: "deceased",
    events: [],
    famc: [],
    fams: ["@F1@"],
    mediaRefs: [],
    sourceRefs: [],
  };
  doc.families["@F1@"] = {
    id: "@F1@",
    husbandId: "@I1@",
    wifeId: "@I2@",
    childrenIds: [],
    events: [],
  };
  doc.persons["@I1@"].fams = ["@F1@"];
  const { graph } = documentToGSchema(doc, "7.0.x");
  return graph;
}

describe("read-model selectors", () => {
  beforeEach(() => {
    clearGraphProjectionCache();
  });

  it("builds granular selector outputs for stats/search/timeline", () => {
    const graph = buildGraph();
    const persons = selectPersons(graph);
    const families = selectFamilies(graph);
    const stats = selectGraphStats(graph);
    const search = selectSearchEntries(graph);
    const timeline = selectTimelineInput(graph);

    expect(persons).toHaveLength(2);
    expect(families).toHaveLength(1);
    expect(stats.persons).toBe(2);
    expect(stats.families).toBe(1);
    expect(stats.living).toBe(1);
    expect(stats.deceased).toBe(1);
    expect(search.some((entry) => entry.id === "@I1@" && entry.name.includes("Root"))).toBe(true);
    expect(timeline.persons).toHaveLength(2);
    expect(timeline.families).toHaveLength(1);
  });

  it("memoizes selector rows for identical graph revision", () => {
    const graph = buildGraph();
    const first = selectSearchEntries(graph);
    const second = selectSearchEntries(graph);
    expect(second).toBe(first);
  });
});

