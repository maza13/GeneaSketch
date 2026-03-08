import { describe, expect, it } from "vitest";
import { normalizeKindraConfig } from "@/core/kindra/kindraConfig";

describe("Kindra runtime contract", () => {
  it("returns hard-cut defaults when Kindra config is missing", () => {
    const normalized = normalizeKindraConfig(undefined);
    expect(normalized).toEqual({
      isVertical: true,
      layoutEngine: "vnext",
      collapsedNodeIds: [],
      overlays: []
    });
  });

  it("drops legacy renderVersion and normalizes legacy layoutEngine to vnext", () => {
    const normalized = normalizeKindraConfig({
      isVertical: false,
      layoutEngine: "v2" as any,
      collapsedNodeIds: ["P1"],
      overlays: [],
      renderVersion: "v2"
    } as any);

    expect(normalized.isVertical).toBe(false);
    expect(normalized.layoutEngine).toBe("vnext");
    expect(normalized.collapsedNodeIds).toEqual(["P1"]);
    expect((normalized as any).renderVersion).toBeUndefined();
  });
});
