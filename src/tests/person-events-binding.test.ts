import { describe, expect, it } from "vitest";
import { updatePerson } from "@/core/edit/commands";
import type { GeneaDocument } from "@/types/domain";

function createDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": {
        id: "@I1@",
        name: "Juan",
        sex: "M",
        lifeStatus: "alive",
        events: [],
        famc: [],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      }
    },
    families: {},
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

describe("person events binding", () => {
  it("keeps birth/death legacy fields synced from canonical events", () => {
    const next = updatePerson(createDoc(), "@I1@", {
      events: [
        { id: "evt-1", type: "BIRT", date: "1989", place: "CDMX" },
        { id: "evt-2", type: "DEAT", date: "2020", place: "Puebla" }
      ]
    });

    const person = next.persons["@I1@"];
    expect(person.birthDate).toBe("1989");
    expect(person.birthPlace).toBe("CDMX");
    expect(person.deathDate).toBe("2020");
    expect(person.deathPlace).toBe("Puebla");
    expect(person.lifeStatus).toBe("deceased");
  });
});

