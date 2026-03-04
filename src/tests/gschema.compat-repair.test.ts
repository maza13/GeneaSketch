import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { GSchemaGraph } from "../core/gschema/GSchemaGraph";
import { exportGskPackage, importGskPackage } from "../core/gschema/GskPackage";

describe("GSchema compat repair journaling", () => {
    it("records REPAIR_* operations when compat repairs missing unionUid", async () => {
        const graph = GSchemaGraph.create();
        graph.addPersonNode({ uid: "p-parent", type: "Person", sex: "M", isLiving: false });
        graph.addPersonNode({ uid: "p-child", type: "Person", sex: "F", isLiving: true });
        const blob = await exportGskPackage(graph);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as any;
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
        delete manifest.integrity;

        zip.file("manifest.json", JSON.stringify(manifest, null, 2));
        zip.file("graph.json", JSON.stringify(graphJson, null, 2));
        const payload = await zip.generateAsync({ type: "uint8array" });

        const result = await importGskPackage(payload, { strict: false });
        const opTypes = result.graph.getJournal().map((op) => op.type);
        expect(opTypes).toContain("REPAIR_CREATE_UNION");
        expect(opTypes).toContain("REPAIR_RELINK_PARENT_CHILD");
    });
});

