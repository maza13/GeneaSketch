import { describe, expect, it } from "vitest";
import { calculateDiff } from "@/core/edit/diff";
import type { GeneaDocument } from "@/types/domain";

function docBase(): GeneaDocument {
  return {
    persons: {
      "@I1@": { id: "@I1@", name: "Base One", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
    },
    families: {
      "@F1@": { id: "@F1@", husbandId: "@I1@", wifeId: undefined, childrenIds: [], events: [] }
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

describe("merge id remap", () => {
  it("renames colliding incoming person/family ids when not matched", () => {
    const base = docBase();
    const incoming: GeneaDocument = {
      persons: {
        "@I1@": { id: "@I1@", name: "Incoming Other", sex: "F", lifeStatus: "alive", events: [], famc: ["@F1@"], fams: [], mediaRefs: [], sourceRefs: [] }
      },
      families: {
        "@F1@": { id: "@F1@", husbandId: undefined, wifeId: "@I1@", childrenIds: [], events: [] }
      },
      media: {},
      metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
    };

    const diff = calculateDiff(base, incoming, new Map());

    expect(diff.idRemap.persons["@I1@"]).not.toBe("@I1@");
    expect(diff.idRemap.families["@F1@"]).not.toBe("@F1@");
  });
});
