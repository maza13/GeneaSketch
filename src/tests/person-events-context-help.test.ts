import { describe, expect, it } from "vitest";
import { EVENT_FIELD_META, getEventTypeMeta } from "@/ui/person/personDetailUtils";

describe("person events context help", () => {
  it("contains descriptive help text for event type", () => {
    const meta = getEventTypeMeta("MARR");
    expect(meta.shortDescription.length).toBeGreaterThan(10);
    expect(meta.shortDescription.toLowerCase()).toContain("matrimon");
  });

  it("contains descriptive help text for fields", () => {
    expect(EVENT_FIELD_META.date.description.toLowerCase()).toContain("gedcom");
    expect(EVENT_FIELD_META.noteRefs.description.toLowerCase()).toContain("@n");
    expect(EVENT_FIELD_META.sourceRefs.description.toLowerCase()).toContain("@s");
  });
});
