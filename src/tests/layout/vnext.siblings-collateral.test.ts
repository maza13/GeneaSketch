import { describe, expect, it } from "vitest";
import { computeLayout } from "@/core/layout";
import { buildLayoutInput, canonicalToVisualId } from "@/tests/layout/fixture";

describe("layout gateway siblings and collateral bands (vnext)", () => {
  it("orders siblings by birth and places paternal collateral blocks outward", () => {
    const { graph, input } = buildLayoutInput("vnext");

    const canonicalOf = (nodeId: string): string =>
      graph.nodes.find((node) => node.id === nodeId)?.canonicalId ?? nodeId;

    const mainFamilyId = canonicalToVisualId(graph, "F_MAIN");
    const mainJunctionId = graph.edges.find(
      (edge) => edge.type === "junction-link" && edge.from === mainFamilyId
    )?.to;
    if (!mainJunctionId) {
      throw new Error("Expected junction for main family.");
    }

    const mainChildren = graph.edges
      .filter((edge) => edge.type === "child" && edge.from === mainJunctionId)
      .map((edge) => edge.to);

    const childOlderId = mainChildren.find((id) => canonicalOf(id) === "C2");
    const childYoungerId = mainChildren.find((id) => canonicalOf(id) === "C1");

    if (!childOlderId || !childYoungerId) {
      throw new Error("Expected both main children nodes.");
    }

    const fatherId = canonicalToVisualId(graph, "PF");
    const fatherSecondaryFamilyId = graph.edges
      .filter((edge) => edge.type === "spouse" && edge.from === fatherId)
      .map((edge) => edge.to)
      .find((familyId) => canonicalOf(familyId) === "F_FATHER_SECOND");

    if (!fatherSecondaryFamilyId) {
      throw new Error("Expected father secondary union in graph.");
    }

    const result = computeLayout(input);

    const olderX = result.positions.get(childOlderId)?.x;
    const youngerX = result.positions.get(childYoungerId)?.x;
    const fatherX = result.positions.get(fatherId)?.x;
    const secondaryFamilyX = result.positions.get(fatherSecondaryFamilyId)?.x;

    if (olderX === undefined || youngerX === undefined || fatherX === undefined || secondaryFamilyX === undefined) {
      throw new Error("Expected coordinates for sibling/collateral assertions.");
    }

    expect(olderX).toBeLessThan(youngerX);
    expect(secondaryFamilyX).toBeLessThan(fatherX);
    expect(result.diagnostics.effectiveEngine).toBe("vnext");
    expect(result.diagnostics.timingsMs.total).toBeGreaterThanOrEqual(0);
  });
});
