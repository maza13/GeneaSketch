/**
 * GSchema 0.1.x - Append-Only Journal
 */

import type { GSchemaOperation } from "./types";
import { GSchemaGraph } from "./GSchemaGraph";
import { isKnownEdgeType } from "./EdgeNormalization";
import { canonicalizeJson } from "./canonicalJson";

/** Serialize a list of operations to JSONL (one JSON object per line). */
export function serializeJournalToJsonl(ops: readonly GSchemaOperation[]): string {
    return ops.map((op) => canonicalizeJson(op)).join("\n");
}

/** Parse a JSONL string back into an array of operations. */
export function parseJournalFromJsonl(jsonl: string): GSchemaOperation[] {
    return jsonl
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => {
            try {
                return JSON.parse(line) as GSchemaOperation;
            } catch {
                return null;
            }
        })
        .filter((op): op is GSchemaOperation => op !== null);
}

export function validateOpSeq(ops: readonly GSchemaOperation[]): { ok: boolean; reason?: string } {
    if (ops.length === 0) return { ok: true };
    const seen = new Set<number>();
    let max = -1;
    for (const op of ops) {
        if (seen.has(op.opSeq)) return { ok: false, reason: `duplicate opSeq: ${op.opSeq}` };
        seen.add(op.opSeq);
        if (op.opSeq > max) max = op.opSeq;
    }
    for (let expected = 0; expected <= max; expected++) {
        if (!seen.has(expected)) return { ok: false, reason: `gap at opSeq=${expected}` };
    }
    return { ok: true };
}

/**
 * Reindexes the journal to ensure a monotonic, gap-less opSeq sequence starting from 0.
 */
export function reindexJournal(ops: GSchemaOperation[]): GSchemaOperation[] {
    return ops.map((op, idx) => ({ ...op, opSeq: idx }));
}

export async function computeJournalHash(ops: readonly GSchemaOperation[]): Promise<string> {
    const payload = serializeJournalToJsonl(ops);
    const bytes = new TextEncoder().encode(payload);
    const webCrypto = (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto;
    if (webCrypto?.subtle) {
        const digest = await webCrypto.subtle.digest("SHA-256", bytes);
        const hex = Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        return `sha256:${hex}`;
    }
    const { createHash } = await import("node:crypto");
    return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

type GraphInternals = {
    _nodes: Map<string, unknown>;
    _edges: Map<string, { uid: string; fromUid: string; toUid: string; deleted?: boolean }>;
    _claims: Map<string, Map<string, Array<{ uid: string; isPreferred: boolean; quality: string; lifecycle: string }>>>;
    _quarantine: GSchemaOperation[];
    _adjacency: { out: Map<string, Set<string>>; in: Map<string, Set<string>> };
};

export interface JournalApplyReport {
    skippedUnknownEdges: Array<{ opSeq: number; edgeUid: string; edgeType: string; opId: string }>;
}

function getInternals(graph: GSchemaGraph): GraphInternals {
    return graph as unknown as GraphInternals;
}

function validateGaplessFromFirst(ops: readonly GSchemaOperation[]): { ok: boolean; reason?: string } {
    if (ops.length === 0) return { ok: true };
    for (let i = 1; i < ops.length; i++) {
        const prev = ops[i - 1];
        const current = ops[i];
        if (current.opSeq !== prev.opSeq + 1) {
            return {
                ok: false,
                reason: `gap or disorder at opSeq=${current.opSeq} (expected ${prev.opSeq + 1})`,
            };
        }
    }
    return { ok: true };
}

function applyOpsToGraphInternals(
    internals: GraphInternals,
    ops: readonly GSchemaOperation[],
    report: JournalApplyReport
): void {
    const indexEdge = (edge: { uid: string; fromUid: string; toUid: string }) => {
        if (!internals._adjacency.out.has(edge.fromUid)) internals._adjacency.out.set(edge.fromUid, new Set());
        if (!internals._adjacency.in.has(edge.toUid)) internals._adjacency.in.set(edge.toUid, new Set());
        internals._adjacency.out.get(edge.fromUid)!.add(edge.uid);
        internals._adjacency.in.get(edge.toUid)!.add(edge.uid);
    };

    const deIndexEdge = (edge: { uid: string; fromUid: string; toUid: string }) => {
        internals._adjacency.out.get(edge.fromUid)?.delete(edge.uid);
        internals._adjacency.in.get(edge.toUid)?.delete(edge.uid);
    };

    for (const op of ops) {
        switch (op.type) {
            case "ADD_NODE":
                internals._nodes.set(op.node.uid, op.node);
                break;
            case "ADD_EDGE":
                if (!isKnownEdgeType(op.edge.type)) {
                    report.skippedUnknownEdges.push({
                        opSeq: op.opSeq,
                        edgeUid: op.edge.uid,
                        edgeType: op.edge.type,
                        opId: op.opId,
                    });
                    internals._quarantine.push({
                        opId: `quarantine:unknown-edge:${op.opId}`,
                        opSeq: op.opSeq,
                        type: "QUARANTINE",
                        timestamp: op.timestamp,
                        actorId: op.actorId,
                        importId: `journal:${op.opId}`,
                        ast: {
                            level: 1,
                            tag: "_GSK_EDGE_UNKNOWN",
                            value: JSON.stringify(op.edge),
                            children: [],
                            sourceLines: [JSON.stringify(op)],
                        },
                        reason: "unknown_edge_type",
                        context: op.edge.uid,
                    });
                    break;
                }
                internals._edges.set(op.edge.uid, op.edge);
                if (!op.edge.deleted) indexEdge(op.edge);
                break;
            case "ADD_CLAIM":
                if (!internals._claims.has(op.claim.nodeUid)) internals._claims.set(op.claim.nodeUid, new Map());
                {
                    const byPred = internals._claims.get(op.claim.nodeUid)!;
                    if (!byPred.has(op.claim.predicate)) byPred.set(op.claim.predicate, []);
                    const claims = byPred.get(op.claim.predicate)!;
                    if (claims.some((claim) => claim.uid === op.claim.uid)) {
                        break;
                    }
                    if (op.claim.isPreferred) {
                        for (const claim of claims) claim.isPreferred = false;
                    }
                    claims.push(op.claim as unknown as { uid: string; isPreferred: boolean; quality: string; lifecycle: string });
                }
                break;
            case "SET_PREF_CLAIM":
                {
                    const claims = internals._claims.get(op.nodeUid)?.get(op.predicate) ?? [];
                    for (const claim of claims) {
                        claim.isPreferred = claim.uid === op.claimUid;
                    }
                }
                break;
            case "RETRACT_CLAIM":
                for (const byPred of internals._claims.values()) {
                    for (const claims of byPred.values()) {
                        const target = claims.find((claim) => claim.uid === op.claimUid);
                        if (target) {
                            target.lifecycle = "retracted";
                            target.isPreferred = false;
                        }
                    }
                }
                break;
            case "SOFT_DELETE_NODE":
                {
                    const node = internals._nodes.get(op.nodeUid) as { deleted?: boolean } | undefined;
                    if (node) node.deleted = true;
                }
                break;
            case "SOFT_DELETE_EDGE":
                {
                    const edge = internals._edges.get(op.edgeUid);
                    if (edge) {
                        edge.deleted = true;
                        deIndexEdge(edge);
                    }
                }
                break;
            case "REPAIR_CREATE_UNION":
            case "REPAIR_CREATE_MEMBER_EDGE":
            case "REPAIR_RELINK_PARENT_CHILD":
                // Repair ops are audit entries; graph state is already reflected in snapshot/import flow.
                break;
            case "QUARANTINE":
                if (!internals._quarantine.some((existing) => existing.opId === op.opId)) {
                    internals._quarantine.push(op);
                }
                break;
            case "INITIAL_IMPORT":
                break;
        }
    }
}

export function applyJournalOps(
    graph: GSchemaGraph,
    ops: readonly GSchemaOperation[],
    options: { appendToJournal?: boolean; strictOpSeq?: boolean } = {}
): JournalApplyReport {
    const report: JournalApplyReport = { skippedUnknownEdges: [] };
    if (ops.length === 0) return report;
    const { appendToJournal = true, strictOpSeq = true } = options;

    if (strictOpSeq) {
        const seqCheck = validateGaplessFromFirst(ops);
        if (!seqCheck.ok) {
            throw new Error(`Invalid incremental journal opSeq: ${seqCheck.reason}`);
        }
        const currentJournal = graph.getJournal();
        const maxOpSeq = currentJournal.reduce((max, op) => Math.max(max, op.opSeq), -1);
        const expectedNextSeq = maxOpSeq + 1;
        if (ops[0].opSeq !== expectedNextSeq) {
            throw new Error(`Invalid incremental journal opSeq: gap at start opSeq=${ops[0].opSeq} (expected ${expectedNextSeq})`);
        }
    }

    const internals = getInternals(graph);
    applyOpsToGraphInternals(internals, ops, report);

    graph._appendJournal(ops, appendToJournal);
    return report;
}

export function replayJournalWithReport(
    ops: GSchemaOperation[]
): { graph: GSchemaGraph; report: JournalApplyReport } {
    const seqCheck = validateOpSeq(ops);
    if (!seqCheck.ok) {
        throw new Error(`Invalid journal opSeq: ${seqCheck.reason}`);
    }

    const graph = GSchemaGraph.create();
    const internals = getInternals(graph);
    const report: JournalApplyReport = { skippedUnknownEdges: [] };
    applyOpsToGraphInternals(internals, ops, report);

    graph._replaceJournal(ops);
    return { graph, report };
}

/**
 * Reconstructs a GSchemaGraph by replaying an ordered list of operations.
 */
export function replayJournal(ops: GSchemaOperation[]): GSchemaGraph {
    return replayJournalWithReport(ops).graph;
}

/**
 * Compact the journal by removing operations that have been superseded.
 */
export function compactJournal(ops: GSchemaOperation[]): GSchemaOperation[] {
    const result: GSchemaOperation[] = [];

    const lastPref = new Map<string, number>();
    const retractedClaims = new Set<string>();

    for (const op of ops) {
        if (op.type === "RETRACT_CLAIM") {
            retractedClaims.add(op.claimUid);
        }
        if (op.type === "ADD_CLAIM" && retractedClaims.has(op.claim.uid)) {
            continue;
        }
        if (op.type === "SET_PREF_CLAIM") {
            const key = `${op.nodeUid}::${op.predicate}`;
            const prev = lastPref.get(key);
            if (prev !== undefined) {
                result.splice(prev, 1);
                for (const [k, idx] of lastPref.entries()) {
                    if (idx > prev) lastPref.set(k, idx - 1);
                }
            }
            lastPref.set(key, result.length);
        }
        result.push(op);
    }

    return result;
}

export interface JournalStats {
    totalOps: number;
    byType: Record<string, number>;
    actorCounts: Record<string, number>;
    earliestTimestamp: number | null;
    latestTimestamp: number | null;
}

export function analyzeJournal(ops: readonly GSchemaOperation[]): JournalStats {
    const byType: Record<string, number> = {};
    const actorCounts: Record<string, number> = {};
    let earliest: number | null = null;
    let latest: number | null = null;

    for (const op of ops) {
        byType[op.type] = (byType[op.type] ?? 0) + 1;
        actorCounts[op.actorId] = (actorCounts[op.actorId] ?? 0) + 1;
        if (earliest === null || op.timestamp < earliest) earliest = op.timestamp;
        if (latest === null || op.timestamp > latest) latest = op.timestamp;
    }

    return {
        totalOps: ops.length,
        byType,
        actorCounts,
        earliestTimestamp: earliest,
        latestTimestamp: latest,
    };
}
