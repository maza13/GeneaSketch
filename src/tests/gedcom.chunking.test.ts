import { describe, expect, it } from "vitest";
import type { GeneaDocument } from "../types/domain";
import { GEDCOM_CHUNK_MAX_BYTES, serializeGedcom } from "../core/gedcom/serializer";

describe("GEDCOM chunking by UTF-8 bytes", () => {
    it("splits long values using byte-length threshold and reconstructs exactly", () => {
        const longUtf8 = "á".repeat(220); // 2 bytes each char.
        const doc: GeneaDocument = {
            persons: {
                "@I1@": {
                    id: "@I1@",
                    name: "Test",
                    sex: "M",
                    lifeStatus: "alive",
                    events: [],
                    famc: [],
                    fams: [],
                    mediaRefs: [],
                    sourceRefs: [],
                    noteRefs: [],
                    rawTags: { "_LONG": [longUtf8] },
                },
            },
            families: {},
            media: {},
            metadata: { sourceFormat: "GED", gedVersion: "7.0.3", schemaUris: [] },
        };

        const ged = serializeGedcom(doc);
        const lines = ged.split("\n").filter(Boolean);
        const relevant = lines.filter((line) => line.startsWith("1 _LONG ") || line.startsWith("2 CONC "));
        expect(relevant.length).toBeGreaterThan(1);

        const decoder = new TextEncoder();
        for (const line of relevant) {
            const payload = line.replace(/^\d+\s+(?:_LONG|CONC)\s*/, "");
            expect(decoder.encode(payload).byteLength).toBeLessThanOrEqual(GEDCOM_CHUNK_MAX_BYTES);
        }

        const reconstructed = relevant
            .map((line) => line.replace(/^\d+\s+(?:_LONG|CONC)\s*/, ""))
            .join("");
        expect(reconstructed).toBe(longUtf8);
    });
});

