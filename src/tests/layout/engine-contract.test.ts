import { describe, expect, it } from "vitest";
import { computeLayout } from "@/core/layout";
import { buildLayoutInput } from "@/tests/layout/fixture";

describe("layout engine contract", () => {
  it("defaults to vnext when layoutEngine is omitted", () => {
    const { input } = buildLayoutInput("vnext", { layoutEngine: undefined });
    const result = computeLayout(input);

    expect(result.diagnostics.engine).toBe("vnext");
    expect(result.diagnostics.effectiveEngine).toBe("vnext");
    expect(result.diagnostics.timingsMs.total).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.timingsMs.buildVirtualTree).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.timingsMs.solve).toBeGreaterThanOrEqual(0);
  });

  it("uses vnext when requested explicitly", () => {
    const { input } = buildLayoutInput("vnext");
    const result = computeLayout(input);

    expect(result.diagnostics.engine).toBe("vnext");
    expect(result.diagnostics.effectiveEngine).toBe("vnext");
    expect(result.diagnostics.timingsMs.total).toBeGreaterThanOrEqual(0);
  });
});
