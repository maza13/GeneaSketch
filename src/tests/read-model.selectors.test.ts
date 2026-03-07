import { beforeEach, describe, expect, it } from "vitest";
import { createNewTree } from "@/core/edit/commands";
import { documentToGSchema } from "@/core/gschema/GedcomBridge";
import { GSchemaGraph } from "@/core/gschema/GSchemaGraph";
import {
  clearGraphProjectionCache,
  projectGraphDocument,
  projectLegacyGraphDocument,
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

  it("invalidates projection cache when journalLength changes after note update", () => {
    const graph = buildGraph();
    graph.addNode({
      type: "Note",
      uid: "note-cache-1",
      text: "before",
      deleted: false,
    } as import("@/core/gschema/types").NoteNode);

    const first = projectGraphDocument(graph);
    const second = projectGraphDocument(graph);
    expect(second).toBe(first);

    const beforeLen = graph.journalLength;
    const ok = graph.updateNoteText("note-cache-1", "after");
    expect(ok).toBe(true);
    expect(graph.journalLength).toBe(beforeLen + 1);

    const third = projectGraphDocument(graph);
    expect(third).not.toBe(second);
  });

  it("keeps functional parity between direct mainline and legacy compatibility projection for core outputs", () => {
    const graph = buildGraph();

    const directPersons = selectPersons(graph);
    const directFamilies = selectFamilies(graph);
    const directStats = selectGraphStats(graph);

    const legacyDoc = projectLegacyGraphDocument(graph);
    const legacyPersons = Object.values(legacyDoc?.persons || {});
    const legacyFamilies = Object.values(legacyDoc?.families || {});
    const legacyStats = {
      persons: legacyPersons.length,
      families: legacyFamilies.length,
      living: legacyPersons.filter((person) => person.lifeStatus === "alive").length,
      deceased: legacyPersons.filter((person) => person.lifeStatus !== "alive").length,
    };

    expect(directPersons).toHaveLength(legacyPersons.length);
    expect(directFamilies).toHaveLength(legacyFamilies.length);
    expect(directStats).toStrictEqual(legacyStats);
  });

  it("keeps legacy compatibility behind an explicit side edge instead of the mainline selector", () => {
    const graph = buildGraph();
    const directDoc = projectGraphDocument(graph);
    const legacyDoc = projectLegacyGraphDocument(graph);

    expect(legacyDoc).not.toBeNull();
    expect(directDoc).not.toBe(legacyDoc);
    expect(Object.keys(legacyDoc?.persons || {}).length).toBe(Object.keys(directDoc?.persons || {}).length);
  });

  it("uses shared synthetic xref fallback when xref is missing in direct projection", () => {
    const graph = GSchemaGraph.create();
    graph.addPersonNode({ uid: "p-no-xref", type: "Person", sex: "F", isLiving: true });

    const persons = selectPersons(graph);
    const person = persons.find((entry) => entry.id === "IPNOXRE");
    const doc = projectGraphDocument(graph);

    expect(person).toBeDefined();
    expect(doc?.uidToXref?.["p-no-xref"]).toBe("IPNOXRE");
    expect(doc?.xrefToUid?.["IPNOXRE"]).toBe("p-no-xref");
  });
});

