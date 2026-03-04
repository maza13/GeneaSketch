import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { GSchemaGraph } from "../core/gschema/GSchemaGraph";
import { exportGskPackage, importGskPackage } from "../core/gschema/GskPackage";

describe("GSchema security contract (reserved)", () => {
    it("rejects unsupported security mode in strict mode", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });
        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as any;

        manifest.security = {
            mode: "aes-256-gcm",
            signature: { mode: "none" },
            encryption: { mode: "aes-256-gcm" },
        };
        manifest.encryption = "aes-256-gcm";
        delete manifest.integrity;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        await expect(importGskPackage(payload, { strict: true })).rejects.toThrow("SECURITY_MODE_UNSUPPORTED");
    });

    it("warns on unsupported security mode in compat mode", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p1", type: "Person", sex: "M", isLiving: false });
        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as any;

        manifest.security = {
            mode: "aes-256-gcm",
            signature: { mode: "none" },
            encryption: { mode: "aes-256-gcm" },
        };
        delete manifest.integrity;
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        const result = await importGskPackage(payload, { strict: false });
        expect(result.warnings.some((w) => w.includes("SECURITY_MODE_UNSUPPORTED"))).toBe(true);
    });
});

