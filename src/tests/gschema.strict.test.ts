import { describe, it, expect } from "vitest";
import { GSchemaGraph } from "../core/gschema/GSchemaGraph";
import { documentToGSchema } from "../core/gschema/GedcomBridge";
import { importGskPackage, exportGskPackage } from "../core/gschema/GskPackage";
import { serializeGedcom } from "../core/gedcom/serializer";
import { PersonPredicates } from "../core/gschema/predicates";
import JSZip from "jszip";
import type { GeneaDocument } from "../types/domain";

describe("GSchema Phase D2 - Hardening", () => {
    it("fails in strict mode when snapshot has unknown edge type", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });
        graph.addPersonNode({ uid: "p2", type: "Person", sex: "F", isLiving: true });

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as Record<string, unknown>;
        const graphJson = JSON.parse(await zip.file("graph.json")!.async("string")) as any;
        graphJson.edges["e-unknown"] = {
            uid: "e-unknown",
            type: "AlienEdge",
            fromUid: "p1",
            toUid: "p2",
            createdAt: "2026-03-03T00:00:00.000Z",
        };

        delete manifest.graphHash;
        delete (manifest as any).integrity;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("graph.json", JSON.stringify(graphJson, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        await expect(importGskPackage(payload, { strict: true })).rejects.toThrow("EDGE_TYPE_UNKNOWN");
    });

    it("fails in strict mode when journal has unknown ADD_EDGE type", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });
        graph.addPersonNode({ uid: "p2", type: "Person", sex: "F", isLiving: true });

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as any;
        const journal = await zip.file("journal.jsonl")!.async("string");
        const lines = journal.split("\n").filter((line) => line.trim().length > 0);
        const head = manifest.journalHeadOpSeq as number;

        lines.push(
            JSON.stringify({
                opId: "op-unknown-edge",
                opSeq: head + 1,
                type: "ADD_EDGE",
                timestamp: 1772528000,
                actorId: "test",
                edge: {
                    uid: "e-unknown-op",
                    type: "AlienEdge",
                    fromUid: "p1",
                    toUid: "p2",
                    createdAt: "2026-03-03T00:00:00.000Z",
                },
            })
        );
        manifest.journalHeadOpSeq = head + 1;
        delete manifest.journalHash;
        delete (manifest as any).integrity;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("journal.jsonl", lines.join("\n"));
        const payload = await zip.generateAsync({ type: "uint8array" });

        await expect(importGskPackage(payload, { strict: true })).rejects.toThrow("EDGE_TYPE_UNKNOWN_IN_JOURNAL");
    });

    it("fails in strict mode when graph quarantine exists but quarantine mirror is missing", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as Record<string, unknown>;
        const graphJson = JSON.parse(await zip.file("graph.json")!.async("string")) as any;

        graphJson.quarantine = [{
            opId: "q1",
            opSeq: 100,
            type: "QUARANTINE",
            timestamp: 1772528000,
            actorId: "test",
            importId: "import:test",
            ast: { level: 1, tag: "_UNK", value: "v", children: [], sourceLines: ["1 _UNK v"] },
            reason: "unknown_tag",
            context: "@I1@",
        }];

        delete manifest.graphHash;
        delete (manifest as any).integrity;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("graph.json", JSON.stringify(graphJson, null, 2));
        zip.remove("quarantine.json");
        const payload = await zip.generateAsync({ type: "uint8array" });

        await expect(importGskPackage(payload, { strict: true })).rejects.toThrow("QUARANTINE_MIRROR_MISSING");
    });

    it("fails in strict mode when schema 0.5.0 package includes app meta extension files", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as Record<string, unknown>;
        const graphJson = JSON.parse(await zip.file("graph.json")!.async("string")) as any;

        manifest.schemaVersion = "0.5.0";
        graphJson.schemaVersion = "0.5.0";
        delete manifest.graphHash;
        delete (manifest as any).integrity;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("graph.json", JSON.stringify(graphJson, null, 2));
        zip.file("meta/viewConfig.json", JSON.stringify({ focusPersonId: "p1" }, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        await expect(importGskPackage(payload, { strict: true })).rejects.toThrow("CORE_META_FORBIDDEN");
    });

    it("fails in strict mode when quarantine mirror mismatches graph quarantine", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as Record<string, unknown>;
        const graphJson = JSON.parse(await zip.file("graph.json")!.async("string")) as any;

        graphJson.quarantine = [{
            opId: "q1",
            opSeq: 100,
            type: "QUARANTINE",
            timestamp: 1772528000,
            actorId: "test",
            importId: "import:test",
            ast: { level: 1, tag: "_UNK", value: "graph", children: [], sourceLines: ["1 _UNK graph"] },
            reason: "unknown_tag",
            context: "@I1@",
        }];
        const mirror = [{
            opId: "q1",
            opSeq: 100,
            type: "QUARANTINE",
            timestamp: 1772528000,
            actorId: "test",
            importId: "import:test",
            ast: { level: 1, tag: "_UNK", value: "mirror", children: [], sourceLines: ["1 _UNK mirror"] },
            reason: "unknown_tag",
            context: "@I1@",
        }];

        delete manifest.graphHash;
        delete (manifest as any).integrity;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("graph.json", JSON.stringify(graphJson, null, 2));
        zip.file("quarantine.json", JSON.stringify(mirror, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        await expect(importGskPackage(payload, { strict: true })).rejects.toThrow("QUARANTINE_MIRROR_MISMATCH");
    });

    it("fails in strict mode when ParentChild is missing unionUid", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p-parent", type: "Person", sex: "M", isLiving: false });
        graph.addPersonNode({ uid: "p-child", type: "Person", sex: "F", isLiving: true });

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as Record<string, unknown>;
        const graphJson = JSON.parse(await zip.file("graph.json")!.async("string")) as any;

        graphJson.edges["pc-legacy"] = {
            uid: "pc-legacy",
            type: "ParentChild",
            fromUid: "p-parent",
            toUid: "p-child",
            parentRole: "father",
            nature: "BIO",
            certainty: "high",
            createdAt: "2026-03-03T00:00:00.000Z",
        };

        delete manifest.graphHash;
        delete (manifest as any).integrity;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("graph.json", JSON.stringify(graphJson, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        await expect(importGskPackage(payload, { strict: true })).rejects.toThrow(
            "PARENT_CHILD_MISSING_UNION"
        );
    });

    it("flags missing ParentChild nature/certainty and recovers from journal replay", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p-parent", type: "Person", sex: "M", isLiving: false });
        graph.addPersonNode({ uid: "p-child", type: "Person", sex: "F", isLiving: true });
        graph.addUnionNode({ uid: "u1", type: "Union", unionType: "UNM" });
        graph.addMemberEdge({ uid: "m1", type: "Member", fromUid: "p-parent", toUid: "u1", role: "HUSB" });

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as Record<string, unknown>;
        const graphJson = JSON.parse(await zip.file("graph.json")!.async("string")) as any;

        graphJson.edges["pc-legacy"] = {
            uid: "pc-legacy",
            type: "ParentChild",
            fromUid: "p-parent",
            toUid: "p-child",
            parentRole: "father",
            unionUid: "u1",
            createdAt: "2026-03-03T00:00:00.000Z",
        };

        delete manifest.graphHash;
        delete (manifest as any).integrity;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("graph.json", JSON.stringify(graphJson, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        const result = await importGskPackage(payload, { strict: true });
        expect(
            result.warnings.some((w) => w.includes("PARENT_CHILD_MISSING_NATURE"))
        ).toBe(true);
        expect(
            result.warnings.some((w) => w.includes("PARENT_CHILD_MISSING_CERTAINTY"))
        ).toBe(true);
        expect(result.warnings.some((w) => w.includes("Reconstructing graph from journal replay"))).toBe(true);
    });

    it("enforces strict-lossless hash validation in GskPackage", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });

        // Export and corrupt the graph.json
        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());

        const graphData = JSON.parse(await zip.file("graph.json")!.async("string"));
        graphData.schemaVersion = "9.9.9"; // Arbitrary change
        zip.file("graph.json", JSON.stringify(graphData));

        const corruptedPayload = await zip.generateAsync({ type: "uint8array" });

        // Should fail in strict mode due to hash mismatch
        await expect(importGskPackage(corruptedPayload, { strict: true })).rejects.toThrow();
    });

    it("handles non-preferred claims via GSK_CONFLICT|v1 protocol", () => {
        const doc: GeneaDocument = {
            persons: {
                "@I1@": {
                    id: "@I1@", name: "Preferred", sex: "M",
                    rawTags: {
                        "_GSK_CONFLICT": ["GSK_CONFLICT|v1|person.name.full|{\"value\":\"NonPreferred\",\"quality\":\"raw\",\"lifecycle\":\"active\",\"isPreferred\":false}"]
                    }
                }
            },
            families: {},
            media: {},
            metadata: { sourceFormat: "GED", schemaUris: [] }
        } as any;

        const { graph } = documentToGSchema(doc, "5.5.1");
        // Get node by checking all nodes since we don't have the xrefMap here easily
        const node = graph.allNodes().find(n => (n as any).xref === "@I1@");
        expect(node).toBeTruthy();

        const claims = graph.getClaims(node!.uid, PersonPredicates.NAME_FULL);

        expect(claims).toHaveLength(2);
        expect(claims.find(c => c.value === "NonPreferred")).toBeTruthy();
        expect(claims.find(c => c.value === "Preferred")?.isPreferred).toBe(true);
    });

    it("implements deterministic chunking with CONC tags", () => {
        const longValue = "A".repeat(300);
        const doc: GeneaDocument = {
            persons: {
                "@I1@": {
                    id: "@I1@", name: "Test", sex: "M",
                    rawTags: { "_LONG": [longValue] },
                    events: [],
                    famc: [],
                    fams: [],
                    mediaRefs: [],
                    sourceRefs: [],
                    noteRefs: []
                }
            },
            families: {},
            media: {},
            notes: {},
            sources: {},
            metadata: { sourceFormat: "GED", schemaUris: [] }
        } as any;

        const ged = serializeGedcom(doc);
        expect(ged).toContain("1 _LONG " + "A".repeat(180));
        expect(ged).toContain("2 CONC " + "A".repeat(120));
    });

    it("fails in strict mode when journal replay has a gap in opSeq", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });
        graph.addPersonNode({ uid: "p2", type: "Person", sex: "F", isLiving: true });
        graph.addPersonNode({ uid: "p3", type: "Person", sex: "M", isLiving: true });

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as Record<string, unknown>;
        const journal = await zip.file("journal.jsonl")!.async("string");
        const lines = journal.split("\n").filter((line) => line.trim().length > 0);

        // Remove an operation from the middle of the journal to create a gap
        if (lines.length > 2) {
            lines.splice(1, 1);
        }

        delete manifest.journalHash;
        delete (manifest as any).integrity;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("journal.jsonl", lines.join("\n"));
        const payload = await zip.generateAsync({ type: "uint8array" });

        await expect(importGskPackage(payload, { strict: true })).rejects.toThrow(/gap/);
    });

    it("fails in strict mode when fast-forwarding with a non-contiguous opSeq", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });
        const lastSeq = graph.getJournal()[graph.getJournal().length - 1].opSeq;

        // Try to apply an operation that skips a sequence number
        const ops = [{
            opId: "bad-op",
            opSeq: lastSeq + 2, // Gap!
            type: "ADD_NODE",
            timestamp: 12345,
            actorId: "test",
            node: { uid: "p2", type: "Person", sex: "F", isLiving: false, createdAt: "2026-03-03" }
        } as any];

        const { applyJournalOps } = await import("../core/gschema/Journal");
        expect(() => applyJournalOps(graph, ops, { strictOpSeq: true })).toThrow(/gap/);
    });
});
