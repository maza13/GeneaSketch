import { describe, expect, it } from "vitest";
import { normalizeConsanguinityIntensity } from "@/core/graph/endogamyVisual";

describe("normalizeConsanguinityIntensity (strict profile)", () => {
  it("is monotonic non-decreasing", () => {
    const samples = [0, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.031, 0.0625, 0.125, 0.25, 0.4, 1];
    for (let i = 1; i < samples.length; i += 1) {
      const prev = normalizeConsanguinityIntensity(samples[i - 1]);
      const curr = normalizeConsanguinityIntensity(samples[i]);
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it("keeps 0.05% very subtle", () => {
    // 0.05% => 0.0005 ratio
    expect(normalizeConsanguinityIntensity(0.0005)).toBeLessThan(0.08);
  });

  it("keeps 3.1% in medium band", () => {
    const intensity = normalizeConsanguinityIntensity(0.031);
    expect(intensity).toBeGreaterThan(0.3);
    expect(intensity).toBeLessThan(0.56);
  });

  it("maps 25% and above near maximum", () => {
    expect(normalizeConsanguinityIntensity(0.25)).toBeGreaterThanOrEqual(0.99);
    expect(normalizeConsanguinityIntensity(0.4)).toBe(1);
  });

  it("is approximately continuous at segment boundaries", () => {
    const boundaries = [0.001, 0.005, 0.02, 0.0625, 0.125, 0.25];
    for (const b of boundaries) {
      const left = normalizeConsanguinityIntensity(b - 1e-8);
      const right = normalizeConsanguinityIntensity(b + 1e-8);
      expect(Math.abs(right - left)).toBeLessThan(0.01);
    }
  });
});

