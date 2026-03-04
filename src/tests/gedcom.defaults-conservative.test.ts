import { describe, expect, it } from "vitest";
import type { GeneaDocument } from "../types/domain";
import { documentToGSchema } from "../core/gschema/GedcomBridge";

describe("GEDCOM defaults policy", () => {
    const baseDoc: GeneaDocument = {
        persons: {
            "@I1@": {
                id: "@I1@",
                name: "Father",
                sex: "M",
                lifeStatus: "deceased",
                events: [],
                famc: [],
                fams: ["@F1@"],
                mediaRefs: [],
                sourceRefs: [],
                noteRefs: [],
            },
            "@I2@": {
                id: "@I2@",
                name: "Mother",
                sex: "F",
                lifeStatus: "deceased",
                events: [],
                famc: [],
                fams: ["@F1@"],
                mediaRefs: [],
                sourceRefs: [],
                noteRefs: [],
            },
            "@I3@": {
                id: "@I3@",
                name: "Child",
                sex: "M",
                lifeStatus: "alive",
                events: [],
                famc: ["@F1@"],
                famcLinks: [{ familyId: "@F1@" }],
                fams: [],
                mediaRefs: [],
                sourceRefs: [],
                noteRefs: [],
            },
        },
        families: {
            "@F1@": {
                id: "@F1@",
                husbandId: "@I1@",
                wifeId: "@I2@",
                childrenIds: ["@I3@"],
                events: [],
            },
        },
        media: {},
        metadata: { sourceFormat: "GED", gedVersion: "5.5.1", schemaUris: [] },
    } as GeneaDocument;

    it("uses conservative defaults (UNK/uncertain) and records assumptions", () => {
        const { graph, warnings } = documentToGSchema(baseDoc, "5.5.1", undefined, { gedcomDefaultPolicy: "conservative" });
        const edges = graph.allEdges().filter((e) => e.type === "ParentChild") as any[];
        expect(edges.length).toBeGreaterThan(0);
        expect(edges[0].nature).toBe("UNK");
        expect(edges[0].certainty).toBe("uncertain");
        expect(edges[0].gedcomAssumptions?.defaultPolicy).toBe("conservative");
        expect(warnings.some((w) => w.message.includes("PEDI missing"))).toBe(true);
        expect(warnings.some((w) => w.message.includes("QUAY missing"))).toBe(true);
    });

    it("keeps legacy aggressive defaults when configured", () => {
        const { graph } = documentToGSchema(baseDoc, "5.5.1", undefined, { gedcomDefaultPolicy: "legacy-aggressive" });
        const edges = graph.allEdges().filter((e) => e.type === "ParentChild") as any[];
        expect(edges[0].nature).toBe("BIO");
        expect(edges[0].certainty).toBe("high");
        expect(edges[0].gedcomAssumptions?.defaultPolicy).toBe("legacy-aggressive");
    });
});

