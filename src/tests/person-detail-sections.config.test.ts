import { describe, expect, it } from "vitest";
import { PERSON_DETAIL_SECTIONS } from "@/ui/person/personDetailSections";

describe("person detail sections config", () => {
  it("keeps stable ordered ids", () => {
    const ids = PERSON_DETAIL_SECTIONS.filter((s) => s.enabled).map((s) => s.id);
    expect(ids).toEqual([
      "identity",
      "family_links",
      "events",
      "sources",
      "notes",
      "media",
      "audit",
      "extensions",
      "timeline",
      "analysis",
      "history"
    ]);
  });

  it("does not contain duplicate ids", () => {
    const ids = PERSON_DETAIL_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
