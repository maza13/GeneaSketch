import { describe, expect, it } from "vitest";
import { createNewTree, updatePerson } from "@/core/edit/commands";

describe("person rawTags NOTE handling", () => {
  it("notesAppend creates NOTE when missing", () => {
    const doc = createNewTree();
    const next = updatePerson(doc, "@I1@", { notesAppend: ["nota 1"] });
    expect(next.persons["@I1@"].rawTags?.NOTE).toEqual(["nota 1"]);
  });

  it("notesAppend preserves existing NOTE entries", () => {
    const doc = createNewTree();
    const base = updatePerson(doc, "@I1@", { notesReplace: ["base"] });
    const next = updatePerson(base, "@I1@", { notesAppend: ["nueva"] });
    expect(next.persons["@I1@"].rawTags?.NOTE).toEqual(["base", "nueva"]);
  });

  it("notesReplace overwrites NOTE entries", () => {
    const doc = createNewTree();
    const base = updatePerson(doc, "@I1@", { notesAppend: ["x", "y"] });
    const next = updatePerson(base, "@I1@", { notesReplace: ["final"] });
    expect(next.persons["@I1@"].rawTags?.NOTE).toEqual(["final"]);
  });
});
