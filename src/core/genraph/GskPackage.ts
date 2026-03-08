/**
 * Genraph 0.2.x - GSK Package Serializer/Deserializer
 */

import JSZip from "jszip";
import type {
    GskPackageManifest,
    GenraphGraph as GenraphGraphData,
    MediaNode,
    GenraphEdge,
    QuarantineOperation,
    GskMediaEntry,
    GskIntegrityEntry,
    GskSecurityBlock,
    GenraphOperation,
} from "./types";
import { GenraphGraph } from "./GenraphGraph";
import {
    serializeJournalToJsonl,
    parseJournalFromJsonl,
    replayJournalWithReport,
    applyJournalOps,
    validateOpSeq,
    computeJournalHash,
} from "./Journal";
import { validateGenraphGraph } from "./validation";
import { countMissingParentChildUnionLinks, ensureParentChildUnionLinks } from "./FamilyNormalization";
import { findUnknownEdgeAddOps, findUnknownEdges } from "./EdgeNormalization";
import type { ViewConfig, VisualConfig } from "@/types/domain";
import type { ColorThemeConfig } from "@/types/editor";
import { canonicalizeJson } from "./canonicalJson";
import type { GskImportMode } from "./errorCatalog";
import { ERROR_CATALOG, ERROR_CODES, isGskModeEntry } from "./errorCatalog";
import { computeSha256FromBytes, computeSha256FromString } from "@/core/crypto/sha256";

export interface GskPackageMeta {
    viewConfig?: ViewConfig;
    visualConfig?: VisualConfig;
    colorTheme?: ColorThemeConfig;
}

export interface GskExportOptions {
    /**
     * Legacy app metadata. Ignored by core-only export schema >= 0.5.0.
     * Kept temporarily for call-site compatibility.
     */
    meta?: GskPackageMeta;
    mediaPolicy?: "embed" | "reference";
}

export interface GskImportOptions {
    strict?: boolean;
    mode?: GskImportMode;
}

export async function exportGskPackage(
    graph: GenraphGraph,
    options: GskExportOptions = {}
): Promise<Blob> {
    const zip = new JSZip();

    const graphData: GenraphGraphData = graph.toData();
    const graphDataForJson: GenraphGraphData = {
        ...graphData,
        schemaVersion: CORE_ONLY_SCHEMA_VERSION,
        nodes: { ...graphData.nodes },
    };
    if (options.mediaPolicy !== "reference") {
        for (const [uid, node] of Object.entries(graphDataForJson.nodes)) {
            if (node.type === "Media" && (node as MediaNode).dataUrl) {
                graphDataForJson.nodes[uid] = { ...node, dataUrl: undefined } as MediaNode;
            }
        }
    }

    const journalOps = graph.getJournal();
    const journalStr = serializeJournalToJsonl(journalOps);

    const manifest = graph.toManifest();
    manifest.schemaVersion = CORE_ONLY_SCHEMA_VERSION;
    manifest.journalHeadOpSeq = journalOps.reduce((max, op) => Math.max(max, op.opSeq), -1);
    manifest.graphDerivedFromOpSeq = manifest.journalHeadOpSeq;
    const graphJsonStr = JSON.stringify(graphDataForJson, null, 2);
    const graphCanonicalStr = canonicalizeJson(graphDataForJson);
    manifest.graphHash = await computeSha256FromString(graphCanonicalStr);
    if (journalStr.length > 0) {
        manifest.journalHash = await computeJournalHash(journalOps);
    }
    manifest.security = manifest.security ?? {
        mode: "none",
        signature: { mode: "none" },
        encryption: { mode: "none" },
    } satisfies GskSecurityBlock;
    manifest.encryption = manifest.encryption ?? "none";
    manifest.signature = manifest.signature ?? "none";
    zip.file("graph.json", graphJsonStr);

    if (journalStr.length > 0) {
        zip.file("journal.jsonl", journalStr);
    }

    const quarantine = graph.getQuarantine();
    const quarantineArr = [...quarantine];
    if (quarantine.length > 0) {
        zip.file("quarantine.json", JSON.stringify(quarantineArr, null, 2));
    }

    const mediaFolder = zip.folder("media")!;
    const mediaEntries: GskMediaEntry[] = [];
    for (const node of graph.allNodes()) {
        if (node.type !== "Media") continue;
        const mediaNode = node as MediaNode;
        if (!mediaNode.dataUrl) continue;

        const fileName = mediaNode.fileName ?? mediaNode.uid;
        const binaryData = dataUrlToUint8Array(mediaNode.dataUrl);
        if (binaryData) {
            const path = `media/${fileName}`;
            mediaFolder.file(fileName, binaryData, { binary: true });
            mediaEntries.push({
                uid: mediaNode.uid,
                path,
                sha256: await computeSha256FromBytes(binaryData),
                bytes: binaryData.byteLength,
                mime: mediaNode.mimeType ?? guessMimeFromFileName(fileName),
            });
        }
    }
    mediaEntries.sort((a, b) => a.path.localeCompare(b.path));
    manifest.mediaEntries = mediaEntries;

    const integrityEntries: GskIntegrityEntry[] = [];
    integrityEntries.push({
        path: "graph.json",
        sha256: await computeSha256FromString(graphCanonicalStr),
        bytes: new TextEncoder().encode(graphCanonicalStr).byteLength,
        role: "graph",
        canonicalized: true,
    });
    if (journalStr.length > 0) {
        integrityEntries.push({
            path: "journal.jsonl",
            sha256: await computeSha256FromString(journalStr),
            bytes: new TextEncoder().encode(journalStr).byteLength,
            role: "journal",
            canonicalized: true,
        });
    }
    if (quarantineArr.length > 0) {
        const quarantineCanonical = canonicalizeJson(quarantineArr);
        integrityEntries.push({
            path: "quarantine.json",
            sha256: await computeSha256FromString(quarantineCanonical),
            bytes: new TextEncoder().encode(quarantineCanonical).byteLength,
            role: "quarantine",
            canonicalized: true,
        });
    }
    for (const mediaEntry of mediaEntries) {
        integrityEntries.push({
            path: mediaEntry.path,
            sha256: mediaEntry.sha256,
            bytes: mediaEntry.bytes,
            role: "media",
            canonicalized: false,
        });
    }
    const entriesWithoutManifest = [...integrityEntries].sort((a, b) => a.path.localeCompare(b.path));
    manifest.integrity = {
        algorithm: "sha256",
        packageHash: "",
        entries: entriesWithoutManifest,
    };
    const manifestCanonicalForHash = canonicalizeJson({
        ...manifest,
        integrity: { ...manifest.integrity, packageHash: "" },
    });
    const manifestEntry: GskIntegrityEntry = {
        path: "manifest.json",
        sha256: await computeSha256FromString(manifestCanonicalForHash),
        bytes: new TextEncoder().encode(manifestCanonicalForHash).byteLength,
        role: "manifest",
        canonicalized: true,
    };
    const entriesWithManifest = [...entriesWithoutManifest, manifestEntry].sort((a, b) => a.path.localeCompare(b.path));
    manifest.integrity.entries = entriesWithManifest;
    manifest.integrity.packageHash = await computeSha256FromString(canonicalizeJson(entriesWithManifest));

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export interface GskImportResult {
    graph: GenraphGraph;
    manifest: GskPackageManifest;
    meta: GskPackageMeta;
    warnings: string[];
}

const CLAIM_INVARIANT_CODES = new Set([
    "PREFERRED_CLAIM_REQUIRED",
    "MULTIPLE_PREFERRED_CLAIMS",
    "CLAIMS_NOT_CANONICAL_ORDER",
    "RETRACTED_CLAIM_IS_PREFERRED",
]);

const PARENT_CHILD_UNION_CODES = new Set([
    "PARENT_CHILD_MISSING_UNION",
    "PARENT_CHILD_INVALID_UNION",
    "PARENT_CHILD_PARENT_NOT_MEMBER",
]);

const EDGE_UNKNOWN_CODES = new Set([
    "EDGE_TYPE_UNKNOWN",
]);

const APP_META_PATHS = [
    "meta/viewConfig.json",
    "meta/visualConfig.json",
    "meta/colorTheme.json",
] as const;

const CORE_ONLY_SCHEMA_VERSION = "0.5.0";

function resolveImportMode(options: GskImportOptions): GskImportMode {
    if (options.mode) return options.mode;
    if (options.strict === false) return "compat";
    return "strict-lossless";
}

function isStrictMode(mode: GskImportMode): boolean {
    return mode !== "compat";
}

function isAuditMode(mode: GskImportMode): boolean {
    return mode === "strict-lossless-audit";
}

function isErrorForMode(code: string, mode: GskImportMode): boolean {
    const entry = ERROR_CATALOG[code];
    if (!entry) return mode !== "compat";
    if (!isGskModeEntry(entry)) {
        return entry.severity === "error";
    }
    return entry.severityByMode[mode] === "error";
}

function reportByMode(warnings: string[], mode: GskImportMode, code: string, message: string): void {
    if (isErrorForMode(code, mode)) {
        throw new Error(`CRITICAL: ${message} (${code})`);
    }
    warnings.push(`${message} (${code})`);
}

function canonicalizeQuarantineCollection(entries: unknown[]): string[] {
    return entries
        .map((entry) => canonicalizeJson(entry))
        .sort((a, b) => a.localeCompare(b));
}

function hasExactQuarantineMirror(graphQuarantine: unknown[], externalQuarantine: unknown[]): boolean {
    const left = canonicalizeQuarantineCollection(graphQuarantine);
    const right = canonicalizeQuarantineCollection(externalQuarantine);
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i++) {
        if (left[i] !== right[i]) return false;
    }
    return true;
}

function nextQuarantineOpSeq(graphData: GenraphGraphData, journalOps: ReturnType<typeof parseJournalFromJsonl>): number {
    const maxQ = graphData.quarantine.reduce((max, q) => Math.max(max, q.opSeq), -1);
    const maxJ = journalOps.reduce((max, op) => Math.max(max, op.opSeq), -1);
    return Math.max(maxQ, maxJ) + 1;
}

function quarantineUnknownEdge(
    graphData: GenraphGraphData,
    edge: GenraphEdge,
    context: string,
    timestamp: number,
    opSeq: number,
    sourceLine: string
): QuarantineOperation {
    const entry: QuarantineOperation = {
        opId: `quarantine:unknown-edge:${context}`,
        opSeq,
        type: "QUARANTINE",
        timestamp,
        actorId: "system_importer",
        importId: `import:${graphData.graphId}`,
        ast: {
            level: 1,
            tag: "_GSK_EDGE_UNKNOWN",
            value: JSON.stringify(edge),
            children: [],
            sourceLines: [sourceLine],
        },
        reason: "unknown_edge_type",
        context,
    };
    graphData.quarantine.push(entry);
    return entry;
}

type LegacyClaimShape = {
    status?: "raw" | "reviewed" | "verified" | "disputed" | "retracted";
    quality?: "raw" | "reviewed" | "verified" | "disputed";
    lifecycle?: "active" | "retracted";
    isPreferred?: boolean;
};

type LegacyQuarantineShape = {
    importId?: string;
    rawTag?: string;
    rawValue?: string;
    ast?: {
        level: number;
        tag: string;
        value?: string;
        pointer?: string;
        children: unknown[];
        sourceLines?: string[];
    };
    reason?: string;
    context?: string;
    originalGedcomVersion?: string;
};

function isLegacyBefore040(schemaVersion: string): boolean {
    return schemaVersion.startsWith("0.1.") || schemaVersion.startsWith("0.2.") || schemaVersion.startsWith("0.3.");
}

type SemVerTuple = [number, number, number];

function parseSemVerTuple(version: string): SemVerTuple | null {
    const normalized = version.trim().replace(/^v/i, "");
    const core = normalized.split("-", 1)[0];
    const rawParts = core.split(".");
    if (rawParts.length < 2 || rawParts.length > 3) return null;
    const parts: number[] = [];
    for (let i = 0; i < 3; i++) {
        const token = rawParts[i] ?? "0";
        if (!/^\d+$/.test(token)) return null;
        parts.push(Number(token));
    }
    return [parts[0], parts[1], parts[2]];
}

function compareSemVer(versionA: string, versionB: string): number {
    const parsedA = parseSemVerTuple(versionA);
    const parsedB = parseSemVerTuple(versionB);
    if (!parsedA || !parsedB) {
        return versionA.localeCompare(versionB, undefined, { numeric: true, sensitivity: "base" });
    }
    for (let i = 0; i < 3; i++) {
        if (parsedA[i] > parsedB[i]) return 1;
        if (parsedA[i] < parsedB[i]) return -1;
    }
    return 0;
}

export function isCoreOnlySchema(schemaVersion: string): boolean {
    return compareSemVer(schemaVersion, CORE_ONLY_SCHEMA_VERSION) >= 0;
}

export function isLegacySchema(schemaVersion: string): boolean {
    return compareSemVer(schemaVersion, CORE_ONLY_SCHEMA_VERSION) < 0;
}

function listPresentAppMetaPaths(zip: JSZip): string[] {
    return APP_META_PATHS.filter((path) => Boolean(zip.file(path)));
}

async function readLegacyMeta(zip: JSZip, warnings: string[]): Promise<GskPackageMeta> {
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
    return meta;
}

function manifestPreimage(manifest: GskPackageManifest): unknown {
    if (!manifest.integrity) return manifest;
    const entriesWithoutManifest = manifest.integrity.entries
        .filter((entry) => entry.path !== "manifest.json")
        .sort((a, b) => a.path.localeCompare(b.path));
    return {
        ...manifest,
        integrity: {
            ...manifest.integrity,
            packageHash: "",
            entries: entriesWithoutManifest,
        },
    };
}

async function computeCanonicalJsonHashFromString(raw: string): Promise<{ sha256: string; bytes: number }> {
    const parsed = JSON.parse(raw);
    const canonical = canonicalizeJson(parsed);
    const bytes = new TextEncoder().encode(canonical);
    return {
        sha256: await computeSha256FromBytes(bytes),
        bytes: bytes.byteLength,
    };
}

async function verifySecurityContract(manifest: GskPackageManifest, mode: GskImportMode, warnings: string[]): Promise<void> {
    const security = manifest.security;
    if (security) {
        if (security.mode !== "none" || security.signature.mode !== "none" || security.encryption.mode !== "none") {
            reportByMode(
                warnings,
                mode,
                "SECURITY_MODE_UNSUPPORTED",
                "Unsupported security mode for current runtime"
            );
        }
        return;
    }
    if ((manifest.signature && manifest.signature !== "none") || (manifest.encryption && manifest.encryption !== "none")) {
        reportByMode(
            warnings,
            mode,
            "SECURITY_MODE_UNSUPPORTED",
            "Legacy manifest security fields request unsupported mode"
        );
    }
}

async function verifyIntegrityBlock(
    zip: JSZip,
    manifest: GskPackageManifest,
    mode: GskImportMode,
    warnings: string[]
): Promise<void> {
    if (!manifest.integrity || manifest.integrity.entries.length === 0) return;

    const declaredEntries = [...manifest.integrity.entries].sort((a, b) => a.path.localeCompare(b.path));
    const declaredPackageHash = manifest.integrity.packageHash;
    const recalculatedPackageHash = await computeSha256FromString(canonicalizeJson(declaredEntries));
    if (recalculatedPackageHash !== declaredPackageHash) {
        reportByMode(
            warnings,
            mode,
            "PACKAGE_HASH_MISMATCH",
            "package integrity hash mismatch detected"
        );
    }

    for (const entry of declaredEntries) {
        try {
            let actualHash = "";
            let actualBytes = 0;
            if (entry.path === "manifest.json") {
                const preimage = canonicalizeJson(manifestPreimage(manifest));
                actualHash = await computeSha256FromString(preimage);
                actualBytes = new TextEncoder().encode(preimage).byteLength;
            } else if (entry.path === "journal.jsonl" && entry.canonicalized) {
                const raw = await zip.file(entry.path)?.async("string");
                if (!raw) {
                    reportByMode(warnings, mode, "PACKAGE_HASH_MISMATCH", `integrity entry missing file: ${entry.path}`);
                    continue;
                }
                const parsed = parseJournalFromJsonl(raw);
                const canonical = serializeJournalToJsonl(parsed);
                actualHash = await computeSha256FromString(canonical);
                actualBytes = new TextEncoder().encode(canonical).byteLength;
            } else if (entry.canonicalized && entry.path.endsWith(".json")) {
                const raw = await zip.file(entry.path)?.async("string");
                if (!raw) {
                    const code = entry.role === "media" ? "MEDIA_ENTRY_MISSING" : "PACKAGE_HASH_MISMATCH";
                    reportByMode(warnings, mode, code, `integrity entry missing file: ${entry.path}`);
                    continue;
                }
                const canonical = await computeCanonicalJsonHashFromString(raw);
                actualHash = canonical.sha256;
                actualBytes = canonical.bytes;
            } else {
                const raw = await zip.file(entry.path)?.async("uint8array");
                if (!raw) {
                    const code = entry.role === "media" ? "MEDIA_ENTRY_MISSING" : "PACKAGE_HASH_MISMATCH";
                    reportByMode(warnings, mode, code, `integrity entry missing file: ${entry.path}`);
                    continue;
                }
                actualHash = await computeSha256FromBytes(raw);
                actualBytes = raw.byteLength;
            }

            if (actualHash !== entry.sha256 || actualBytes !== entry.bytes) {
                const code = entry.role === "media" ? "MEDIA_HASH_MISMATCH" : "PACKAGE_HASH_MISMATCH";
                reportByMode(
                    warnings,
                    mode,
                    code,
                    `integrity mismatch for ${entry.path}`
                );
            }
        } catch (error) {
            if (error instanceof Error && error.message.startsWith("CRITICAL:")) {
                throw error;
            }
            reportByMode(
                warnings,
                mode,
                "PACKAGE_HASH_MISMATCH",
                `integrity verification failed for ${entry.path}`
            );
        }
    }
}

function migrateLegacyClaim(claim: LegacyClaimShape): void {
    if (!claim.quality) {
        if (claim.status && claim.status !== "retracted") {
            claim.quality = claim.status;
        } else {
            claim.quality = "raw";
        }
    }
    if (!claim.lifecycle) {
        claim.lifecycle = claim.status === "retracted" ? "retracted" : "active";
    }
    if (claim.lifecycle === "retracted") {
        claim.isPreferred = false;
    }
}

function migrateLegacyClaimModel(graphData: GenraphGraphData): void {
    for (const byPredicate of Object.values(graphData.claims)) {
        for (const claims of Object.values(byPredicate)) {
            for (const claim of claims as LegacyClaimShape[]) {
                migrateLegacyClaim(claim);
            }
        }
    }
}

function migrateLegacyClaimOps(ops: ReturnType<typeof parseJournalFromJsonl>): void {
    for (const op of ops) {
        if (op.type === "ADD_CLAIM") {
            migrateLegacyClaim(op.claim as unknown as LegacyClaimShape);
        }
    }
}

function migrateLegacyQuarantineEntry(entry: LegacyQuarantineShape): void {
    if (entry.ast) return;
    const tag = entry.rawTag ?? "_UNKNOWN";
    entry.ast = {
        level: 1,
        tag,
        value: entry.rawValue,
        children: [],
        sourceLines: entry.rawValue ? [`1 ${tag} ${entry.rawValue}`] : [`1 ${tag}`],
    };
}

function migrateLegacyQuarantineModel(graphData: GenraphGraphData): void {
    for (const q of graphData.quarantine as LegacyQuarantineShape[]) {
        migrateLegacyQuarantineEntry(q);
    }
}

function migrateLegacyQuarantineOps(ops: ReturnType<typeof parseJournalFromJsonl>): void {
    for (const op of ops) {
        if (op.type === "QUARANTINE") {
            migrateLegacyQuarantineEntry(op as unknown as LegacyQuarantineShape);
        }
    }
}

export async function importGskPackage(
    file: File | Blob | ArrayBuffer | Uint8Array,
    options: GskImportOptions = {}
): Promise<GskImportResult> {
    const mode = resolveImportMode(options);
    const strict = isStrictMode(mode);
    const audit = isAuditMode(mode);
    const warnings: string[] = [];
    const zip = await JSZip.loadAsync(file);

    const manifestRaw = await zip.file("manifest.json")?.async("string");
    if (!manifestRaw) throw new Error("Invalid .gsk: missing manifest.json");
    const manifest: GskPackageManifest = JSON.parse(manifestRaw);
    await verifySecurityContract(manifest, mode, warnings);
    await verifyIntegrityBlock(zip, manifest, mode, warnings);
    const presentAppMetaPaths = listPresentAppMetaPaths(zip);
    if (presentAppMetaPaths.length > 0) {
        if (isCoreOnlySchema(manifest.schemaVersion)) {
            reportByMode(
                warnings,
                mode,
                ERROR_CODES.CORE_META_FORBIDDEN,
                `schemaVersion ${manifest.schemaVersion} forbids app metadata files: ${presentAppMetaPaths.join(", ")}`
            );
        } else if (isLegacySchema(manifest.schemaVersion)) {
            reportByMode(
                warnings,
                mode,
                ERROR_CODES.LEGACY_META_EXTENSION_DETECTED,
                `legacy app metadata extension detected: ${presentAppMetaPaths.join(", ")}`
            );
        }
    }

    const journalRaw = await zip.file("journal.jsonl")?.async("string");
    const journalLineCount = (journalRaw ?? "")
        .split("\n")
        .filter((line) => line.trim().length > 0).length;
    const journalOps = journalRaw ? parseJournalFromJsonl(journalRaw) : [];
    const syntheticRepairOps: GenraphOperation[] = [];
    if (manifest.schemaVersion.startsWith("0.1.")) {
        migrateLegacyClaimOps(journalOps);
    }
    if (isLegacyBefore040(manifest.schemaVersion)) {
        migrateLegacyQuarantineOps(journalOps);
    }
    const unknownJournalAddEdges = findUnknownEdgeAddOps(journalOps);
    if (unknownJournalAddEdges.length > 0 && strict) {
        const summary = unknownJournalAddEdges
            .map((item) => `${item.edgeUid}:${item.edgeType}@${item.opSeq}`)
            .join(", ");
        throw new Error(`CRITICAL: journal.jsonl contains unknown edge types in strict mode (EDGE_TYPE_UNKNOWN_IN_JOURNAL: ${summary})`);
    }

    const seqCheck = validateOpSeq(journalOps);
    let journalValid = journalRaw ? (journalOps.length === journalLineCount && seqCheck.ok) : false;

    if (journalRaw && journalOps.length !== journalLineCount) {
        if (strict) throw new Error("CRITICAL: journal.jsonl contains malformed lines in strict mode");
        warnings.push("journal.jsonl contains malformed lines.");
    }
    if (journalRaw && !seqCheck.ok) {
        if (strict) throw new Error(`CRITICAL: journal.jsonl opSeq is invalid in strict mode: ${seqCheck.reason} (gap/disorder)`);
        warnings.push(`journal.jsonl opSeq is invalid: ${seqCheck.reason}`);
    }

    if (journalRaw && manifest.journalHash) {
        const computedHash = await computeJournalHash(journalOps);
        if (computedHash !== manifest.journalHash) {
            if (audit) {
                reportByMode(warnings, mode, "JOURNAL_HASH_MISMATCH", "journal.jsonl hash mismatch detected");
            } else {
                warnings.push("journal.jsonl hash mismatch detected. (JOURNAL_HASH_MISMATCH)");
            }
            journalValid = false;
        }
    }

    const journalLastOpSeq = journalOps.reduce((max, op) => Math.max(max, op.opSeq), -1);
    if (journalRaw && manifest.journalHeadOpSeq !== journalLastOpSeq) {
        warnings.push(
            `Manifest/journal head mismatch: manifest=${manifest.journalHeadOpSeq}, journal=${journalLastOpSeq}`
        );
    }
    if (audit && journalRaw && !journalValid) {
        reportByMode(
            warnings,
            mode,
            "JOURNAL_HASH_MISMATCH",
            "journal is present but invalid in strict-lossless-audit mode"
        );
    }

    const graphRaw = await zip.file("graph.json")?.async("string");
    let graphData: GenraphGraphData | null = null;
    if (!graphRaw) {
        warnings.push("Missing graph.json");
    } else {
        try {
            graphData = JSON.parse(graphRaw) as GenraphGraphData;
            if (manifest.schemaVersion.startsWith("0.1.")) {
                migrateLegacyClaimModel(graphData);
                warnings.push("Legacy 0.1.x claim model migrated: status -> quality/lifecycle.");
            }
            if (isLegacyBefore040(manifest.schemaVersion)) {
                migrateLegacyQuarantineModel(graphData);
                warnings.push("Legacy quarantine migrated: rawTag/rawValue -> ast.");
            }
            if (!Array.isArray(graphData.quarantine)) {
                if (strict) {
                    throw new Error("CRITICAL: graph.json quarantine is not an array in strict mode (QUARANTINE_MIRROR_MISMATCH)");
                }
                graphData.quarantine = [];
                warnings.push("Compat warning: graph.json quarantine is not an array; using empty quarantine.");
            }
        } catch {
            warnings.push("Could not parse graph.json");
        }
    }

    if (graphRaw && manifest.graphHash) {
        let computedGraphHash = "";
        try {
            const canonical = graphData ? canonicalizeJson(graphData) : canonicalizeJson(JSON.parse(graphRaw));
            computedGraphHash = await computeSha256FromString(canonical);
        } catch {
            computedGraphHash = await computeSha256FromString(graphRaw);
        }
        if (computedGraphHash !== manifest.graphHash) {
            if (strict) {
                reportByMode(warnings, mode, "GRAPH_HASH_MISMATCH", "graph.json hash mismatch in strict mode");
            } else {
                warnings.push("graph.json hash mismatch detected. (GRAPH_HASH_MISMATCH)");
            }
        }
    }

    const quarantineRaw = await zip.file("quarantine.json")?.async("string");
    let externalQuarantine: any[] = [];
    if (quarantineRaw) {
        try {
            const parsed = JSON.parse(quarantineRaw);
            if (!Array.isArray(parsed)) {
                if (strict) throw new Error("CRITICAL: quarantine.json is not an array in strict mode (QUARANTINE_MIRROR_MISMATCH)");
                warnings.push("Compat warning: quarantine.json is not an array (QUARANTINE_MIRROR_MISMATCH).");
            } else {
                externalQuarantine = parsed;
                if (isLegacyBefore040(manifest.schemaVersion)) {
                    for (const entry of externalQuarantine as LegacyQuarantineShape[]) {
                        migrateLegacyQuarantineEntry(entry);
                    }
                }
            }
        } catch (error) {
            if (strict) {
                const message = error instanceof Error ? error.message : "CRITICAL: Could not parse quarantine.json in strict mode";
                throw new Error(message);
            }
            warnings.push("Could not parse quarantine.json");
        }
    }

    if (graphData) {
        const hasQuarantineFile = quarantineRaw !== undefined;
        const hasGraphQuarantine = graphData.quarantine.length > 0;
        const quarantineMirrorEqual = hasQuarantineFile
            ? hasExactQuarantineMirror(graphData.quarantine, externalQuarantine)
            : !hasGraphQuarantine;

        if (strict && hasGraphQuarantine && !hasQuarantineFile) {
            throw new Error("CRITICAL: quarantine mirror missing in strict mode (QUARANTINE_MIRROR_MISSING)");
        }
        if (strict && hasQuarantineFile && !quarantineMirrorEqual) {
            throw new Error("CRITICAL: quarantine mirror mismatch in strict mode (QUARANTINE_MIRROR_MISMATCH)");
        }
        if (!strict && hasGraphQuarantine && !hasQuarantineFile) {
            warnings.push("Compat warning: quarantine mirror missing; using graph.json.quarantine as source of truth (QUARANTINE_MIRROR_MISSING).");
        }
        if (!strict && hasQuarantineFile && !quarantineMirrorEqual) {
            warnings.push("Compat warning: quarantine mirror mismatch; using graph.json.quarantine as source of truth (QUARANTINE_MIRROR_MISMATCH).");
        }

        const unknownSnapshotEdges = findUnknownEdges(graphData.edges);
        if (unknownSnapshotEdges.length > 0) {
            const summary = unknownSnapshotEdges.map((edge) => `${edge.uid}:${edge.type}`).join(", ");
            if (strict) {
                throw new Error(`CRITICAL: graph.json contains unknown edge types in strict mode (EDGE_TYPE_UNKNOWN: ${summary})`);
            }
            let opSeq = nextQuarantineOpSeq(graphData, journalOps);
            for (const unknown of unknownSnapshotEdges) {
                delete graphData.edges[unknown.uid];
                quarantineUnknownEdge(
                    graphData,
                    unknown.edge,
                    unknown.uid,
                    Math.floor(Date.now() / 1000),
                    opSeq++,
                    JSON.stringify(unknown.edge)
                );
                warnings.push(`Compat quarantine: unknown edge type skipped from snapshot (${unknown.uid}:${unknown.type}).`);
            }
        }

        if (unknownJournalAddEdges.length > 0 && !strict) {
            let opSeq = nextQuarantineOpSeq(graphData, journalOps);
            for (const item of unknownJournalAddEdges) {
                quarantineUnknownEdge(
                    graphData,
                    (item.op as any).edge,
                    item.edgeUid,
                    item.op.timestamp,
                    opSeq++,
                    JSON.stringify(item.op)
                );
                warnings.push(`Compat quarantine: unknown ADD_EDGE op skipped (${item.edgeUid}:${item.edgeType}@${item.opSeq}).`);
            }
        }

        const missingUnionLinks = countMissingParentChildUnionLinks(graphData);
        if (missingUnionLinks > 0) {
            if (strict) {
                throw new Error(
                    `CRITICAL: graph.json violates parent-child union invariants in strict mode (PARENT_CHILD_MISSING_UNION x${missingUnionLinks})`
                );
            }
            const repair = ensureParentChildUnionLinks(graphData);
            let nextSeq = nextQuarantineOpSeq(graphData, journalOps);
            const repairTimestamp = Math.floor(Date.now() / 1000);
            const repairMethod = "compat:repair:parentchild-union:v1";
            for (const ctx of repair.repairsByChild) {
                syntheticRepairOps.push({
                    opId: `repair:create-union:${ctx.unionUid}`,
                    opSeq: nextSeq++,
                    type: "REPAIR_CREATE_UNION",
                    timestamp: repairTimestamp,
                    actorId: "system_importer",
                    synthetic: true,
                    method: repairMethod,
                    unionUid: ctx.unionUid,
                    childUid: ctx.childUid,
                    parentUids: ctx.parentUids,
                });
            }
            for (const member of repair.createdMemberEdges) {
                syntheticRepairOps.push({
                    opId: `repair:create-member:${member.edgeUid}`,
                    opSeq: nextSeq++,
                    type: "REPAIR_CREATE_MEMBER_EDGE",
                    timestamp: repairTimestamp,
                    actorId: "system_importer",
                    synthetic: true,
                    method: repairMethod,
                    edgeUid: member.edgeUid,
                    unionUid: member.unionUid,
                    parentUid: member.parentUid,
                    role: member.role,
                });
            }
            for (const relink of repair.relinkedParentChildEdges) {
                syntheticRepairOps.push({
                    opId: `repair:relink-parentchild:${relink.edgeUid}`,
                    opSeq: nextSeq++,
                    type: "REPAIR_RELINK_PARENT_CHILD",
                    timestamp: repairTimestamp,
                    actorId: "system_importer",
                    synthetic: true,
                    method: repairMethod,
                    edgeUid: relink.edgeUid,
                    unionUid: relink.unionUid,
                    previousUnionUid: relink.previousUnionUid,
                });
            }
            warnings.push(
                `Compat repair: synthetic union created for ParentChild without unionUid (${repair.repairedEdges} edge(s), ${repair.createdUnions} union(s), ${repair.createdMembers} member edge(s)).`
            );
        }

        if (manifest.mediaEntries && manifest.mediaEntries.length > 0) {
            for (const mediaEntry of manifest.mediaEntries) {
                const zipEntry = zip.file(mediaEntry.path);
                if (!zipEntry) {
                    reportByMode(
                        warnings,
                        mode,
                        "MEDIA_ENTRY_MISSING",
                        `media entry missing file: ${mediaEntry.path}`
                    );
                    continue;
                }
                const bytes = await zipEntry.async("uint8array");
                const sha = await computeSha256FromBytes(bytes);
                if (sha !== mediaEntry.sha256 || bytes.byteLength !== mediaEntry.bytes) {
                    reportByMode(
                        warnings,
                        mode,
                        "MEDIA_HASH_MISMATCH",
                        `media hash mismatch for ${mediaEntry.path}`
                    );
                    continue;
                }
                const node = graphData.nodes[mediaEntry.uid];
                if (node?.type === "Media") {
                    const effectiveMime = (node as MediaNode).mimeType ?? mediaEntry.mime;
                    (graphData.nodes[mediaEntry.uid] as MediaNode).dataUrl = uint8ArrayToDataUrl(bytes, effectiveMime);
                }
            }
        } else {
            const mediaFiles = zip.folder("media");
            if (mediaFiles) {
                for (const [fileName, zipEntry] of Object.entries(zip.files)) {
                    if (!fileName.startsWith("media/") || zipEntry.dir) continue;
                    const baseName = fileName.replace(/^media\//, "");
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
        }

        const rawValidation = validateGenraphGraph(graphData);
        const claimInvariantIssues = rawValidation.issues.filter((issue) => CLAIM_INVARIANT_CODES.has(issue.code));
        if (claimInvariantIssues.length > 0) {
            const summary = [...new Set(claimInvariantIssues.map((issue) => issue.code))].join(", ");
            if (strict) {
                throw new Error(`CRITICAL: graph.json violates claim invariants in strict mode (${summary})`);
            }
            warnings.push(`Compat repair: graph.json claim invariants normalized (${summary}).`);
        }

        const parentUnionIssues = rawValidation.issues.filter((issue) => PARENT_CHILD_UNION_CODES.has(issue.code));
        if (parentUnionIssues.length > 0) {
            const summary = [...new Set(parentUnionIssues.map((issue) => issue.code))].join(", ");
            if (strict) {
                throw new Error(`CRITICAL: graph.json violates parent-child union invariants in strict mode (${summary})`);
            }
            warnings.push(`Compat warning: parent-child union invariants still invalid (${summary}).`);
        }

        const unknownEdgeIssues = rawValidation.issues.filter((issue) => EDGE_UNKNOWN_CODES.has(issue.code));
        if (unknownEdgeIssues.length > 0 && strict) {
            const summary = [...new Set(unknownEdgeIssues.map((issue) => issue.code))].join(", ");
            throw new Error(`CRITICAL: graph.json violates edge type invariants in strict mode (${summary})`);
        }
    }

    const snapshotJournalOps = [
        ...(journalValid ? journalOps.filter((op) => op.opSeq <= manifest.graphDerivedFromOpSeq) : []),
        ...syntheticRepairOps,
    ].sort((a, b) => a.opSeq - b.opSeq);
    let graph: GenraphGraph | null = graphData ? GenraphGraph.fromData(graphData, snapshotJournalOps) : null;
    let graphValid = false;
    if (graph) {
        const validation = graph.validate();
        const errors = validation.issues.filter((issue) => issue.severity === "error");
        graphValid = errors.length === 0;
        if (!graphValid) {
            warnings.push(...errors.map((issue) => `Graph validation: ${issue.code} - ${issue.message}`));
        }
    }

    if (graphValid && journalValid) {
        if (manifest.graphDerivedFromOpSeq < journalLastOpSeq) {
            warnings.push("Snapshot behind journal head. Attempting journal fast-forward recovery.");
            const missingOps = journalOps.filter((op) => op.opSeq > manifest.graphDerivedFromOpSeq);
            try {
                if (graph) {
                    const ffReport = applyJournalOps(graph, missingOps, { appendToJournal: true, strictOpSeq: true });
                    if (ffReport.skippedUnknownEdges.length > 0) {
                        for (const skipped of ffReport.skippedUnknownEdges) {
                            warnings.push(
                                `Compat quarantine: unknown ADD_EDGE op skipped during fast-forward (${skipped.edgeUid}:${skipped.edgeType}@${skipped.opSeq}).`
                            );
                        }
                    }
                    warnings.push(`Fast-forward applied ${missingOps.length} operation(s).`);
                }
            } catch (error) {
                warnings.push(`Fast-forward failed: ${error instanceof Error ? error.message : String(error)}`);
                warnings.push("Attempting full replay fallback after fast-forward failure.");
                try {
                    const replay = replayJournalWithReport(journalOps);
                    graph = replay.graph;
                    if (replay.report.skippedUnknownEdges.length > 0) {
                        for (const skipped of replay.report.skippedUnknownEdges) {
                            warnings.push(
                                `Compat quarantine: unknown ADD_EDGE op skipped during replay (${skipped.edgeUid}:${skipped.edgeType}@${skipped.opSeq}).`
                            );
                        }
                    }
                } catch (replayError) {
                    if (strict) {
                        throw new Error(`Invalid .gsk integrity: replay failed (${replayError instanceof Error ? replayError.message : String(replayError)})`);
                    }
                    warnings.push(`Replay failed: ${replayError instanceof Error ? replayError.message : String(replayError)}`);
                }
            }
        }
    } else if (graphValid && !journalValid) {
        warnings.push("graph.json is valid but journal.jsonl is inconsistent. Loaded snapshot without journal recovery.");
    } else if (!graphValid && journalValid) {
        warnings.push("graph.json is invalid. Reconstructing graph from journal replay.");
        try {
            const replay = replayJournalWithReport(journalOps);
            graph = replay.graph;
            if (replay.report.skippedUnknownEdges.length > 0) {
                for (const skipped of replay.report.skippedUnknownEdges) {
                    warnings.push(
                        `Compat quarantine: unknown ADD_EDGE op skipped during replay (${skipped.edgeUid}:${skipped.edgeType}@${skipped.opSeq}).`
                    );
                }
            }
            graphValid = true;
        } catch (error) {
            if (strict) {
                throw new Error(`Invalid .gsk integrity: replay failed (${error instanceof Error ? error.message : String(error)})`);
            }
            warnings.push(`Replay failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    } else if (!graphValid && !journalValid) {
        throw new Error("Invalid .gsk integrity: graph and journal are both invalid");
    }

    const meta: GskPackageMeta = isLegacySchema(manifest.schemaVersion) && presentAppMetaPaths.length > 0
        ? await readLegacyMeta(zip, warnings)
        : {};

    if (!graph) {
        throw new Error("Invalid .gsk integrity: graph could not be reconstructed");
    }

    return { graph, manifest, meta, warnings };
}

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


