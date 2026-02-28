import { describe, expect, it } from "vitest";
import { computeLayout } from "@/core/layout";
import { buildLayoutInput, canonicalToVisualId } from "@/tests/layout/fixture";

describe("layout v2 ancestor side priority", () => {
  it("pins maternal line person at left edge and paternal line person at right edge among their siblings", () => {
    const { graph, input } = buildLayoutInput("v2");
    const result = computeLayout(input);

    const motherId = canonicalToVisualId(graph, "PM");
    const maternalSiblingIds = [canonicalToVisualId(graph, "MUS1"), canonicalToVisualId(graph, "MUS2")];

    const fatherId = canonicalToVisualId(graph, "PF");
    const paternalSiblingIds = [canonicalToVisualId(graph, "PUS1"), canonicalToVisualId(graph, "PUS2")];

    const motherX = result.positions.get(motherId)?.x;
    const fatherX = result.positions.get(fatherId)?.x;
    const maternalXs = maternalSiblingIds.map((id) => result.positions.get(id)?.x).filter((x): x is number => x !== undefined);
    const paternalXs = paternalSiblingIds.map((id) => result.positions.get(id)?.x).filter((x): x is number => x !== undefined);

    if (motherX === undefined || fatherX === undefined || maternalXs.length === 0 || paternalXs.length === 0) {
      throw new Error("Expected coordinates for parents and their sibling groups.");
    }

    expect(motherX).toBeLessThan(Math.min(...maternalXs));
    expect(fatherX).toBeGreaterThan(Math.max(...paternalXs));
  });
});
