import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { GenraphGraph } from "../core/genraph/GenraphGraph";
import { exportGskPackage, importGskPackage } from "../core/genraph/GskPackage";

describe("Genraph schema 0.5.0 activation", () => {
    it("exports schemaVersion 0.5.0 with integrity/security blocks and no meta files", async () => {
        const graph = GenraphGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });
        const blob = await exportGskPackage(graph, {
            meta: {
                viewConfig: { focusPersonId: "p1" } as any,
                visualConfig: { nodePositions: {} } as any,
                colorTheme: { background: "#000000" } as any,
            },
        });
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as any;
        const graphJson = JSON.parse(await zip.file("graph.json")!.async("string")) as any;

        expect(manifest.schemaVersion).toBe("0.5.0");
        expect(graphJson.schemaVersion).toBe("0.5.0");
        expect(manifest.integrity?.packageHash).toMatch(/^sha256:/);
        expect(Array.isArray(manifest.integrity?.entries)).toBe(true);
        expect(manifest.security?.mode).toBe("none");
        expect(zip.file("meta/viewConfig.json")).toBeNull();
        expect(zip.file("meta/visualConfig.json")).toBeNull();
        expect(zip.file("meta/colorTheme.json")).toBeNull();
        const metaEntry = manifest.integrity?.entries?.find((entry: { role?: string }) => entry.role === "meta");
        expect(metaEntry).toBeUndefined();
    });

    it("imports legacy-like 0.3.x manifest and re-exports as 0.5.0 core-only", async () => {
        const graph = GenraphGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });
        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as any;
        const graphJson = JSON.parse(await zip.file("graph.json")!.async("string")) as any;

        manifest.schemaVersion = "0.3.1";
        graphJson.schemaVersion = "0.3.1";
        delete manifest.graphHash;
        delete manifest.integrity;
        delete manifest.security;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("graph.json", JSON.stringify(graphJson, null, 2));
        zip.file("meta/viewConfig.json", JSON.stringify({ focusPersonId: "p1" }, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        const imported = await importGskPackage(payload, { strict: true });
        expect(imported.graph.node("p1")).toBeTruthy();
        expect(imported.warnings.some((warning) => warning.includes("LEGACY_META_EXTENSION_DETECTED"))).toBe(true);

        const reExported = await exportGskPackage(imported.graph);
        const reZip = await JSZip.loadAsync(await reExported.arrayBuffer());
        const reManifest = JSON.parse(await reZip.file("manifest.json")!.async("string")) as any;
        const reGraph = JSON.parse(await reZip.file("graph.json")!.async("string")) as any;

        expect(reManifest.schemaVersion).toBe("0.5.0");
        expect(reGraph.schemaVersion).toBe("0.5.0");
        expect(reZip.file("meta/viewConfig.json")).toBeNull();
    });
});
