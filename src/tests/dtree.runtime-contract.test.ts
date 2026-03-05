import { describe, expect, it } from "vitest";
import { normalizeDtreeConfig } from "@/core/dtree/dtreeConfig";

describe("dtree runtime contract", () => {
  it("returns hard-cut defaults when dtree config is missing", () => {
    const normalized = normalizeDtreeConfig(undefined);
    expect(normalized).toEqual({
      isVertical: true,
      layoutEngine: "vnext",
      collapsedNodeIds: [],
      overlays: []
    });
  });

  it("drops legacy renderVersion and normalizes legacy layoutEngine to vnext", () => {
    const normalized = normalizeDtreeConfig({
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
