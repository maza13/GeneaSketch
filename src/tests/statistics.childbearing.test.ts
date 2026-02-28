import { describe, expect, it } from "vitest";
import { calculateDetailedStatistics } from "@/core/graph/statistics";
import type { GeneaDocument } from "@/types/domain";

function baseDoc(): GeneaDocument {
  return {
    persons: {},
    families: {},
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

describe("statistics childbearing summary", () => {
  it("builds mixed phrase with age and year for first/last child", () => {
    const doc = baseDoc();

    doc.persons["@P1@"] = { id: "@P1@", name: "Padre", sex: "M", lifeStatus: "deceased", events: [{ type: "BIRT", date: "1882" }], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] };
    doc.persons["@C1@"] = { id: "@C1@", name: "Hijo Mayor", sex: "M", lifeStatus: "deceased", events: [{ type: "BIRT", date: "1898" }], famc: ["@F1@"], fams: [], mediaRefs: [], sourceRefs: [] };
    doc.persons["@C2@"] = { id: "@C2@", name: "Hijo Menor", sex: "F", lifeStatus: "deceased", events: [{ type: "BIRT", date: "1914" }], famc: ["@F1@"], fams: [], mediaRefs: [], sourceRefs: [] };
    doc.families["@F1@"] = { id: "@F1@", husbandId: "@P1@", wifeId: undefined, childrenIds: ["@C1@", "@C2@"], events: [] };

    const stats = calculateDetailedStatistics(doc, "@P1@");
    expect(stats.childbearingSummary).toBeDefined();
    expect(stats.childbearingSummary?.phrase).toContain("16 (1898)");
    expect(stats.childbearingSummary?.phrase).toContain("32 (1914)");
    expect(stats.childbearingSummary?.estimated).toBe(false);
  });

  it("flags estimated when dates are partial", () => {
    const doc = baseDoc();

    doc.persons["@P1@"] = { id: "@P1@", name: "Madre", sex: "F", lifeStatus: "deceased", events: [{ type: "BIRT", date: "ABT 1880" }], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] };
    doc.persons["@C1@"] = { id: "@C1@", name: "Hijo", sex: "M", lifeStatus: "alive", events: [{ type: "BIRT", date: "ABT 1901" }], famc: ["@F1@"], fams: [], mediaRefs: [], sourceRefs: [] };
    doc.families["@F1@"] = { id: "@F1@", husbandId: undefined, wifeId: "@P1@", childrenIds: ["@C1@"], events: [] };

    const stats = calculateDetailedStatistics(doc, "@P1@");
    expect(stats.childbearingSummary?.estimated).toBe(true);
    expect(stats.childbearingSummary?.phrase).toContain("Estimado");
  });

  it("returns neutral phrase when no children", () => {
    const doc = baseDoc();
    doc.persons["@P1@"] = { id: "@P1@", name: "Sin hijos", sex: "U", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] };

    const stats = calculateDetailedStatistics(doc, "@P1@");
    expect(stats.childbearingSummary?.phrase).toBe("No registra hijos.");
  });
});
