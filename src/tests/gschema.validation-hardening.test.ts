import { describe, expect, it } from "vitest";
import { validateGSchemaGraph } from "../core/gschema/validation";
import type { GSchemaGraph } from "../core/gschema/types";

describe("GSchema validation hardening", () => {
    it("detects claim bucket mismatches and edges to soft-deleted nodes", () => {
        const graph: GSchemaGraph = {
            schemaVersion: "0.4.0",
            graphId: "g1",
            createdAt: "2026-03-03T00:00:00.000Z",
            updatedAt: "2026-03-03T00:00:00.000Z",
            nodes: {
                p1: { uid: "p1", type: "Person", sex: "M", isLiving: false, createdAt: "2026-03-03T00:00:00.000Z" },
                p2: { uid: "p2", type: "Person", sex: "F", isLiving: true, deleted: true, createdAt: "2026-03-03T00:00:00.000Z" },
            },
            edges: {
                e1: {
                    uid: "e1",
                    type: "Association",
                    associationType: "FRI",
                    fromUid: "p1",
                    toUid: "p2",
                    createdAt: "2026-03-03T00:00:00.000Z",
                },
            },
            claims: {
                p1: {
                    "person.name.full": [
                        {
                            uid: "c1",
                            nodeUid: "pX",
                            predicate: "person.name.wrong",
                            value: "Name",
                            provenance: { actorId: "u", timestamp: 1, method: "m" },
                            quality: "raw",
                            lifecycle: "active",
                            isPreferred: true,
                            createdAt: "2026-03-03T00:00:00.000Z",
                        },
                    ],
                },
            },
            quarantine: [],
        };

        const result = validateGSchemaGraph(graph);
        const codes = result.issues.map((i) => i.code);
        expect(codes).toContain("CLAIM_BUCKET_NODEUID_MISMATCH");
        expect(codes).toContain("CLAIM_BUCKET_PREDICATE_MISMATCH");
        expect(codes).toContain("EDGE_TO_SOFT_DELETED_NODE");
    });
});

