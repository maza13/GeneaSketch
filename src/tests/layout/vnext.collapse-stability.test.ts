import { describe, expect, it } from "vitest";
import { computeLayout } from "@/core/layout";
import { buildLayoutInput, canonicalToVisualId } from "@/tests/layout/fixture";

describe("layout gateway collapse stability (vnext)", () => {
  it("keeps root anchor stable when collapsing local branch", () => {
    const { graph, input } = buildLayoutInput("vnext");
    const rootId = canonicalToVisualId(graph, "P1");

    const base = computeLayout(input);
    const collapsed = computeLayout({
      ...input,
      collapsedNodeIds: [rootId],
      previousPositions: base.positions
    });

    expect(collapsed.positions.get(rootId)).toEqual(base.positions.get(rootId));
    expect(collapsed.diagnostics.engine).toBe("vnext");
    expect(collapsed.diagnostics.effectiveEngine).toBe("vnext");
    expect(collapsed.diagnostics.timingsMs.total).toBeGreaterThanOrEqual(0);
  });
});
