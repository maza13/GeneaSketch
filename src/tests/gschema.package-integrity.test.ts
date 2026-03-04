import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { GSchemaGraph } from "../core/gschema/GSchemaGraph";
import { exportGskPackage, importGskPackage } from "../core/gschema/GskPackage";

describe("GSchema package integrity tree", () => {
    it("detects tampering in strict mode via package integrity", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });
        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());

        const graphJson = JSON.parse(await zip.file("graph.json")!.async("string"));
        graphJson.nodes.p1.sex = "F";
        zip.file("graph.json", JSON.stringify(graphJson, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        await expect(importGskPackage(payload, { strict: true })).rejects.toThrow("PACKAGE_HASH_MISMATCH");
    });

    it("warns in compat mode for package integrity mismatch", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });
        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());

        const graphJson = JSON.parse(await zip.file("graph.json")!.async("string"));
        graphJson.nodes.p1.sex = "F";
        zip.file("graph.json", JSON.stringify(graphJson, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        const result = await importGskPackage(payload, { strict: false });
        expect(result.warnings.some((w) => w.includes("PACKAGE_HASH_MISMATCH"))).toBe(true);
    });
});

