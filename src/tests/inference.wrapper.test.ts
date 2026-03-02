import { beforeEach, describe, expect, it, vi } from "vitest";
import { estimatePersonBirthYear, getBirthEstimatorVersion, setBirthEstimatorVersionForTests } from "@/core/inference/dateInference";
import type { GeneaDocument } from "@/types/domain";
import { estimatePersonBirthYearV2 } from "@/core/inference/birthRangeLocalV2";
import { estimatePersonBirthYearLegacy } from "@/core/inference/dateInferenceLegacy";

vi.mock("@/core/inference/birthRangeLocalV2", () => ({
  estimatePersonBirthYearV2: vi.fn()
}));

vi.mock("@/core/inference/dateInferenceLegacy", () => ({
  estimatePersonBirthYearLegacy: vi.fn()
}));

function createDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": {
        id: "@I1@",
        name: "Padre",
        sex: "M",
        lifeStatus: "alive",
        events: [{ type: "BIRT", date: "1850" }],
        famc: [],
        fams: ["@F1@"],
        mediaRefs: [],
        sourceRefs: []
      },
      "@I2@": {
        id: "@I2@",
        name: "Madre",
        sex: "F",
        lifeStatus: "alive",
        events: [{ type: "BIRT", date: "1855" }],
        famc: [],
        fams: ["@F1@"],
        mediaRefs: [],
        sourceRefs: []
      },
      "@I3@": {
        id: "@I3@",
        name: "Hijo",
        sex: "M",
        lifeStatus: "alive",
        events: [],
        famc: ["@F1@"],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      }
    },
    families: {
      "@F1@": { id: "@F1@", husbandId: "@I1@", wifeId: "@I2@", childrenIds: ["@I3@"], events: [] }
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "5.5.1" }
  };
}

describe("dateInference wrapper", () => {
  beforeEach(() => {
    setBirthEstimatorVersionForTests("v2");
    vi.clearAllMocks();
  });

  it("uses v2 when result is valid", () => {
    const doc = createDoc();
    vi.mocked(estimatePersonBirthYearV2).mockReturnValue({
      suggestedRange: [1880, 1884],
      suggestedYear: 1882,
      evidences: []
    });
    vi.mocked(estimatePersonBirthYearLegacy).mockReturnValue({
      suggestedYear: 1881,
      evidences: []
    });

    const result = estimatePersonBirthYear("@I3@", doc, { estimatorVersion: "v2" });
    expect(result?.suggestedYear).toBe(1882);
    expect(estimatePersonBirthYearLegacy).not.toHaveBeenCalled();
  });

  it("falls back to legacy when v2 returns weak result", () => {
    const doc = createDoc();
    vi.mocked(estimatePersonBirthYearV2).mockReturnValue({
      evidences: []
    });
    vi.mocked(estimatePersonBirthYearLegacy).mockReturnValue({
      suggestedYear: 1881,
      evidences: [],
      diagnostics: ["legacy-ok"]
    });

    const result = estimatePersonBirthYear("@I3@", doc, { estimatorVersion: "v2" });
    expect(result?.suggestedYear).toBe(1881);
    expect(result?.diagnostics?.some((item) => item.includes("fallback_to_legacy:v2_invalid_result"))).toBe(true);
  });

  it("falls back to legacy when v2 reports impossible range", () => {
    const doc = createDoc();
    vi.mocked(estimatePersonBirthYearV2).mockReturnValue({
      suggestedRange: [1900, 1890],
      evidences: [{ type: "strict_limit", sourceId: "x", message: "bad" }],
      isImpossible: true
    });
    vi.mocked(estimatePersonBirthYearLegacy).mockReturnValue({
      suggestedYear: 1881,
      evidences: []
    });

    const result = estimatePersonBirthYear("@I3@", doc, { estimatorVersion: "v2" });
    expect(result?.suggestedYear).toBe(1881);
    expect(result?.diagnostics?.some((item) => item.includes("fallback_to_legacy:v2_invalid_result"))).toBe(true);
  });

  it("respects forced legacy selector", () => {
    const doc = createDoc();
    vi.mocked(estimatePersonBirthYearV2).mockReturnValue({
      suggestedYear: 1882,
      evidences: []
    });
    vi.mocked(estimatePersonBirthYearLegacy).mockReturnValue({
      suggestedYear: 1880,
      evidences: []
    });

    const result = estimatePersonBirthYear("@I3@", doc, { estimatorVersion: "legacy" });
    expect(result?.suggestedYear).toBe(1880);
    expect(estimatePersonBirthYearV2).not.toHaveBeenCalled();
  });

  it("keeps test selector compatibility", () => {
    setBirthEstimatorVersionForTests("legacy");
    expect(getBirthEstimatorVersion()).toBe("legacy");
  });
});
