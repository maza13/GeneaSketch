import { describe, expect, it } from "vitest";
import { calculateDiff } from "@/core/edit/diff";
import { applyDiff } from "@/core/edit/merge";
import type { GeneaDocument } from "@/types/domain";

describe("merge audit v2", () => {
  it("stores hypothesis explain data for all evaluated incoming persons", () => {
    const base: GeneaDocument = {
      persons: {
        "@I1@": {
          id: "@I1@",
          name: "Ana",
          surname: "Lopez",
          sex: "F",
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
        "@I2@": {
          id: "@I2@",
          name: "Ana",
          surname: "Lopez",
          sex: "F",
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

    const diff = calculateDiff(base, incoming, new Map());
    const { merged } = applyDiff(base, diff);

    const audit = merged.metadata.mergeAudit;
    expect(audit).toBeDefined();
    expect((audit?.decisions || []).length).toBe(1);
    const decision = audit!.decisions[0];
    expect(decision.chosenHypothesis.explain.coverage).toBeDefined();
    expect(decision.chosenHypothesis.explain.categoryPoints).toBeDefined();
    expect(decision.topHypotheses.length).toBeGreaterThan(0);
    expect(decision.topHypotheses[0].explain.requiredActions).toBeDefined();
  });
});

