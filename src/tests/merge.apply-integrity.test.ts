import { describe, expect, it } from "vitest";
import { calculateDiff } from "@/core/edit/diff";
import { applyDiff } from "@/core/edit/merge";
import type { GeneaDocument } from "@/types/domain";

describe("merge apply integrity", () => {
  it("rebuilds famc/fams pointers consistently after merge", () => {
    const base: GeneaDocument = {
      persons: {
        "@I1@": { id: "@I1@", name: "Parent", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] },
        "@I2@": { id: "@I2@", name: "Child", sex: "U", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
      },
      families: {},
      media: {},
      metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
    };

    const incoming: GeneaDocument = {
      persons: {
        "@I1@": { id: "@I1@", name: "Parent", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
        "@I2@": { id: "@I2@", name: "Child", sex: "U", lifeStatus: "alive", events: [], famc: ["@F1@"], fams: [], mediaRefs: [], sourceRefs: [] }
      },
      families: {
        "@F1@": { id: "@F1@", husbandId: "@I1@", wifeId: undefined, childrenIds: ["@I2@"], events: [] }
      },
      media: {},
      metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
    };

    const diff = calculateDiff(base, incoming, new Map([["@I1@", "@I1@"], ["@I2@", "@I2@"]]));
    const { merged } = applyDiff(base, diff);

    const familyId = Object.keys(merged.families)[0];
    expect(merged.persons["@I1@"].fams).toContain(familyId);
    expect(merged.persons["@I2@"].famc).toContain(familyId);
    expect(merged.families[familyId].childrenIds).toContain("@I2@");
  });
});
