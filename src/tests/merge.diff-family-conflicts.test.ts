import { describe, expect, it } from "vitest";
import { calculateDiff } from "@/core/edit/diff";
import type { GeneaDocument } from "@/types/domain";

describe("merge family conflicts", () => {
  it("detects spouse/children/event conflicts in existing family", () => {
    const base: GeneaDocument = {
      persons: {
        "@I1@": { id: "@I1@", name: "A", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
        "@I2@": { id: "@I2@", name: "B", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
        "@I3@": { id: "@I3@", name: "C", sex: "M", lifeStatus: "alive", events: [], famc: ["@F1@"], fams: [], mediaRefs: [], sourceRefs: [] }
      },
      families: {
        "@F1@": { id: "@F1@", husbandId: "@I1@", wifeId: "@I2@", childrenIds: ["@I3@"], events: [{ type: "MARR", date: "1920" }] }
      },
      media: {},
      metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
    };

    const incoming: GeneaDocument = {
      persons: {
        "@I1@": { id: "@I1@", name: "A", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
        "@I4@": { id: "@I4@", name: "New Wife", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
        "@I5@": { id: "@I5@", name: "New Child", sex: "U", lifeStatus: "alive", events: [], famc: ["@F1@"], fams: [], mediaRefs: [], sourceRefs: [] }
      },
      families: {
        "@F1@": { id: "@F1@", husbandId: "@I1@", wifeId: "@I4@", childrenIds: ["@I5@"], events: [{ type: "MARR", date: "1921" }] }
      },
      media: {},
      metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
    };

    const diff = calculateDiff(base, incoming, new Map([["@I1@", "@I1@"]]));
    const familyDiff = Object.values(diff.families)[0];

    expect(familyDiff.status).toBe("modified");
    expect(familyDiff.conflicts.wifeId).toBeDefined();
    expect(familyDiff.conflicts.childrenConflicts.length).toBeGreaterThan(0);
    expect(familyDiff.conflicts.eventConflicts.length).toBe(1);
  });
});
