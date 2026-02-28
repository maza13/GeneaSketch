import { describe, expect, it } from "vitest";
import { computeLayout } from "@/core/layout";
import { buildLayoutInput, canonicalToVisualId } from "@/tests/layout/fixture";

describe("layout v2 spouse ordering", () => {
  it("keeps nucleus->family->spouse chain with primary union first", () => {
    const { graph, input } = buildLayoutInput("v2");
    const rootId = canonicalToVisualId(graph, "P1");

    const canonicalOf = (nodeId: string): string =>
      graph.nodes.find((node) => node.id === nodeId)?.canonicalId ?? nodeId;

    const spouseEdges = graph.edges.filter((edge) => edge.type === "spouse" && edge.from === rootId);
    const mainFamilyId = spouseEdges.find((edge) => canonicalOf(edge.to) === "F_MAIN")?.to;
    const secondFamilyId = spouseEdges.find((edge) => canonicalOf(edge.to) === "F_SECOND")?.to;

    if (!mainFamilyId || !secondFamilyId) {
      throw new Error("Expected both root unions to be visible in graph.");
    }

    const mainSpouseId = graph.edges.find(
      (edge) => edge.type === "spouse" && edge.to === mainFamilyId && edge.from !== rootId
    )?.from;
    const secondSpouseId = graph.edges.find(
      (edge) => edge.type === "spouse" && edge.to === secondFamilyId && edge.from !== rootId
    )?.from;

    if (!mainSpouseId || !secondSpouseId) {
      throw new Error("Expected spouse nodes for both unions.");
    }

    const result = computeLayout(input);

    const rootX = result.positions.get(rootId)?.x;
    const mainFamilyX = result.positions.get(mainFamilyId)?.x;
    const mainSpouseX = result.positions.get(mainSpouseId)?.x;
    const secondFamilyX = result.positions.get(secondFamilyId)?.x;
    const secondSpouseX = result.positions.get(secondSpouseId)?.x;

    if (
      rootX === undefined ||
      mainFamilyX === undefined ||
      mainSpouseX === undefined ||
      secondFamilyX === undefined ||
      secondSpouseX === undefined
    ) {
      throw new Error("Expected all chain nodes to have coordinates.");
    }

    expect(rootX).toBeLessThan(mainFamilyX);
    expect(mainFamilyX).toBeLessThan(mainSpouseX);
    expect(mainSpouseX).toBeLessThan(secondFamilyX);
    expect(secondFamilyX).toBeLessThan(secondSpouseX);

    // Primary union: family centered between anchor and first spouse (symmetric distance).
    const primaryLeft = Math.abs(mainFamilyX - rootX);
    const primaryRight = Math.abs(mainSpouseX - mainFamilyX);
    expect(Math.abs(primaryLeft - primaryRight)).toBeLessThan(0.001);

    // Secondary union: spouse stays at minimal distance to its family node.
    const secondaryDistance = Math.abs(secondSpouseX - secondFamilyX);
    expect(secondaryDistance).toBeLessThanOrEqual(primaryRight);
  });
});
