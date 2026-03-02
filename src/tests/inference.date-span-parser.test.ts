import { describe, expect, it } from "vitest";
import { parseDateToYearSpan } from "@/core/inference/dateSpanParser";

describe("parseDateToYearSpan", () => {
  it("parses BET AND range", () => {
    const result = parseDateToYearSpan("BET 1874 AND 1882");
    expect(result.minYear).toBe(1874);
    expect(result.maxYear).toBe(1882);
    expect(result.precision).toBe("range");
  });

  it("parses BEF and AFT", () => {
    const bef = parseDateToYearSpan("BEF 1900");
    const aft = parseDateToYearSpan("AFT 1900");
    expect(bef.maxYear).toBe(1900);
    expect(bef.precision).toBe("open_before");
    expect(aft.minYear).toBe(1900);
    expect(aft.precision).toBe("open_after");
  });

  it("parses ABT with tolerance", () => {
    const result = parseDateToYearSpan("ABT 1910");
    expect(result.minYear).toBe(1906);
    expect(result.maxYear).toBe(1914);
  });

  it("returns unknown for phrase dates", () => {
    const result = parseDateToYearSpan("cuando era joven");
    expect(result.precision).toBe("unknown");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
