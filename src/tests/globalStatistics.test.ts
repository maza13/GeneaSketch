import { describe, expect, it } from "vitest";
import type { GeneaDocument } from "@/types/domain";
import { calculateGlobalStatistics } from "@/core/graph/globalStatistics";

function fixture(): GeneaDocument {
  return {
    persons: {
      "@I1@": { id: "@I1@", name: "Ana", surname: "Lopez", sex: "F", lifeStatus: "deceased", events: [{ type: "BIRT", date: "1880" }, { type: "DEAT", date: "1945" }], famc: [], fams: ["@F1@"], mediaRefs: ["@M1@"], sourceRefs: [] },
      "@I2@": { id: "@I2@", name: "Juan", surname: "Lopez", sex: "M", lifeStatus: "deceased", events: [{ type: "BIRT", date: "1878" }, { type: "DEAT", date: "1950" }], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
      "@I3@": { id: "@I3@", name: "Hijo", surname: "Lopez", sex: "M", lifeStatus: "alive", events: [{ type: "BIRT", date: "1905" }], famc: ["@F1@"], fams: [], mediaRefs: [], sourceRefs: [] },
      "@I4@": { id: "@I4@", name: "(Sin nombre)", sex: "U", lifeStatus: "alive", isPlaceholder: true, events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
    },
    families: {
      "@F1@": { id: "@F1@", husbandId: "@I2@", wifeId: "@I1@", childrenIds: ["@I3@"], events: [{ type: "MARR", date: "1900" }] }
    },
    media: {
      "@M1@": { id: "@M1@", fileName: "a.jpg" }
    },
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

describe("global statistics", () => {
  it("computes full tree aggregates", () => {
    const stats = calculateGlobalStatistics(fixture());
    expect(stats.totals.persons).toBe(4);
    expect(stats.totals.families).toBe(1);
    expect(stats.demographics.sex.F).toBe(1);
    expect(stats.demographics.sex.M).toBe(2);
    expect(stats.coverage.placeholders).toBe(1);
    expect(stats.chronology.earliestBirth).toBe(1878);
    expect(stats.surnamesTop[0].surname).toBe("LOPEZ");
  });

  it("supports visible scope", () => {
    const stats = calculateGlobalStatistics(fixture(), "visible", ["@I1@", "@I2@"]);
    expect(stats.totals.persons).toBe(2);
    expect(stats.totals.families).toBe(1);
    expect(stats.coverage.placeholders).toBe(0);
  });
});
