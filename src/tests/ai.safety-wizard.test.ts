import { describe, expect, it } from "vitest";
import { normalizeActionsWithSafety } from "@/core/ai/safety";
import type { AiResolvedAction } from "@/types/ai";
import type { GeneaDocument } from "@/types/domain";

function buildDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": { id: "@I1@", name: "Juan Jesus", surname: "Nunez Mendoza", sex: "M", lifeStatus: "alive", events: [{ type: "BIRT", date: "1990" }], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
      "@I2@": { id: "@I2@", name: "Johana", surname: "Torres Perez", sex: "F", lifeStatus: "alive", events: [{ type: "BIRT", date: "1992" }], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
      "@I3@": { id: "@I3@", name: "Leonarda", surname: "Torres", sex: "F", lifeStatus: "alive", events: [{ type: "BIRT", date: "1945" }], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
    },
    families: {
      "@F1@": { id: "@F1@", husbandId: "@I1@", wifeId: "@I2@", childrenIds: [], events: [] }
    },
    media: {},
    metadata: { sourceFormat: "GSK", gedVersion: "7.0.x" }
  };
}

describe("ai safety wizard", () => {
  it("creates candidate groups for ambiguous relation and keeps it blocked", () => {
    const actions: AiResolvedAction[] = [
      {
        kind: "create_relation",
        relationType: "spouse",
        anchorQuery: "Juan Jesus",
        relatedQuery: "Torres"
      }
    ];

    const result = normalizeActionsWithSafety(buildDoc(), actions);
    expect(result.annotations[0]?.blocked).toBe(true);
    expect(result.annotations[0]?.candidateGroups?.anchor.length).toBeGreaterThan(0);
    expect(result.annotations[0]?.candidateGroups?.related.length).toBeGreaterThan(0);
  });
});

