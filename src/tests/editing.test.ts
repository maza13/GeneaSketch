import { describe, expect, it } from "vitest";
import { addRelation, createNewTree, updateFamily, updatePerson } from "@/core/edit/commands";

describe("editing commands", () => {
  it("creates new tree with placeholder root", () => {
    const doc = createNewTree();
    const root = doc.persons["@I1@"];
    expect(root).toBeDefined();
    expect(root.isPlaceholder).toBe(true);
    expect(root.sex).toBe("U");
    expect(root.lifeStatus).toBe("alive");
  });

  it("updates root person and removes placeholder", () => {
    const doc = createNewTree();
    const next = updatePerson(doc, "@I1@", { name: "Root Person", isPlaceholder: false, birthDate: "1 JAN 1980" });
    expect(next.persons["@I1@"].name).toBe("Root Person");
    expect(next.persons["@I1@"].isPlaceholder).toBe(false);
  });

  it("adds relation parent and links family", () => {
    const doc = updatePerson(createNewTree(), "@I1@", { name: "Root", isPlaceholder: false });
    const rel = addRelation(doc, "@I1@", "father", { name: "Dad", sex: "M", lifeStatus: "deceased", deathDate: "1990" });
    const root = rel.next.persons["@I1@"];
    const dad = rel.next.persons[rel.personId];
    expect(dad.name).toBe("Dad");
    expect(dad.sex).toBe("M");
    expect(dad.lifeStatus).toBe("deceased");
    expect(dad.events.some((event) => event.type === "DEAT")).toBe(true);
    expect(root.famc.length).toBe(1);
    expect(Object.keys(rel.next.families).length).toBe(1);
  });

  it("updates family members and union status", () => {
    const base = updatePerson(createNewTree(), "@I1@", { name: "Root", surname: "Test", isPlaceholder: false, sex: "M" });
    const withMother = addRelation(base, "@I1@", "mother", { name: "Mom", surname: "Test", sex: "F" }).next;
    const familyId = withMother.persons["@I1@"].famc[0];

    const updated = updateFamily(withMother, familyId, {
      childrenIds: ["@I1@"],
      unionStatus: "divorced",
      marriageDate: "1 JAN 2000",
      divorceDate: "1 JAN 2010"
    });

    const family = updated.families[familyId];
    expect(family.childrenIds).toContain("@I1@");
    expect(family.events.some((event) => event.type === "MARR")).toBe(true);
    expect(family.events.some((event) => event.type === "DIV")).toBe(true);
    expect(updated.persons["@I1@"].famc).toContain(familyId);
  });
});
