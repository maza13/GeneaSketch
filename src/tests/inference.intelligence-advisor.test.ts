import { describe, expect, it } from "vitest";
import { recommendBirthRefinementLevel } from "@/core/inference/intelligenceAdvisor";
import type { InferenceResult } from "@/core/inference/types";

describe("intelligence advisor", () => {
  it("recommends simple when range is tight with strong evidence", () => {
    const local: InferenceResult = {
      suggestedRange: [1900, 1918],
      evidences: [
        { type: "strict_limit", sourceId: "a", message: "x" },
        { type: "strict_limit", sourceId: "b", message: "x" },
        { type: "strict_limit", sourceId: "c", message: "x" }
      ]
    };
    expect(recommendBirthRefinementLevel(local).recommendedLevel).toBe("simple");
  });

  it("recommends complex when uncertainty is high", () => {
    const local: InferenceResult = {
      suggestedRange: [1700, 1900],
      evidences: []
    };
    expect(recommendBirthRefinementLevel(local).recommendedLevel).toBe("complex");
  });
});

