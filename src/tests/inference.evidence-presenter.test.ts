import { describe, expect, it } from "vitest";
import { presentInferenceEvidence } from "@/core/inference/evidencePresenter";

describe("evidence presenter", () => {
  it("dedupes semantically similar evidences and builds summary", () => {
    const result = presentInferenceEvidence([
      { type: "contextual", sourceId: "a", message: "Nacimiento de descendencia acota edad parental del foco.", layer: 1, relationClass: "child", ruleId: "child_birth" },
      { type: "contextual", sourceId: "b", message: "Nacimiento de descendencia acota edad parental del foco.", layer: 1, relationClass: "child", ruleId: "child_birth" },
      { type: "strict_limit", sourceId: "c", message: "Defuncion parental fija un limite superior.", layer: 1, relationClass: "parent", ruleId: "parent_death", impact: "high" }
    ]);

    expect(result.deduped.length).toBe(2);
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.deduped.some((item) => (item.count || 0) >= 2)).toBe(true);
  });
});

