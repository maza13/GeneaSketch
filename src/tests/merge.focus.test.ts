import { describe, expect, it } from "vitest";
import { mergeFocusKey, normalizeMergeFocus } from "@/core/edit/mergeFocus";

describe("merge focus normalization", () => {
  it("normalizes, deduplicates and sorts ids", () => {
    const normalized = normalizeMergeFocus({
      primaryIds: ["@I3@", " @I1@ ", "@I3@"],
      secondaryIds: ["@I2@", "@I1@", "", "@I2@"]
    });
    expect(normalized).toEqual({
      primaryIds: ["@I1@", "@I3@"],
      secondaryIds: ["@I2@"]
    });
  });

  it("returns stable key for same logical focus", () => {
    const left = mergeFocusKey({
      primaryIds: ["@I2@", "@I1@"],
      secondaryIds: ["@I3@", "@I3@"]
    });
    const right = mergeFocusKey({
      primaryIds: ["@I1@", "@I2@"],
      secondaryIds: ["@I3@"]
    });
    expect(left).toBe(right);
  });
});
