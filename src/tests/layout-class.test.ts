import { describe, expect, it } from "vitest";
import { buildLayoutClassName } from "@/ui/shell/layoutClass";

describe("buildLayoutClassName", () => {
  it("returns base layout when no side is collapsed", () => {
    expect(buildLayoutClassName(false, false)).toBe("layout");
  });

  it("includes left-collapsed class when left is collapsed", () => {
    expect(buildLayoutClassName(true, false)).toContain("layout--left-collapsed");
  });

  it("includes right-collapsed class when right is collapsed", () => {
    expect(buildLayoutClassName(false, true)).toContain("layout--right-collapsed");
  });

  it("includes canvas-only class when both are collapsed", () => {
    const result = buildLayoutClassName(true, true);
    expect(result).toContain("layout--left-collapsed");
    expect(result).toContain("layout--right-collapsed");
    expect(result).toContain("layout--canvas-only");
  });
});

