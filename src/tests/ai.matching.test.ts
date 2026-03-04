import { describe, expect, it } from "vitest";
import { resolvePersonId } from "@/core/ai/matching";
import type { GeneaDocument } from "@/types/domain";

function sampleDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": { id: "@I1@", name: "Leon Abel", surname: "Nunez Iniguez", sex: "M", lifeStatus: "alive", events: [{ type: "BIRT", date: "1940" }], famc: [], fams: [], mediaRefs: [], sourceRefs: [] },
      "@I2@": { id: "@I2@", name: "Juan Abel", surname: "Nunez Saucedo", sex: "M", lifeStatus: "alive", events: [{ type: "BIRT", date: "1971" }], famc: [], fams: [], mediaRefs: [], sourceRefs: [] },
      "@I3@": { id: "@I3@", name: "A Mendoza", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
    },
    families: {},
    media: {},
    metadata: { sourceFormat: "GSK", gedVersion: "7.0.x" }
  };
}

describe("ai matching", () => {
  it("resolves explicit id when present", () => {
    const resolved = resolvePersonId(sampleDoc(), "@I2@", "Juan Abel");
    expect(resolved.id).toBe("@I2@");
  });

  it("returns null id and ranked candidates for ambiguous query", () => {
    const resolved = resolvePersonId(sampleDoc(), undefined, "Abel Nunez");
    expect(resolved.id).toBeNull();
    expect(resolved.candidates.length).toBeGreaterThan(1);
    expect(resolved.candidates[0].score).toBeGreaterThan(0);
  });
});


