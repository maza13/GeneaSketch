import { describe, expect, it } from "vitest";
import { calculateDiff } from "@/core/edit/diff";
import { applyDiff } from "@/core/edit/merge";
import type { GeneaDocument } from "@/types/domain";

describe("merge provenance", () => {
  it("keeps and appends import provenance entries", () => {
    const base: GeneaDocument = {
      persons: {
        "@I1@": { id: "@I1@", name: "Base", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
      },
      families: {},
      media: {},
      metadata: {
        sourceFormat: "GSZ",
        gedVersion: "7.0.x",
        importProvenance: [
          {
            fileName: "base.gsz",
            sourceFormat: "GSZ",
            sourceGedVersion: "7.0.x",
            importedAt: "2026-01-01T00:00:00.000Z"
          }
        ]
      }
    };

    const incoming: GeneaDocument = {
      persons: {
        "@I2@": { id: "@I2@", name: "Incoming", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
      },
      families: {},
      media: {},
      metadata: { sourceFormat: "GDZ", gedVersion: "5.5.1" }
    };

    const diff = calculateDiff(base, incoming, new Map());
    const { merged } = applyDiff(base, diff);

    expect(merged.metadata.importProvenance).toBeDefined();
    expect((merged.metadata.importProvenance || []).length).toBeGreaterThanOrEqual(2);
    const last = (merged.metadata.importProvenance || [])[((merged.metadata.importProvenance || []).length - 1)];
    expect(last.sourceFormat).toBe("GDZ");
    expect(last.sourceGedVersion).toBe("5.5.1");
  });
});
