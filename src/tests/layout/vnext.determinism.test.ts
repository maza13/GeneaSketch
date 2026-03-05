import { describe, expect, it } from "vitest";
import { computeLayout } from "@/core/layout";
import { buildLayoutInput } from "@/tests/layout/fixture";

function normalizePositions(map: Map<string, { x: number; y: number }>): Record<string, { x: number; y: number }> {
  const entries = [...map.entries()].sort(([left], [right]) => left.localeCompare(right));
  return Object.fromEntries(entries.map(([id, point]) => [id, { x: Number(point.x.toFixed(6)), y: Number(point.y.toFixed(6)) }]));
}

describe("layout gateway determinism (vnext)", () => {
  it("returns identical coordinates for the same input", () => {
    const { input } = buildLayoutInput("vnext");

    const first = computeLayout(input);
    const second = computeLayout(input);

    expect(normalizePositions(first.positions)).toEqual(normalizePositions(second.positions));
    expect(first.diagnostics.engine).toBe("vnext");
    expect(first.diagnostics.effectiveEngine).toBe("vnext");
    expect(first.diagnostics.timingsMs.total).toBeGreaterThanOrEqual(0);
    expect(second.diagnostics.engine).toBe("vnext");
    expect(second.diagnostics.effectiveEngine).toBe("vnext");
    expect(second.diagnostics.timingsMs.total).toBeGreaterThanOrEqual(0);
  });
});
