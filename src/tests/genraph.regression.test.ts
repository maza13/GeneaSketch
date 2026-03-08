import { describe, it, expect } from "vitest";
import { GenraphGraph } from "../core/genraph/GenraphGraph";
import { replayJournal } from "../core/genraph/Journal";
import { exportGskPackage, importGskPackage } from "../core/genraph/GskPackage";
import JSZip from "jszip";

describe("Phase D3: Regression & Golden Tests", () => {
    it("ignores app meta files in compat mode when schema is 0.5.0 core-only", async () => {
        const graph = GenraphGraph.create();
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

        const result = await importGskPackage(payload, { strict: false });
        expect(result.warnings.some((w) => w.includes("CORE_META_FORBIDDEN"))).toBe(true);
        expect(result.meta.viewConfig).toBeUndefined();
    });

    it("preserves app meta extension for legacy schemas with warning", async () => {
        const graph = GenraphGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as Record<string, unknown>;
        const graphJson = JSON.parse(await zip.file("graph.json")!.async("string")) as any;

        manifest.schemaVersion = "0.3.1";
        graphJson.schemaVersion = "0.3.1";
        delete manifest.graphHash;
        delete (manifest as any).integrity;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("graph.json", JSON.stringify(graphJson, null, 2));
        zip.file("meta/visualConfig.json", JSON.stringify({ palette: "legacy" }, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        const result = await importGskPackage(payload, { strict: true });
        expect(result.warnings.some((w) => w.includes("LEGACY_META_EXTENSION_DETECTED"))).toBe(true);
        expect((result.meta.visualConfig as unknown as { palette?: string })?.palette).toBe("legacy");
    });

    it("uses graph quarantine as source of truth in compat when mirror mismatches", async () => {
        const graph = GenraphGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as Record<string, unknown>;
        const graphJson = JSON.parse(await zip.file("graph.json")!.async("string")) as any;

        graphJson.quarantine = [{
            opId: "q-graph",
            opSeq: 120,
            type: "QUARANTINE",
            timestamp: 1772529000,
            actorId: "test",
            importId: "import:test",
            ast: { level: 1, tag: "_Q", value: "graph-canon", children: [], sourceLines: ["1 _Q graph-canon"] },
            reason: "unknown_tag",
            context: "@I1@",
        }];
        const mirror = [{
            opId: "q-mirror",
            opSeq: 120,
            type: "QUARANTINE",
            timestamp: 1772529000,
            actorId: "test",
            importId: "import:test",
            ast: { level: 1, tag: "_Q", value: "mirror-data", children: [], sourceLines: ["1 _Q mirror-data"] },
            reason: "unknown_tag",
            context: "@I1@",
        }];

        delete manifest.graphHash;
        delete (manifest as any).integrity;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("graph.json", JSON.stringify(graphJson, null, 2));
        zip.file("quarantine.json", JSON.stringify(mirror, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        const result = await importGskPackage(payload, { strict: false });
        expect(result.warnings.some((w) => w.includes("QUARANTINE_MIRROR_MISMATCH"))).toBe(true);
        const imported = result.graph.getQuarantine();
        expect(imported).toHaveLength(1);
        expect(imported[0].opId).toBe("q-graph");
        expect(imported[0].ast.value).toBe("graph-canon");
    });

    it("quarantines unknown snapshot edge type in compat mode and skips apply", async () => {
        const graph = GenraphGraph.create();
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

        const result = await importGskPackage(payload, { strict: false });
        expect(result.graph.edge("e-unknown")).toBeUndefined();
        expect(result.warnings.some((w) => w.includes("Compat quarantine: unknown edge type skipped from snapshot"))).toBe(true);
        const quarantine = result.graph.getQuarantine();
        expect(quarantine.some((q) => q.reason === "unknown_edge_type" && q.context === "e-unknown")).toBe(true);
    });

    it("quarantines unknown journal ADD_EDGE in compat mode and skips apply", async () => {
        const graph = GenraphGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });
        graph.addPersonNode({ uid: "p2", type: "Person", sex: "F", isLiving: true });

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as any;
        const journal = await zip.file("journal.jsonl")!.async("string");
        const lines = journal.split("\n").filter((line) => line.trim().length > 0);
        const originalHead = manifest.journalHeadOpSeq as number;

        lines.push(
            JSON.stringify({
                opId: "op-unknown-edge",
                opSeq: originalHead + 1,
                type: "ADD_EDGE",
                timestamp: 1772529000,
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
        manifest.journalHeadOpSeq = originalHead + 1;
        manifest.graphDerivedFromOpSeq = originalHead;
        delete manifest.journalHash;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("journal.jsonl", lines.join("\n"));
        const payload = await zip.generateAsync({ type: "uint8array" });

        const result = await importGskPackage(payload, { strict: false });
        expect(result.graph.edge("e-unknown-op")).toBeUndefined();
        expect(result.warnings.some((w) => w.includes("Compat quarantine: unknown ADD_EDGE op skipped"))).toBe(true);
        expect(result.graph.getQuarantine().some((q) => q.reason === "unknown_edge_type" && q.context === "e-unknown-op")).toBe(true);
    });

    it("repairs missing ParentChild.unionUid in compat mode with deterministic synthetic union", async () => {
        const graph = GenraphGraph.create();
        graph.addPersonNode({ uid: "p-father", type: "Person", sex: "M", isLiving: false });
        graph.addPersonNode({ uid: "p-child", type: "Person", sex: "F", isLiving: true });

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as Record<string, unknown>;
        const graphJson = JSON.parse(await zip.file("graph.json")!.async("string")) as any;

        graphJson.edges["pc-legacy"] = {
            uid: "pc-legacy",
            type: "ParentChild",
            fromUid: "p-father",
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

        const first = await importGskPackage(payload, { strict: false });
        const second = await importGskPackage(payload, { strict: false });

        const firstEdge = first.graph.edge("pc-legacy");
        const secondEdge = second.graph.edge("pc-legacy");
        expect(firstEdge?.type).toBe("ParentChild");
        expect(secondEdge?.type).toBe("ParentChild");
        if (firstEdge?.type !== "ParentChild" || secondEdge?.type !== "ParentChild") {
            throw new Error("Expected ParentChild edge after compat repair");
        }

        expect(firstEdge.unionUid).toBe("union:synthetic:p-child:p-father");
        expect(secondEdge.unionUid).toBe("union:synthetic:p-child:p-father");
        expect(first.graph.node(firstEdge.unionUid)?.type).toBe("Union");
        expect(
            first.warnings.some((w) => w.includes("Compat repair: synthetic union created for ParentChild without unionUid"))
        ).toBe(true);
    });

    it("verify Snapshot-Journal Parity (SJP)", () => {
        const graph = GenraphGraph.create();

        // Build a complex graph
        const p1 = "p1";
        const p2 = "p2";
        const u1 = "u1";

        graph.addPersonNode({ uid: p1, type: "Person", sex: "M", isLiving: false });
        graph.addPersonNode({ uid: p2, type: "Person", sex: "F", isLiving: true });
        graph.addUnionNode({ uid: u1, type: "Union", unionType: "MARR" });
        graph.addMemberEdge({ uid: "e1", type: "Member", fromUid: p1, toUid: u1, role: "HUSB" });
        graph.addMemberEdge({ uid: "e2", type: "Member", fromUid: p2, toUid: u1, role: "WIFE" });

        graph.addClaim({
            uid: "c1", nodeUid: p1, predicate: "person.name.full", value: "John Doe",
            provenance: { actorId: "test", timestamp: 123, method: "test" },
            quality: "raw", lifecycle: "active", isPreferred: true, createdAt: "2024-01-01"
        });

        // Retract a claim to ensure it's replayed correctly
        const c2 = "c2";
        graph.addClaim({
            uid: c2, nodeUid: p2, predicate: "person.name.full", value: "Jane Oldname",
            provenance: { actorId: "test", timestamp: 123, method: "test" },
            quality: "raw", lifecycle: "active", isPreferred: true, createdAt: "2024-01-01"
        });
        graph.retractClaim(c2, "Correction");
        graph.addClaim({
            uid: "c3", nodeUid: p2, predicate: "person.name.full", value: "Jane Doe",
            provenance: { actorId: "test", timestamp: 123, method: "test" },
            quality: "raw", lifecycle: "active", isPreferred: true, createdAt: "2024-01-01"
        });

        graph.softDeleteNode(p1, "Testing deletion replay");

        // Replay the journal onto an empty graph
        const journalOps = [...graph.getJournal()];
        const replayedGraph = replayJournal(journalOps);

        // Verify deeply identical
        expect(graph._equals(replayedGraph)).toBe(true);
    });

    it("handles Valid Journal + Corrupted Graph (Compat Mode)", async () => {
        const graph = GenraphGraph.create();
        graph.addPersonNode({ uid: "test-p1", type: "Person", sex: "M", isLiving: false });

        const blob = await exportGskPackage(graph);
        const zipPayload = new Uint8Array(await blob.arrayBuffer());
        const zip = await JSZip.loadAsync(zipPayload);

        // Corrupt graph.json
        zip.file("graph.json", "{ invalid_json: ");
        const corruptedPayload = await zip.generateAsync({ type: "uint8array" });

        // Should reconstruct from Journal in COMPAT mode (strict: false)
        const result = await importGskPackage(corruptedPayload, { strict: false });

        expect(result.graph.nodeCount).toBe(1);
        expect(result.warnings.some(w => w.includes("Could not parse graph.json"))).toBe(true);
    });

    it("handles Missing Journal + Valid Graph (Compat Mode)", async () => {
        const graph = GenraphGraph.create();
        graph.addPersonNode({ uid: "test-p2", type: "Person", sex: "M", isLiving: false });

        const blob = await exportGskPackage(graph);
        const zipPayload = new Uint8Array(await blob.arrayBuffer());
        const zip = await JSZip.loadAsync(zipPayload);

        // Remove journal
        zip.remove("journal.jsonl");
        const corruptedPayload = await zip.generateAsync({ type: "uint8array" });

        const result = await importGskPackage(corruptedPayload, { strict: false });

        expect(result.graph.nodeCount).toBe(1);
    });

    it("Stress Test: 10k claims performance check", async () => {
        const graph = GenraphGraph.create();
        const p1 = "stress-p1";
        graph.addPersonNode({ uid: p1, type: "Person", sex: "M", isLiving: false });

        const start = Date.now();
        for (let i = 0; i < 10000; i++) {
            graph.addClaim({
                uid: `c-${i}`, nodeUid: p1, predicate: "person.name.full", value: `Value ${i}`,
                provenance: { actorId: "test", timestamp: 123, method: "test" },
                quality: "raw", lifecycle: "active", isPreferred: i === 9999, createdAt: "2024-01-01"
            });
        }

        // Export and import to check serialization/deserialization limit
        const blob = await exportGskPackage(graph);
        const zipPayload = new Uint8Array(await blob.arrayBuffer());

        const result = await importGskPackage(zipPayload, { strict: true });

        expect(result.graph.getClaims(p1, "person.name.full")).toHaveLength(10000);
        const end = Date.now();
        // Just ensuring it completes in a reasonable time (<5s in vitest)
        expect(end - start).toBeLessThan(15000);
    });

    it("serializes claims in canonical order (timestamp, createdAt, uid)", () => {
        const graph = GenraphGraph.create();
        const nodeUid = "p-order";
        graph.addPersonNode({ uid: nodeUid, type: "Person", sex: "M", isLiving: false });

        const data = graph.toData();
        data.claims[nodeUid] = {
            "person.name.full": [
                {
                    uid: "c2",
                    nodeUid,
                    predicate: "person.name.full",
                    value: "B",
                    provenance: { actorId: "test", timestamp: 20, method: "test" },
                    quality: "raw",
                    lifecycle: "active",
                    isPreferred: false,
                    createdAt: "2026-01-01T00:00:02.000Z",
                },
                {
                    uid: "c0",
                    nodeUid,
                    predicate: "person.name.full",
                    value: "A",
                    provenance: { actorId: "test", timestamp: 10, method: "test" },
                    quality: "raw",
                    lifecycle: "active",
                    isPreferred: false,
                    createdAt: "2026-01-01T00:00:01.000Z",
                },
                {
                    uid: "c1",
                    nodeUid,
                    predicate: "person.name.full",
                    value: "C",
                    provenance: { actorId: "test", timestamp: 10, method: "test" },
                    quality: "raw",
                    lifecycle: "active",
                    isPreferred: true,
                    createdAt: "2026-01-01T00:00:03.000Z",
                },
            ],
        };

        const restored = GenraphGraph.fromData(data);
        const claims = restored.toData().claims[nodeUid]["person.name.full"];
        expect(claims.map((c) => c.uid)).toEqual(["c0", "c1", "c2"]);
    });

    it("promotes deterministic preferred after retracting current preferred", () => {
        const graph = GenraphGraph.create();
        const nodeUid = "p-pref";
        graph.addPersonNode({ uid: nodeUid, type: "Person", sex: "M", isLiving: false });

        graph.addClaim({
            uid: "c-a",
            nodeUid,
            predicate: "person.name.full",
            value: "Alpha",
            provenance: { actorId: "test", timestamp: 1, method: "test" },
            quality: "raw",
            lifecycle: "active",
            isPreferred: true,
            createdAt: "2026-01-01T00:00:01.000Z",
        });
        graph.addClaim({
            uid: "c-b",
            nodeUid,
            predicate: "person.name.full",
            value: "Beta",
            provenance: { actorId: "test", timestamp: 2, method: "test" },
            quality: "raw",
            lifecycle: "active",
            isPreferred: false,
            createdAt: "2026-01-01T00:00:02.000Z",
        });

        graph.retractClaim("c-a", "obsolete");
        const claims = graph.getClaims(nodeUid, "person.name.full");
        const preferredActive = claims.filter((c) => c.lifecycle !== "retracted" && c.isPreferred);
        expect(preferredActive).toHaveLength(1);
        expect(preferredActive[0].uid).toBe("c-b");
    });

    it("rejects non-canonical claim invariants in strict import and repairs in compat", async () => {
        const graph = GenraphGraph.create();
        const nodeUid = "p-import";
        graph.addPersonNode({ uid: nodeUid, type: "Person", sex: "F", isLiving: true });
        graph.addClaim({
            uid: "c-ok",
            nodeUid,
            predicate: "person.name.full",
            value: "Ok",
            provenance: { actorId: "test", timestamp: 10, method: "test" },
            quality: "raw",
            lifecycle: "active",
            isPreferred: true,
            createdAt: "2026-01-01T00:00:10.000Z",
        });

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as Record<string, unknown>;
        const graphJson = JSON.parse(await zip.file("graph.json")!.async("string")) as any;

        graphJson.claims[nodeUid]["person.name.full"] = [
            {
                uid: "c-new",
                nodeUid,
                predicate: "person.name.full",
                value: "Newest",
                provenance: { actorId: "test", timestamp: 30, method: "test" },
                quality: "raw",
                lifecycle: "active",
                isPreferred: false,
                createdAt: "2026-01-01T00:00:30.000Z",
            },
            {
                uid: "c-old",
                nodeUid,
                predicate: "person.name.full",
                value: "Old",
                provenance: { actorId: "test", timestamp: 10, method: "test" },
                quality: "raw",
                lifecycle: "active",
                isPreferred: false,
                createdAt: "2026-01-01T00:00:10.000Z",
            },
        ];

        delete manifest.graphHash;
        delete (manifest as any).integrity;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("graph.json", JSON.stringify(graphJson, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        await expect(importGskPackage(payload, { strict: true })).rejects.toThrow(
            "CRITICAL: graph.json violates claim invariants in strict mode"
        );

        const compat = await importGskPackage(payload, { strict: false });
        expect(compat.warnings.some((w) => w.includes("Compat repair: graph.json claim invariants normalized"))).toBe(true);
        const normalized = compat.graph.getClaims(nodeUid, "person.name.full");
        expect(normalized.map((c) => c.uid)).toEqual(["c-old", "c-new"]);
        expect(normalized.find((c) => c.uid === "c-new")?.isPreferred).toBe(true);
    });
});
