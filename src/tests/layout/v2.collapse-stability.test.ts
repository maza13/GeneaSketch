import { describe, expect, it } from "vitest";
import { computeLayout } from "@/core/layout";
import { buildLayoutInput, canonicalToVisualId } from "@/tests/layout/fixture";

describe("layout v2 collapse stability", () => {
  it("keeps root anchor stable when collapsing local branch", () => {
    const { graph, input } = buildLayoutInput("v2");
    const rootId = canonicalToVisualId(graph, "P1");

    const base = computeLayout(input);
    const collapsed = computeLayout({
      ...input,
      collapsedNodeIds: [rootId],
      previousPositions: base.positions
    });

    expect(collapsed.positions.get(rootId)).toEqual(base.positions.get(rootId));
    expect(collapsed.diagnostics.fallbackFrom).toBeUndefined();
  });
});
