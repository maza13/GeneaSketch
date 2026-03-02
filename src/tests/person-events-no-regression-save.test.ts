import { describe, expect, it } from "vitest";
import type { Event } from "@/types/domain";
import { clearEventFieldValue, getInitialVisibleEventFields } from "@/ui/person/personDetailUtils";

describe("person events no regression save helpers", () => {
  it("keeps BIRT date visible/available so refinement integration remains compatible", () => {
    const event: Event = { id: "evt-birt", type: "BIRT", date: "BET 1900 AND 1905" };
    const visible = getInitialVisibleEventFields(event);
    expect(visible).toContain("date");
    expect(visible).toContain("place");
  });

  it("clears only selected field value", () => {
    const before: Event = {
      id: "evt-keep",
      type: "BIRT",
      date: "1900",
      place: "Puebla",
      sourceRefs: [{ id: "@S1@" }],
      mediaRefs: ["@M1@"]
    };

    const after = clearEventFieldValue(before, "sourceRefs");
    expect(after.date).toBe("1900");
    expect(after.place).toBe("Puebla");
    expect(after.sourceRefs).toEqual([]);
    expect(after.mediaRefs).toEqual(["@M1@"]);
  });
});
