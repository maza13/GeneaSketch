import { describe, expect, it } from "vitest";
import type { Event } from "@/types/domain";
import { clearEventFieldValue, getAddableEventFields, getDefaultVisibleEventFields, getInitialVisibleEventFields } from "@/ui/person/personDetailUtils";

describe("person events progressive fields", () => {
  it("starts with base fields by event type", () => {
    expect(getDefaultVisibleEventFields("BIRT")).toEqual(["date", "place"]);
    expect(getDefaultVisibleEventFields("RESI")).toEqual(["place", "addr"]);
  });

  it("includes advanced fields with existing values", () => {
    const event: Event = {
      id: "evt1",
      type: "BIRT",
      date: "1900",
      sourceRefs: [{ id: "@S1@" }],
      notesInline: ["nota"],
      mediaRefs: []
    };
    const visible = getInitialVisibleEventFields(event);
    expect(visible).toContain("date");
    expect(visible).toContain("place");
    expect(visible).toContain("sourceRefs");
    expect(visible).toContain("notesInline");
  });

  it("can add and remove advanced fields deterministically", () => {
    const event: Event = { id: "evt2", type: "BIRT" };
    const initial = getInitialVisibleEventFields(event);
    const addable = getAddableEventFields(event, initial);
    expect(addable).toContain("sourceRefs");

    const changed = clearEventFieldValue(
      {
        ...event,
        sourceRefs: [{ id: "@S10@" }],
        noteRefs: ["@N1@"]
      },
      "sourceRefs"
    );

    expect(changed.sourceRefs).toEqual([]);
    expect(changed.noteRefs).toEqual(["@N1@"]);
  });
});
