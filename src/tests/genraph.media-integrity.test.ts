import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { GenraphGraph } from "../core/genraph/GenraphGraph";
import { exportGskPackage, importGskPackage } from "../core/genraph/GskPackage";

describe("Genraph media manifest integrity", () => {
    it("exports mediaEntries and validates them on import", async () => {
        const graph = GenraphGraph.create();
        graph.addNode({
            uid: "media-1",
            type: "Media",
            fileName: "test.bin",
            mimeType: "application/octet-stream",
            dataUrl: "data:application/octet-stream;base64,AAECAwQ=",
            bytes: 5,
            sha256: "sha256:fake",
            timestamp: 0
        } as any);

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as any;

        expect(Array.isArray(manifest.mediaEntries)).toBe(true);
        expect(manifest.mediaEntries.length).toBe(1);
        expect(manifest.mediaEntries[0].path).toBe("media/test.bin");
        expect(manifest.mediaEntries[0].sha256).toMatch(/^sha256:/);

        const imported = await importGskPackage(await zip.generateAsync({ type: "uint8array" }), { strict: true });
        expect(imported.graph.node("media-1")).toBeTruthy();
    });

    it("fails strict import when media hash mismatches", async () => {
        const graph = GenraphGraph.create();
        graph.addNode({
            uid: "media-1",
            type: "Media",
            fileName: "test.bin",
            mimeType: "application/octet-stream",
            dataUrl: "data:application/octet-stream;base64,AAECAwQ=",
            bytes: 5,
            sha256: "sha256:fake",
            timestamp: 0
        } as any);

        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        zip.file("media/test.bin", new Uint8Array([9, 9, 9]));
        const payload = await zip.generateAsync({ type: "uint8array" });

        await expect(importGskPackage(payload, { strict: true })).rejects.toThrow("MEDIA_HASH_MISMATCH");
    });
});

