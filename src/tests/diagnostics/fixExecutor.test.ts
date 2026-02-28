import { describe, expect, it } from "vitest";
import type { GeneaDocument } from "@/types/domain";
import { applyDiagnosticFixes } from "@/core/diagnostics/fixExecutor";

function makeDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": {
        id: "@I1@",
        name: "Padre",
        sex: "M",
        lifeStatus: "alive",
        events: [{ type: "BIRT", date: "1900" }, { type: "BIRT", date: "1898" }],
        famc: [],
        fams: ["@F1@"],
        mediaRefs: [],
        sourceRefs: []
      },
      "@I2@": {
        id: "@I2@",
        name: "Hijo",
        sex: "U",
        lifeStatus: "alive",
        events: [{ type: "BIRT", date: "1925" }],
        famc: [],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      }
    },
    families: {
      "@F1@": {
        id: "@F1@",
        husbandId: "@I1@",
        wifeId: undefined,
        childrenIds: ["@I2@"],
        events: []
      }
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

describe("diagnostics fix executor", () => {
  it("syncs child famc with family children", () => {
    const doc = makeDoc();
    const { nextDoc } = applyDiagnosticFixes(doc, [
      { kind: "add_family_to_person_role", personId: "@I2@", familyId: "@F1@", role: "famc" }
    ]);

    expect(nextDoc.persons["@I2@"].famc).toContain("@F1@");
    expect(nextDoc.families["@F1@"].childrenIds).toContain("@I2@");
  });

  it("keeps earliest birth event when trimming BIRT", () => {
    const doc = makeDoc();
    const { nextDoc } = applyDiagnosticFixes(doc, [
      { kind: "trim_person_birth_events", personId: "@I1@", keep: "earliest" }
    ]);

    const births = nextDoc.persons["@I1@"].events.filter((event) => event.type === "BIRT");
    expect(births.length).toBe(1);
    expect(births[0].date).toBe("1898");
  });

  it("marks person deceased and ensures DEAT", () => {
    const doc = makeDoc();
    const { nextDoc } = applyDiagnosticFixes(doc, [{ kind: "mark_person_deceased", personId: "@I2@" }]);

    expect(nextDoc.persons["@I2@"].lifeStatus).toBe("deceased");
    expect(nextDoc.persons["@I2@"].events.some((event) => event.type === "DEAT")).toBe(true);
  });
});
