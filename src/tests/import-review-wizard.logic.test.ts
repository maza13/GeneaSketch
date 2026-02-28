import { describe, expect, it } from "vitest";
import { hasPendingFamilyConflicts, hasPendingPersonConflicts } from "@/core/edit/mergeWorkflow";
import type { DataDiff } from "@/core/edit/diff";

function mockDiff(): DataDiff {
  return {
    persons: {
      "@I1@": {
        id: "@I1@",
        incomingId: "@X@",
        status: "modified",
        incomingPerson: { id: "@I1@", name: "A", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] },
        conflicts: {
          name: { base: "A", incoming: "B", resolution: "pending" }
        },
        eventConflicts: [],
        newEvents: []
      }
    },
    families: {
      "@F1@": {
        id: "@F1@",
        incomingId: "@Y@",
        status: "modified",
        incomingFamily: { id: "@F1@", husbandId: "@I1@", wifeId: undefined, childrenIds: [], events: [] },
        conflicts: {
          childrenConflicts: [{ childId: "@I2@", kind: "missing_in_base", resolution: "pending" }],
          eventConflicts: []
        },
        newChildrenIds: [],
        newEvents: []
      }
    },
    idRemap: { persons: { "@X@": "@I1@" }, families: { "@Y@": "@F1@" } },
    summary: { totalIncomingPersons: 1, matchedHigh: 1, ambiguous: 0, unmatched: 0, personConflicts: 1, familyConflicts: 1, estimatedRisk: 10 }
  };
}

describe("import review wizard logic", () => {
  it("detects pending person and family conflicts", () => {
    const diff = mockDiff();
    expect(hasPendingPersonConflicts(diff)).toBe(true);
    expect(hasPendingFamilyConflicts(diff)).toBe(true);
  });
});
