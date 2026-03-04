import { describe, expect, it, vi } from "vitest";
import { estimatePersonBirthYear } from "@/core/inference/dateInference";
import type { GeneaDocument } from "@/types/domain";
import { estimatePersonBirthYearV2 } from "@/core/inference/birthRangeLocalV2";

vi.mock("@/core/inference/birthRangeLocalV2", () => ({
  estimatePersonBirthYearV2: vi.fn()
}));

function createDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": { id: "@I1@", name: "Persona", sex: "U", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
    },
    families: {},
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

describe("dateInference wrapper", () => {
  it("delegates to v2 estimator", () => {
    vi.mocked(estimatePersonBirthYearV2).mockReturnValue({
      suggestedYear: 1900,
      evidences: []
    });
    const result = estimatePersonBirthYear("@I1@", createDoc());
    expect(result?.suggestedYear).toBe(1900);
  });

  it("returns null when estimator throws", () => {
    vi.mocked(estimatePersonBirthYearV2).mockImplementation(() => {
      throw new Error("boom");
    });
    const result = estimatePersonBirthYear("@I1@", createDoc());
    expect(result).toBeNull();
  });
});
