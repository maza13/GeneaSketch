import { describe, expect, it } from "vitest";
import type { AiBirthRangeRefinementFact } from "@/types/ai";
import { rankBirthRefinementFacts } from "@/core/inference/aiBirthRefinement";

function f(partial: Partial<AiBirthRangeRefinementFact>): AiBirthRangeRefinementFact {
  return {
    personId: partial.personId || "@I1@",
    personLabel: partial.personLabel || "X",
    relationToFocus: partial.relationToFocus || "other",
    eventType: partial.eventType || "NOTE",
    reference: partial.reference || "r",
    date: partial.date,
    place: partial.place
  };
}

describe("birth refinement facts ranker", () => {
  it("prioritizes parent and focus birth facts", () => {
    const ranked = rankBirthRefinementFacts([
      f({ reference: "sibling-note", relationToFocus: "sibling", eventType: "NOTE" }),
      f({ reference: "child-birt", relationToFocus: "child", eventType: "BIRT" }),
      f({ reference: "focus-birt", relationToFocus: "focus", eventType: "BIRT" }),
      f({ reference: "parent-birt", relationToFocus: "parent", eventType: "BIRT" })
    ]);

    expect(ranked[0].reference).toBe("parent-birt");
    expect(ranked[1].reference).toBe("focus-birt");
    expect(ranked[2].reference).toBe("child-birt");
  });

  it("keeps deterministic order on tie by reference", () => {
    const ranked = rankBirthRefinementFacts([
      f({ reference: "b", relationToFocus: "spouse", eventType: "BIRT" }),
      f({ reference: "a", relationToFocus: "spouse", eventType: "BIRT" })
    ]);
    expect(ranked.map((x) => x.reference)).toEqual(["a", "b"]);
  });
});

