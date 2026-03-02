import { describe, expect, it } from "vitest";
import { collectBirthEstimationFacts } from "@/core/inference/factCollector";
import type { GeneaDocument } from "@/types/domain";

function createDoc(): GeneaDocument {
  return {
    persons: {},
    families: {},
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "5.5.1" }
  };
}

describe("collectBirthEstimationFacts", () => {
  it("marks non-biological PEDI links", () => {
    const doc = createDoc();
    doc.persons["@P1@"] = {
      id: "@P1@",
      name: "Foco",
      sex: "M",
      lifeStatus: "alive",
      events: [],
      famc: ["@F1@"],
      famcLinks: [{ familyId: "@F1@", pedi: "ADOPTED", reference: "line:10" }],
      fams: [],
      mediaRefs: [],
      sourceRefs: []
    };
    doc.persons["@P2@"] = {
      id: "@P2@",
      name: "Padre",
      sex: "M",
      lifeStatus: "deceased",
      events: [{ type: "BIRT", date: "1900" }],
      famc: [],
      fams: ["@F1@"],
      mediaRefs: [],
      sourceRefs: []
    };
    doc.persons["@P3@"] = {
      id: "@P3@",
      name: "Madre",
      sex: "F",
      lifeStatus: "deceased",
      events: [{ type: "BIRT", date: "1905" }],
      famc: [],
      fams: ["@F1@"],
      mediaRefs: [],
      sourceRefs: []
    };
    doc.families["@F1@"] = { id: "@F1@", husbandId: "@P2@", wifeId: "@P3@", childrenIds: ["@P1@"], events: [] };

    const facts = collectBirthEstimationFacts(doc, "@P1@");
    const parentFacts = facts.filter((f) => f.relationToFocus === "parent");
    expect(parentFacts.length).toBeGreaterThan(0);
    expect(parentFacts.every((f) => (f.flags || []).includes("non_biological_link"))).toBe(true);
  });

  it("never includes focus birth facts", () => {
    const doc = createDoc();
    doc.persons["@P1@"] = {
      id: "@P1@",
      name: "Foco",
      sex: "M",
      lifeStatus: "alive",
      birthDate: "1930",
      events: [{ type: "BIRT", date: "1930" }, { type: "DEAT", date: "1990" }],
      famc: [],
      fams: [],
      mediaRefs: [],
      sourceRefs: []
    };

    const facts = collectBirthEstimationFacts(doc, "@P1@");
    expect(facts.some((fact) => fact.relationToFocus === "focus" && fact.eventTag === "BIRT")).toBe(false);
    expect(facts.some((fact) => fact.relationToFocus === "focus" && fact.eventTag === "DEAT")).toBe(true);
  });
});
