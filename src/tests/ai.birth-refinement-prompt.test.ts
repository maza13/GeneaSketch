import { describe, expect, it } from "vitest";
import { buildBirthRangeRefinementCompactPrompt, buildBirthRangeRefinementPrompt } from "@/core/ai/prompts";
import type { AiBirthRangeRefinementFactsRequest } from "@/types/ai";

const request: AiBirthRangeRefinementFactsRequest = {
  focusPersonId: "@I1@",
  focusPersonLabel: "Juan Perez",
  focusSex: "M",
  facts: [
    {
      personId: "@I2@",
      personLabel: "Padre Perez",
      relationToFocus: "parent",
      eventType: "BIRT",
      date: "1901",
      reference: "parent:@I2@:BIRT"
    },
    {
      personId: "@I2@",
      personLabel: "Padre Perez",
      relationToFocus: "parent",
      eventType: "NOTE",
      value: "Tuvo un hijo en 1940 tras migrar.",
      reference: "parent:@I2@:NOTE:1"
    }
  ],
  contextStats: { factsCount: 2, notesCount: 1 }
};

describe("birth refinement prompts", () => {
  it("asks for detailed spanish justification using facts-only context", () => {
    const { system, user } = buildBirthRangeRefinementPrompt(request);
    expect(system).toContain("Respond in Spanish");
    expect(system).toContain("Verdict must be detailed");
    expect(system).toContain("facts as anchors");
    expect(user).not.toContain("\"localBoundsContext\"");
    expect(user).not.toContain("currentBirthDateGedcom");
    expect(user).toContain("\"contextStats\"");
  });

  it("compact prompt still requests substantial justification", () => {
    const { system } = buildBirthRangeRefinementCompactPrompt(request);
    expect(system).toContain("justificative with useful detail");
    expect(system).not.toContain("one justificative line");
  });
});
