import { describe, expect, it } from "vitest";
import { solveBirthRange } from "@/core/inference/constraintSolver";
import { DEFAULT_BIRTH_ESTIMATOR_CONFIG } from "@/core/inference/birthEstimatorConfig";
import type { EvidenceInterval } from "@/core/inference/types";

describe("solveBirthRange", () => {
  it("drops weakest conflicting hard constraint deterministically", () => {
    const evidence: EvidenceInterval[] = [
      {
        id: "hard-strong",
        kind: "hard",
        type: "parent_birth",
        hardSpan: [1880, 1910],
        weight: 90,
        qualityFactor: 1,
        reference: "A",
        label: "strong",
        notes: []
      },
      {
        id: "hard-weak",
        kind: "hard",
        type: "child_birth",
        hardSpan: [1940, 1950],
        weight: 10,
        qualityFactor: 1,
        reference: "B",
        label: "weak",
        notes: []
      },
      {
        id: "soft",
        kind: "soft",
        type: "sibling",
        bestSpan: [1890, 1900],
        weight: 20,
        qualityFactor: 1,
        reference: "C",
        label: "soft",
        notes: []
      }
    ];

    const result = solveBirthRange(evidence, DEFAULT_BIRTH_ESTIMATOR_CONFIG);
    expect(result.finalRange[0]).toBeGreaterThanOrEqual(1880);
    expect(result.finalRange[1]).toBeLessThanOrEqual(1910);
    expect(result.droppedEvidence.map((item) => item.id)).toContain("hard-weak");
  });

  it("returns confidence in 0..1", () => {
    const result = solveBirthRange([], DEFAULT_BIRTH_ESTIMATOR_CONFIG);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
