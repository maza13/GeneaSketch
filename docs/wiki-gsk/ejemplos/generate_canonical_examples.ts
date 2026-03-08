import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { GenraphGraph } from "../../../src/core/genraph/GenraphGraph";
import { exportGskPackage } from "../../../src/core/genraph/GskPackage";
import type { GenraphGraph as GenraphGraphData, GenraphOperation } from "../../../src/core/genraph/types";

type ExampleFixture = {
    name: string;
    data: GenraphGraphData;
    ops: GenraphOperation[];
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = ROOT;
const CANON_DIR = path.join(ROOT, "canon");

function stableGraph(data: GenraphGraphData, ops: GenraphOperation[]): GenraphGraph {
    return GenraphGraph.fromData(data, ops);
}

async function writePackageAndCanon(example: ExampleFixture): Promise<void> {
    const graph = stableGraph(example.data, example.ops);
    const blob = await exportGskPackage(graph);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    const gskPath = path.join(OUT_DIR, `${example.name}.gsk`);
    await writeFile(gskPath, bytes);

    const zip = await JSZip.loadAsync(bytes);
    const manifest = await zip.file("manifest.json")!.async("string");
    const graphJson = await zip.file("graph.json")!.async("string");
    const journal = await zip.file("journal.jsonl")?.async("string");
    const quarantine = await zip.file("quarantine.json")?.async("string");

    await writeFile(path.join(CANON_DIR, `${example.name}.manifest.json`), manifest);
    await writeFile(path.join(CANON_DIR, `${example.name}.graph.json`), graphJson);
    if (journal) {
        await writeFile(path.join(CANON_DIR, `${example.name}.journal.jsonl`), journal);
    } else {
        await rm(path.join(CANON_DIR, `${example.name}.journal.jsonl`), { force: true });
    }
    if (quarantine) {
        await writeFile(path.join(CANON_DIR, `${example.name}.quarantine.json`), quarantine);
    } else {
        await rm(path.join(CANON_DIR, `${example.name}.quarantine.json`), { force: true });
    }
}

function fixtures(): ExampleFixture[] {
    const basicoData: GenraphGraphData = {
        schemaVersion: "0.4.0",
        graphId: "graph-basico-0001",
        createdAt: "2026-03-03T10:00:00.000Z",
        updatedAt: "2026-03-03T10:00:20.000Z",
        nodes: {
            "p-juan": {
                uid: "p-juan",
                type: "Person",
                xref: "@I1@",
                sex: "M",
                isLiving: false,
                createdAt: "2026-03-03T10:00:00.000Z",
            },
        },
        edges: {},
        claims: {
            "p-juan": {
                "person.name.full": [
                    {
                        uid: "c-juan-name-1",
                        nodeUid: "p-juan",
                        predicate: "person.name.full",
                        value: "Juan Perez",
                        provenance: {
                            actorId: "importer:fixture",
                            timestamp: 1772532005,
                            method: "fixture:basico",
                        },
                        quality: "reviewed",
                        lifecycle: "active",
                        evidenceGate: "unassessed",
                        isPreferred: true,
                        createdAt: "2026-03-03T10:00:05.000Z",
                    },
                ],
            },
        },
        quarantine: [],
    };

    const basicoOps: GenraphOperation[] = [
        {
            opId: "op-basico-0000",
            opSeq: 0,
            type: "ADD_NODE",
            timestamp: 1772532000,
            actorId: "importer:fixture",
            node: basicoData.nodes["p-juan"],
        },
        {
            opId: "op-basico-0001",
            opSeq: 1,
            type: "ADD_CLAIM",
            timestamp: 1772532005,
            actorId: "importer:fixture",
            claim: basicoData.claims["p-juan"]["person.name.full"][0],
        },
    ];

    const tipicoData: GenraphGraphData = {
        schemaVersion: "0.4.0",
        graphId: "graph-tipico-0001",
        createdAt: "2026-03-03T11:00:00.000Z",
        updatedAt: "2026-03-03T11:00:40.000Z",
        nodes: {
            "p-juan": {
                uid: "p-juan",
                type: "Person",
                xref: "@I1@",
                sex: "M",
                isLiving: false,
                createdAt: "2026-03-03T11:00:00.000Z",
            },
            "p-maria": {
                uid: "p-maria",
                type: "Person",
                xref: "@I2@",
                sex: "F",
                isLiving: false,
                createdAt: "2026-03-03T11:00:02.000Z",
            },
            "p-pedro": {
                uid: "p-pedro",
                type: "Person",
                xref: "@I3@",
                sex: "M",
                isLiving: true,
                createdAt: "2026-03-03T11:00:04.000Z",
            },
            "u-1": {
                uid: "u-1",
                type: "Union",
                unionType: "MARR",
                createdAt: "2026-03-03T11:00:06.000Z",
            },
        },
        edges: {
            "e-member-juan": {
                uid: "e-member-juan",
                type: "Member",
                fromUid: "p-juan",
                toUid: "u-1",
                role: "HUSB",
                createdAt: "2026-03-03T11:00:10.000Z",
            },
            "e-member-maria": {
                uid: "e-member-maria",
                type: "Member",
                fromUid: "p-maria",
                toUid: "u-1",
                role: "WIFE",
                createdAt: "2026-03-03T11:00:11.000Z",
            },
            "e-pc-juan-pedro": {
                uid: "e-pc-juan-pedro",
                type: "ParentChild",
                fromUid: "p-juan",
                toUid: "p-pedro",
                parentRole: "father",
                unionUid: "u-1",
                nature: "BIO",
                certainty: "high",
                createdAt: "2026-03-03T11:00:12.000Z",
            },
            "e-pc-maria-pedro": {
                uid: "e-pc-maria-pedro",
                type: "ParentChild",
                fromUid: "p-maria",
                toUid: "p-pedro",
                parentRole: "mother",
                unionUid: "u-1",
                nature: "BIO",
                certainty: "high",
                createdAt: "2026-03-03T11:00:13.000Z",
            },
        },
        claims: {
            "p-juan": {
                "person.name.full": [
                    {
                        uid: "c-tipico-juan-name",
                        nodeUid: "p-juan",
                        predicate: "person.name.full",
                        value: "Juan Perez",
                        provenance: { actorId: "importer:fixture", timestamp: 1772535601, method: "fixture:tipico" },
                        quality: "reviewed",
                        lifecycle: "active",
                        evidenceGate: "unassessed",
                        isPreferred: true,
                        createdAt: "2026-03-03T11:00:20.000Z",
                    },
                ],
            },
            "p-maria": {
                "person.name.full": [
                    {
                        uid: "c-tipico-maria-name",
                        nodeUid: "p-maria",
                        predicate: "person.name.full",
                        value: "Maria Lopez",
                        provenance: { actorId: "importer:fixture", timestamp: 1772535602, method: "fixture:tipico" },
                        quality: "reviewed",
                        lifecycle: "active",
                        evidenceGate: "unassessed",
                        isPreferred: true,
                        createdAt: "2026-03-03T11:00:21.000Z",
                    },
                ],
            },
            "p-pedro": {
                "person.name.full": [
                    {
                        uid: "c-tipico-pedro-name",
                        nodeUid: "p-pedro",
                        predicate: "person.name.full",
                        value: "Pedro Perez Lopez",
                        provenance: { actorId: "importer:fixture", timestamp: 1772535603, method: "fixture:tipico" },
                        quality: "raw",
                        lifecycle: "active",
                        evidenceGate: "unassessed",
                        isPreferred: true,
                        createdAt: "2026-03-03T11:00:22.000Z",
                    },
                ],
            },
        },
        quarantine: [],
    };

    const tipicoOps: GenraphOperation[] = [
        { opId: "op-tipico-0000", opSeq: 0, type: "ADD_NODE", timestamp: 1772535600, actorId: "importer:fixture", node: tipicoData.nodes["p-juan"] },
        { opId: "op-tipico-0001", opSeq: 1, type: "ADD_NODE", timestamp: 1772535601, actorId: "importer:fixture", node: tipicoData.nodes["p-maria"] },
        { opId: "op-tipico-0002", opSeq: 2, type: "ADD_NODE", timestamp: 1772535602, actorId: "importer:fixture", node: tipicoData.nodes["p-pedro"] },
        { opId: "op-tipico-0003", opSeq: 3, type: "ADD_NODE", timestamp: 1772535603, actorId: "importer:fixture", node: tipicoData.nodes["u-1"] },
        { opId: "op-tipico-0004", opSeq: 4, type: "ADD_EDGE", timestamp: 1772535604, actorId: "importer:fixture", edge: tipicoData.edges["e-member-juan"] },
        { opId: "op-tipico-0005", opSeq: 5, type: "ADD_EDGE", timestamp: 1772535605, actorId: "importer:fixture", edge: tipicoData.edges["e-member-maria"] },
        { opId: "op-tipico-0006", opSeq: 6, type: "ADD_EDGE", timestamp: 1772535606, actorId: "importer:fixture", edge: tipicoData.edges["e-pc-juan-pedro"] },
        { opId: "op-tipico-0007", opSeq: 7, type: "ADD_EDGE", timestamp: 1772535607, actorId: "importer:fixture", edge: tipicoData.edges["e-pc-maria-pedro"] },
        { opId: "op-tipico-0008", opSeq: 8, type: "ADD_CLAIM", timestamp: 1772535608, actorId: "importer:fixture", claim: tipicoData.claims["p-juan"]["person.name.full"][0] },
        { opId: "op-tipico-0009", opSeq: 9, type: "ADD_CLAIM", timestamp: 1772535609, actorId: "importer:fixture", claim: tipicoData.claims["p-maria"]["person.name.full"][0] },
        { opId: "op-tipico-0010", opSeq: 10, type: "ADD_CLAIM", timestamp: 1772535610, actorId: "importer:fixture", claim: tipicoData.claims["p-pedro"]["person.name.full"][0] },
    ];

    const edgecasesData: GenraphGraphData = {
        schemaVersion: "0.4.0",
        graphId: "graph-edgecases-0001",
        createdAt: "2026-03-03T12:00:00.000Z",
        updatedAt: "2026-03-03T12:01:00.000Z",
        nodes: {
            "p-ana": {
                uid: "p-ana",
                type: "Person",
                xref: "@I10@",
                sex: "F",
                isLiving: true,
                createdAt: "2026-03-03T12:00:00.000Z",
            },
        },
        edges: {},
        claims: {
            "p-ana": {
                "person.name.full": [
                    {
                        uid: "c-edge-ana-name-1",
                        nodeUid: "p-ana",
                        predicate: "person.name.full",
                        value: "Ana Ruiz",
                        provenance: { actorId: "importer:fixture", timestamp: 1772539201, method: "fixture:edgecases" },
                        quality: "verified",
                        lifecycle: "active",
                        evidenceGate: "direct",
                        isPreferred: true,
                        createdAt: "2026-03-03T12:00:10.000Z",
                        citations: [
                            {
                                sourceUid: "s-1",
                                page: "Folio 12",
                                transcription: "Acta legible",
                                confidence: 0.97,
                            },
                        ],
                    },
                    {
                        uid: "c-edge-ana-name-2",
                        nodeUid: "p-ana",
                        predicate: "person.name.full",
                        value: "Ana Ros",
                        provenance: { actorId: "importer:fixture", timestamp: 1772539202, method: "fixture:edgecases" },
                        quality: "raw",
                        lifecycle: "retracted",
                        evidenceGate: "unassessed",
                        isPreferred: false,
                        createdAt: "2026-03-03T12:00:20.000Z",
                    },
                ],
            },
        },
        quarantine: [
            {
                opId: "op-edge-0004",
                opSeq: 4,
                type: "QUARANTINE",
                timestamp: 1772539204,
                actorId: "importer:fixture",
                importId: "imp-edge-1",
                reason: "Unmapped GEDCOM extension",
                context: "@I10@",
                originalGedcomVersion: "5.5.1",
                ast: {
                    level: 1,
                    tag: "_CUSTOM",
                    value: "ROOT",
                    children: [
                        {
                            level: 2,
                            tag: "_CHILD",
                            value: "A",
                            children: [
                                { level: 3, tag: "_GRAND", value: "B", children: [] },
                            ],
                        },
                    ],
                    sourceLines: ["1 _CUSTOM ROOT", "2 _CHILD A", "3 _GRAND B"],
                },
            },
        ],
    };

    const edgecasesOps: GenraphOperation[] = [
        { opId: "op-edge-0000", opSeq: 0, type: "ADD_NODE", timestamp: 1772539200, actorId: "importer:fixture", node: edgecasesData.nodes["p-ana"] },
        { opId: "op-edge-0001", opSeq: 1, type: "ADD_CLAIM", timestamp: 1772539201, actorId: "importer:fixture", claim: edgecasesData.claims["p-ana"]["person.name.full"][0] },
        {
            opId: "op-edge-0002",
            opSeq: 2,
            type: "ADD_CLAIM",
            timestamp: 1772539202,
            actorId: "importer:fixture",
            claim: {
                ...edgecasesData.claims["p-ana"]["person.name.full"][1],
                lifecycle: "active",
            },
        },
        { opId: "op-edge-0003", opSeq: 3, type: "RETRACT_CLAIM", timestamp: 1772539203, actorId: "importer:fixture", claimUid: "c-edge-ana-name-2", reason: "Conflicts with cited source" },
        edgecasesData.quarantine[0],
    ];

    return [
        { name: "basico", data: basicoData, ops: basicoOps },
        { name: "tipico", data: tipicoData, ops: tipicoOps },
        { name: "edgecases", data: edgecasesData, ops: edgecasesOps },
    ];
}

async function main(): Promise<void> {
    await mkdir(CANON_DIR, { recursive: true });
    for (const example of fixtures()) {
        await writePackageAndCanon(example);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

