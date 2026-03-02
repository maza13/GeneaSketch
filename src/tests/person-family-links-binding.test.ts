import { describe, expect, it } from "vitest";
import { updateFamily } from "@/core/edit/commands";
import type { GeneaDocument } from "@/types/domain";

function createDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": { id: "@I1@", name: "Ana", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] },
      "@I2@": { id: "@I2@", name: "Luis", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] },
      "@I3@": { id: "@I3@", name: "Hijo", sex: "U", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
    },
    families: {
      "@F1@": { id: "@F1@", husbandId: "@I2@", wifeId: "@I1@", childrenIds: ["@I3@"], events: [] }
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

describe("person family links binding", () => {
  it("removes child FAMC relation deterministically", () => {
    const next = updateFamily(createDoc(), "@F1@", { childrenIds: [] });
    expect(next.families["@F1@"].childrenIds).toHaveLength(0);
    expect(next.persons["@I3@"].famc.includes("@F1@")).toBe(false);
  });

  it("removes spouse FAMS relation deterministically", () => {
    const next = updateFamily(createDoc(), "@F1@", { husbandId: null });
    expect(next.families["@F1@"].husbandId).toBeUndefined();
    expect(next.persons["@I2@"].fams.includes("@F1@")).toBe(false);
  });
});

