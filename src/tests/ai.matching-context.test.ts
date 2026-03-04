import { describe, expect, it } from "vitest";
import { rankPersonCandidatesWithContext, resolvePersonMatch } from "@/core/ai/matching";
import type { GeneaDocument } from "@/types/domain";

function buildDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": { id: "@I1@", name: "Juan Jesus", surname: "Nunez Mendoza", sex: "M", lifeStatus: "alive", events: [{ type: "BIRT", date: "1990" }], famc: [], fams: [], mediaRefs: [], sourceRefs: [] },
      "@I2@": { id: "@I2@", name: "Juan", surname: "Nunez", sex: "M", lifeStatus: "deceased", events: [{ type: "BIRT", date: "1940" }, { type: "DEAT", date: "1999" }], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
    },
    families: {},
    media: {},
    metadata: { sourceFormat: "GSK", gedVersion: "7.0.x" }
  };
}

describe("ai matching context", () => {
  it("prefers temporally coherent person for modern event", () => {
    const ranked = rankPersonCandidatesWithContext(buildDoc(), "Juan Jesus Nunez", {
      eventYear: 2019,
      relationToAnchor: "spouse"
    });
    expect(ranked[0]?.id).toBe("@I1@");
    const match = resolvePersonMatch(buildDoc(), undefined, "Juan Jesus Nunez", {
      eventYear: 2019,
      relationToAnchor: "spouse"
    });
    expect(match.candidates[0]?.id).toBe("@I1@");
  });
});

