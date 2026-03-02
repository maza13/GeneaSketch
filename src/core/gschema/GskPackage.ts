/**
 * GSchema 0.1.x — GSK Package Serializer/Deserializer
 *
 * A .gsk file is a ZIP archive with the following structure:
 *
 *   my-tree.gsk
 *   ├── manifest.json        — Package metadata and stats
 *   ├── graph.json           — GSchemaGraph: nodes, edges, claims
 *   ├── journal.jsonl        — Append-only operation log (one JSON per line)
 *   ├── quarantine.json      — Unrecognized GEDCOM tags
 *   ├── media/               — Embedded media files
 *   │   └── <fileName>
 *   └── meta/
 *       ├── viewConfig.json  — UI view configuration
 *       └── visualConfig.json — Canvas positions and overrides
 *
 * Design principles:
 * - `graph.json` is the source of truth. `journal.jsonl` enables replay/audit.
 * - Media is stored as binary blobs, referenced by fileName in the MediaNode.
 * - `meta/` is purely UI state — loss of this file doesn't corrupt the tree.
 * - The format is versioned via `manifest.schemaVersion` (currently "0.1.0").
 */

import JSZip from "jszip";
import type { GskPackageManifest, GSchemaGraph as GSchemaGraphData, MediaNode } from "./types";
import { GSchemaGraph } from "./GSchemaGraph";
import { serializeJournalToJsonl } from "./Journal";
import type { ViewConfig, VisualConfig } from "@/types/domain";
import type { ColorThemeConfig } from "@/types/editor";

// ─────────────────────────────────────────────
// Package metadata
// ─────────────────────────────────────────────

export interface GskPackageMeta {
    viewConfig?: ViewConfig;
    visualConfig?: VisualConfig;
    colorTheme?: ColorThemeConfig;
}

// ─────────────────────────────────────────────
// Export: GSchemaGraph → .gsk Blob
// ─────────────────────────────────────────────

export interface GskExportOptions {
    meta?: GskPackageMeta;
    /** Whether to embed media binary data. Default: embed. */
    mediaPolicy?: "embed" | "reference";
}

/**
 * Serializes a GSchemaGraph to a .gsk ZIP package.
 * Returns a Blob ready for download or saving via Tauri.
 */
export async function exportGskPackage(
    graph: GSchemaGraph,
    options: GskExportOptions = {}
): Promise<Blob> {
    const zip = new JSZip();

    // ── 1. Manifest ──────────────────────────
    const manifest = graph.toManifest();
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // ── 2. Graph data ────────────────────────
    const graphData: GSchemaGraphData = graph.toData();
    // Strip media blobs from graph.json — they go in media/ folder
    const graphDataForJson: GSchemaGraphData = { ...graphData, nodes: { ...graphData.nodes } };
    if (options.mediaPolicy !== "reference") {
        // Remove dataUrl from media nodes in graph data — stored separately
        for (const [uid, node] of Object.entries(graphDataForJson.nodes)) {
            if (node.type === "Media" && (node as MediaNode).dataUrl) {
                graphDataForJson.nodes[uid] = { ...node, dataUrl: undefined } as MediaNode;
            }
        }
    }
    zip.file("graph.json", JSON.stringify(graphDataForJson, null, 2));

    // ── 3. Journal (JSONL) ───────────────────
    const journalStr = serializeJournalToJsonl(graph.getJournal());
    if (journalStr.length > 0) {
        zip.file("journal.jsonl", journalStr);
    }

    // ── 4. Quarantine ────────────────────────
    const quarantine = graph.getQuarantine();
    if (quarantine.length > 0) {
        zip.file("quarantine.json", JSON.stringify([...quarantine], null, 2));
    }

    // ── 5. Media ─────────────────────────────
    const mediaFolder = zip.folder("media")!;
    for (const node of graph.allNodes()) {
        if (node.type !== "Media") continue;
        const mediaNode = node as MediaNode;
        if (!mediaNode.dataUrl) continue;

        const fileName = mediaNode.fileName ?? mediaNode.uid;
        // Convert data URL to binary
        const binaryData = dataUrlToUint8Array(mediaNode.dataUrl);
        if (binaryData) {
            mediaFolder.file(fileName, binaryData, { binary: true });
        }
    }

    // ── 6. UI meta ───────────────────────────
    const metaFolder = zip.folder("meta")!;
    if (options.meta?.viewConfig) {
        metaFolder.file("viewConfig.json", JSON.stringify(options.meta.viewConfig, null, 2));
    }
    if (options.meta?.visualConfig) {
        metaFolder.file("visualConfig.json", JSON.stringify(options.meta.visualConfig, null, 2));
    }
    if (options.meta?.colorTheme) {
        metaFolder.file("colorTheme.json", JSON.stringify(options.meta.colorTheme, null, 2));
    }

    return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

// ─────────────────────────────────────────────
// Import: .gsk Blob → GSchemaGraph
// ─────────────────────────────────────────────

export interface GskImportResult {
    graph: GSchemaGraph;
    manifest: GskPackageManifest;
    meta: GskPackageMeta;
    /** Errors encountered during loading (non-fatal). */
    warnings: string[];
}

/**
 * Deserializes a .gsk ZIP package into a GSchemaGraph.
 */
export async function importGskPackage(
    file: File | Blob | ArrayBuffer | Uint8Array
): Promise<GskImportResult> {
    const warnings: string[] = [];
    const zip = await JSZip.loadAsync(file);

    // ── 1. Read manifest ─────────────────────
    const manifestRaw = await zip.file("manifest.json")?.async("string");
    if (!manifestRaw) throw new Error("Invalid .gsk: missing manifest.json");
    const manifest: GskPackageManifest = JSON.parse(manifestRaw);

    // ── 2. Read graph ────────────────────────
    const graphRaw = await zip.file("graph.json")?.async("string");
    if (!graphRaw) throw new Error("Invalid .gsk: missing graph.json");
    const graphData: GSchemaGraphData = JSON.parse(graphRaw);

    // ── 3. Load media back into graph nodes ──
    const mediaFiles = zip.folder("media");
    if (mediaFiles) {
        for (const [fileName, zipEntry] of Object.entries(zip.files)) {
            if (!fileName.startsWith("media/") || zipEntry.dir) continue;
            const baseName = fileName.replace(/^media\//, "");
            // Find the media node matching this fileName
            for (const [uid, node] of Object.entries(graphData.nodes)) {
                if (node.type === "Media" && (node as MediaNode).fileName === baseName) {
                    try {
                        const bytes = await zipEntry.async("uint8array");
                        const mimeType = (node as MediaNode).mimeType ?? guessMimeFromFileName(baseName);
                        (graphData.nodes[uid] as MediaNode).dataUrl = uint8ArrayToDataUrl(bytes, mimeType);
                    } catch {
                        warnings.push(`Could not load media file: ${fileName}`);
                    }
                }
            }
        }
    }

    // ── 4. Reconstruct graph ─────────────────
    const graph = GSchemaGraph.fromData(graphData);

    // ── 5. Replay journal (optional, for future CRDT) ──
    // Journal is informational at load time. graph.json is the source of truth.
    // In future CRDT sync, the journal will be used for merging across devices.
    await zip.file("journal.jsonl")?.async("string"); // pre-load for future use

    // ── 6. Read UI meta ──────────────────────
    const meta: GskPackageMeta = {};
    const viewConfigRaw = await zip.file("meta/viewConfig.json")?.async("string");
    if (viewConfigRaw) {
        try { meta.viewConfig = JSON.parse(viewConfigRaw); } catch { warnings.push("Could not parse viewConfig.json"); }
    }
    const visualConfigRaw = await zip.file("meta/visualConfig.json")?.async("string");
    if (visualConfigRaw) {
        try { meta.visualConfig = JSON.parse(visualConfigRaw); } catch { warnings.push("Could not parse visualConfig.json"); }
    }
    const colorThemeRaw = await zip.file("meta/colorTheme.json")?.async("string");
    if (colorThemeRaw) {
        try { meta.colorTheme = JSON.parse(colorThemeRaw); } catch { warnings.push("Could not parse colorTheme.json"); }
    }

    // Validate the loaded graph
    const validation = graph.validate();
    if (!validation.isValid) {
        const errors = validation.issues.filter(i => i.severity === "error");
        warnings.push(...errors.map(e => `Graph validation: ${e.code} — ${e.message}`));
    }

    return { graph, manifest, meta, warnings };
}

// ─────────────────────────────────────────────
// Media conversion utilities
// ─────────────────────────────────────────────

function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
    try {
        const comma = dataUrl.indexOf(",");
        if (comma === -1) return null;
        const base64 = dataUrl.slice(comma + 1);
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    } catch {
        return null;
    }
}

function uint8ArrayToDataUrl(bytes: Uint8Array, mimeType: string): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return `data:${mimeType};base64,${btoa(binary)}`;
}

function guessMimeFromFileName(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mimes: Record<string, string> = {
        jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
        gif: "image/gif", webp: "image/webp", pdf: "application/pdf",
    };
    return mimes[ext ?? ""] ?? "application/octet-stream";
}

