import { describe, expect, it } from "vitest";
import type { Event } from "@/types/domain";
import { isEventEffectivelyEmpty } from "@/ui/person/personDetailUtils";

describe("person events empty soft validation", () => {
  it("flags event as empty when no relevant field has content", () => {
    const event: Event = { id: "evt-empty", type: "OTHER" };
    expect(isEventEffectivelyEmpty(event)).toBe(true);
  });

  it("does not flag event as empty when one field has value", () => {
    const event: Event = { id: "evt-date", type: "OTHER", date: "ABT 1900" };
    expect(isEventEffectivelyEmpty(event)).toBe(false);
  });
});
