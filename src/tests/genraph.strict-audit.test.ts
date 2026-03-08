import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { GenraphGraph } from "../core/genraph/GenraphGraph";
import { exportGskPackage, importGskPackage } from "../core/genraph/GskPackage";

describe("Genraph strict-lossless-audit mode", () => {
    it("rejects invalid journal in both strict import modes", async () => {
        const graph = GenraphGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });
        graph.addPersonNode({ uid: "p2", type: "Person", sex: "F", isLiving: true });

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as any;

        // Disable new integrity checks to isolate audit-vs-strict journal behavior.
        delete manifest.integrity;
        delete manifest.journalHash;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("journal.jsonl", "{\"bad-json\":\n");
        const payload = await zip.generateAsync({ type: "uint8array" });

        await expect(importGskPackage(payload, { mode: "strict-lossless" })).rejects.toThrow(
            "journal.jsonl contains malformed lines"
        );
        await expect(importGskPackage(payload, { mode: "strict-lossless-audit" })).rejects.toThrow(
            "journal.jsonl contains malformed lines"
        );
    });

    it("rejects schema 0.5.0 packages with app meta in strict-lossless-audit", async () => {
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
        zip.file("meta/colorTheme.json", JSON.stringify({ background: "#111111" }, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        await expect(importGskPackage(payload, { mode: "strict-lossless-audit" })).rejects.toThrow("CORE_META_FORBIDDEN");
    });
});
