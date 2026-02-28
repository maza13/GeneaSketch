import { describe, expect, it } from "vitest";
import { calculateDiff } from "@/core/edit/diff";
import type { GeneaDocument } from "@/types/domain";

describe("merge person event conflicts", () => {
  it("detects conflicting events by same type with divergent values", () => {
    const base: GeneaDocument = {
      persons: {
        "@I1@": { id: "@I1@", name: "Ana", sex: "F", lifeStatus: "alive", events: [{ type: "BIRT", date: "1900", place: "Madrid" }], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
      },
      families: {},
      media: {},
      metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
    };

    const incoming: GeneaDocument = {
      persons: {
        "@X@": { id: "@X@", name: "Ana", sex: "F", lifeStatus: "alive", events: [{ type: "BIRT", date: "1901", place: "Sevilla" }], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
      },
      families: {},
      media: {},
      metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
    };

    const diff = calculateDiff(base, incoming, new Map([["@X@", "@I1@"]]));
    const p = diff.persons["@I1@"];

    expect(p.status).toBe("modified");
    expect(p.eventConflicts.length).toBe(1);
    expect(p.eventConflicts[0].resolution).toBe("pending");
  });
});
