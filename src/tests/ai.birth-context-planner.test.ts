import { describe, expect, it } from "vitest";
import { planBirthAiContext } from "@/core/inference/aiBirthContextPlanner";
import type { GeneaDocument } from "@/types/domain";

function buildDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": {
        id: "@I1@",
        name: "Foco",
        sex: "M",
        lifeStatus: "alive",
        events: [{ type: "BIRT", date: "ABT 1930" }, { type: "DEAT", date: "1988" }],
        famc: ["@F1@"],
        fams: ["@F2@"],
        mediaRefs: [],
        sourceRefs: [],
        rawTags: { NOTE: ["Nota foco"] }
      },
      "@P1@": {
        id: "@P1@",
        name: "Padre",
        sex: "M",
        lifeStatus: "deceased",
        events: [{ type: "BIRT", date: "BET 1898 AND 1902" }, { type: "DEAT", date: "1960" }],
        famc: [],
        fams: ["@F1@"],
        mediaRefs: [],
        sourceRefs: [],
        rawTags: { NOTE: ["Nota padre"] }
      },
      "@P2@": {
        id: "@P2@",
        name: "Madre",
        sex: "F",
        lifeStatus: "deceased",
        events: [{ type: "BIRT", date: "1905" }],
        famc: [],
        fams: ["@F1@"],
        mediaRefs: [],
        sourceRefs: []
      },
      "@S1@": {
        id: "@S1@",
        name: "Pareja",
        sex: "F",
        lifeStatus: "alive",
        events: [{ type: "BIRT", date: "1932" }],
        famc: [],
        fams: ["@F2@"],
        mediaRefs: [],
        sourceRefs: []
      },
      "@C1@": {
        id: "@C1@",
        name: "Hijo1",
        sex: "M",
        lifeStatus: "alive",
        events: [{ type: "BIRT", date: "1950" }],
        famc: ["@F2@"],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      },
      "@C2@": {
        id: "@C2@",
        name: "Hijo2",
        sex: "F",
        lifeStatus: "alive",
        events: [{ type: "BIRT", date: "1962" }],
        famc: ["@F2@"],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      }
    },
    families: {
      "@F1@": { id: "@F1@", husbandId: "@P1@", wifeId: "@P2@", childrenIds: ["@I1@"], events: [] },
      "@F2@": { id: "@F2@", husbandId: "@I1@", wifeId: "@S1@", childrenIds: ["@C1@", "@C2@"], events: [] }
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

describe("planBirthAiContext", () => {
  it("simple excludes focus birth, ranges and notes", () => {
    const out = planBirthAiContext({
      document: buildDoc(),
      focusPersonId: "@I1@",
      level: "simple",
      includeNotes: false,
      notesScope: "none",
      minimumSimpleDates: 3
    });

    expect(out.facts.some((f) => f.relationToFocus === "focus" && f.eventType === "BIRT")).toBe(false);
    expect(out.facts.some((f) => f.dateKind === "range")).toBe(false);
    expect(out.facts.some((f) => f.eventType === "NOTE")).toBe(false);
  });

  it("simple keeps only first and last child anchors", () => {
    const out = planBirthAiContext({
      document: buildDoc(),
      focusPersonId: "@I1@",
      level: "simple",
      includeNotes: false,
      notesScope: "none",
      minimumSimpleDates: 3
    });
    const childBirthYears = out.facts
      .filter((f) => f.relationToFocus === "child" && f.eventType === "BIRT")
      .map((f) => f.date);
    expect(childBirthYears).toContain("1950");
    expect(childBirthYears).toContain("1962");
    expect(childBirthYears.length).toBe(2);
  });
});

