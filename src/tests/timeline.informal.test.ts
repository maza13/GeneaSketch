import { describe, it, expect } from "vitest";
import { buildTimeline } from "@/core/timeline/buildTimeline";
import { normalizeGedcomTimelineDate } from "@/core/timeline/dateNormalization";
import type { GraphDocument } from "@/types/domain";

function makeDocWithInformalBirth(date: string): GraphDocument {
  return {
    persons: {
      "@I1@": {
        id: "@I1@",
        name: "Persona",
        sex: "U",
        lifeStatus: "alive",
        famc: [],
        fams: [],
        events: [
          {
            id: "e1",
            type: "BIRT",
            date,
            sourceRefs: [],
            mediaRefs: [],
            notesInline: [],
            noteRefs: []
          }
        ],
        mediaRefs: [],
        sourceRefs: []
      } as any
    },
    families: {},
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.3" }
  } as GraphDocument;
}

describe("timeline informal coercion (Issue 021)", () => {
  it("keeps source display string and marks undated for non-orderable informal dates", () => {
    const parsed = normalizeGedcomTimelineDate("durante la primavera");
    expect(parsed.displayDate).toBe("durante la primavera");
    expect(parsed.undated).toBe(true);
    expect(parsed.sortDate).toBeNull();
  });

  it("buildTimeline includes informal undated events with raw display", () => {
    const document = makeDocWithInformalBirth("durante la primavera");
    const items = buildTimeline(
      document,
      { nodes: [{ id: "@I1@", type: "person" }] } as any,
      { timeline: { scope: "visible" } } as any
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].displayDate).toBe("durante la primavera");
    expect(items[0].undated).toBe(true);
  });
});

