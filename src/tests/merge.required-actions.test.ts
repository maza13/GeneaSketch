import { describe, expect, it } from "vitest";
import { calculateDiff } from "@/core/edit/diff";
import { applyDiff } from "@/core/edit/merge";
import type { GeneaDocument } from "@/types/domain";

describe("merge required actions", () => {
  it("applies graph actions in deterministic order and preserves legacy projection", () => {
    const base: GeneaDocument = {
      persons: {
        "@I1@": {
          id: "@I1@",
          name: "Parent",
          sex: "M",
          lifeStatus: "alive",
          events: [],
          famc: [],
          fams: [],
          mediaRefs: [],
          sourceRefs: []
        }
      },
      families: {},
      media: {},
      metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
    };

    const incoming: GeneaDocument = {
      persons: {
        "@I1@": {
          id: "@I1@",
          name: "Parent",
          sex: "M",
          lifeStatus: "alive",
          events: [],
          famc: [],
          fams: [],
          mediaRefs: [],
          sourceRefs: []
        },
        "@I2@": {
          id: "@I2@",
          name: "Child",
          sex: "U",
          lifeStatus: "alive",
          events: [],
          famc: [],
          fams: [],
          mediaRefs: [],
          sourceRefs: []
        }
      },
      families: {},
      media: {},
      metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
    };

    const diff = calculateDiff(base, incoming, new Map([["@I1@", "@I1@"]]));

    const parentCandidate = diff.matchEvidence?.["@I1@"]?.candidates?.[0];
    const childCandidate = diff.matchEvidence?.["@I2@"]?.candidates?.[0];
    expect(parentCandidate).toBeDefined();
    expect(childCandidate).toBeDefined();
    if (!parentCandidate || !childCandidate) return;

    parentCandidate.requiredActions = [
      {
        kind: "create_union",
        union: {
          id: "U:auto:test-parent",
          partnerIds: ["@I1@"],
          unionType: "unknown",
          confidence: 0.7
        }
      }
    ];

    childCandidate.requiredActions = [
      {
        kind: "link_parent_child",
        link: {
          id: "PCL:auto:test-parent-child",
          parentId: "@I1@",
          childId: "@I2@",
          role: "father",
          certainty: "high"
        }
      },
      {
        kind: "flag_pending_enrichment",
        personId: "@I2@",
        reason: "anchor-insertion-test",
        confidence: 0.66
      }
    ];

    const { merged } = applyDiff(base, diff);

    expect(Object.keys(merged.unions || {}).length).toBeGreaterThan(0);
    expect(Object.keys(merged.parentChildLinks || {}).length).toBeGreaterThan(0);
    expect(merged.persons["@I2@"].pendingEnrichment?.reason).toBe("anchor-insertion-test");

    const familyWithChild = Object.values(merged.families).find((family) => family.childrenIds.includes("@I2@"));
    expect(familyWithChild).toBeDefined();
    expect(merged.persons["@I2@"].famc.length).toBeGreaterThan(0);
  });
});

