import { describe, expect, it } from "vitest";
import { splitPersonFamilies } from "@/ui/person/sections/PersonFamiliesSection";
import type { GeneaDocument } from "@/types/domain";

function doc(): GeneaDocument {
  return {
    persons: {
      "@I1@": { id: "@I1@", name: "Ana", sex: "F", lifeStatus: "alive", events: [], famc: ["@F1@"], fams: ["@F2@"], mediaRefs: [], sourceRefs: [] }
    },
    families: {
      "@F1@": { id: "@F1@", husbandId: "@I9@", wifeId: "@I8@", childrenIds: ["@I1@"], events: [] },
      "@F2@": { id: "@F2@", husbandId: "@I7@", wifeId: "@I1@", childrenIds: [], events: [] }
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

describe("person families section split", () => {
  it("returns origin and own families separated", () => {
    const result = splitPersonFamilies("@I1@", doc());
    expect(result.originFamilies.map((f) => f.id)).toEqual(["@F1@"]);
    expect(result.ownFamilies.map((f) => f.id)).toEqual(["@F2@"]);
  });
});
