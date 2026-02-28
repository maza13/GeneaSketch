import { describe, expect, it } from "vitest";
import { calculateDiff } from "@/core/edit/diff";
import { applyDiff } from "@/core/edit/merge";
import type { GeneaDocument } from "@/types/domain";

describe("merge version normalization", () => {
  it("normalizes merged metadata to GSZ + GED 7.0.x", () => {
    const base: GeneaDocument = {
      persons: {
        "@I1@": { id: "@I1@", name: "Base", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
      },
      families: {},
      media: {},
      metadata: { sourceFormat: "GED", gedVersion: "5.5.1" }
    };

    const incoming: GeneaDocument = {
      persons: {
        "@I2@": { id: "@I2@", name: "Incoming", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
      },
      families: {},
      media: {},
      metadata: { sourceFormat: "GSZ", gedVersion: "7.0.x" }
    };

    const diff = calculateDiff(base, incoming, new Map());
    const { merged } = applyDiff(base, diff);

    expect(merged.metadata.sourceFormat).toBe("GSZ");
    expect(merged.metadata.gedVersion).toBe("7.0.x");
  });
});
