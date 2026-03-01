import { describe, expect, it } from "vitest";
import { fuseBirthRanges, toGedcomBetween } from "@/core/inference/birthRangeFusion";

describe("birth range fusion", () => {
  it("narrow with overlap uses intersection", () => {
    expect(fuseBirthRanges([1870, 1890], [1880, 1900], "narrow")).toEqual([1880, 1890]);
  });

  it("narrow without overlap picks nearest bridge segment", () => {
    expect(fuseBirthRanges([1800, 1820], [1850, 1870], "narrow")).toEqual([1820, 1850]);
  });

  it("widen uses full union", () => {
    expect(fuseBirthRanges([1874, 1882], [1870, 1891], "widen")).toEqual([1870, 1891]);
  });

  it("formats GEDCOM BET range", () => {
    expect(toGedcomBetween([1882, 1874])).toBe("BET 1874 AND 1882");
  });
});
