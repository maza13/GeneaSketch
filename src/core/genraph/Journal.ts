/**
 * Genraph 0.1.x - Append-Only Journal
 */

import type { GenraphOperation } from "./types";
import { GenraphGraph } from "./GenraphGraph";
import { isKnownEdgeType } from "./EdgeNormalization";
import { canonicalizeJson } from "./canonicalJson";
import { computeSha256FromBytes } from "@/core/crypto/sha256";

/** Serialize a list of operations to JSONL (one JSON object per line). */
export function serializeJournalToJsonl(ops: readonly GenraphOperation[]): string {
    return ops.map((op) => canonicalizeJson(op)).join("\n");
}

/** Parse a JSONL string back into an array of operations. */
export function parseJournalFromJsonl(jsonl: string): GenraphOperation[] {
    return jsonl
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => {
            try {
                return JSON.parse(line) as GenraphOperation;
            } catch {
                return null;
            }
        })
        .filter((op): op is GenraphOperation => op !== null);
}

export function validateOpSeq(ops: readonly GenraphOperation[]): { ok: boolean; reason?: string } {
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

export function reindexJournal(ops: GenraphOperation[]): GenraphOperation[] {
    return ops.map((op, idx) => ({ ...op, opSeq: idx }));
}

export async function computeJournalHash(ops: readonly GenraphOperation[]): Promise<string> {
    const payload = serializeJournalToJsonl(ops);
    const bytes = new TextEncoder().encode(payload);
    return computeSha256FromBytes(bytes);
}

export interface JournalApplyReport {
    skippedUnknownEdges: Array<{ opSeq: number; edgeUid: string; edgeType: string; opId: string }>;
}

function validateGaplessFromFirst(ops: readonly GenraphOperation[]): { ok: boolean; reason?: string } {
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

function applyOpsToGraph(
    graph: GenraphGraph,
    ops: readonly GenraphOperation[],
    report: JournalApplyReport
): void {
    for (const op of ops) {
        if (op.type === "ADD_EDGE" && !isKnownEdgeType(op.edge.type)) {
            report.skippedUnknownEdges.push({
                opSeq: op.opSeq,
                edgeUid: op.edge.uid,
                edgeType: op.edge.type,
                opId: op.opId,
            });
            graph.quarantine({
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
            continue;
        }

        (graph as any)._applyOperation(op);
    }
}

export function applyJournalOps(
    graph: GenraphGraph,
    ops: readonly GenraphOperation[],
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

    applyOpsToGraph(graph, ops, report);
    graph._appendJournal(ops, appendToJournal);
    return report;
}

export function replayJournalWithReport(
    ops: GenraphOperation[]
): { graph: GenraphGraph; report: JournalApplyReport } {
    const seqCheck = validateOpSeq(ops);
    if (!seqCheck.ok) {
        throw new Error(`Invalid journal opSeq: ${seqCheck.reason}`);
    }

    const graph = GenraphGraph.create();
    const report: JournalApplyReport = { skippedUnknownEdges: [] };
    applyOpsToGraph(graph, ops, report);

    graph._replaceJournal(ops);
    return { graph, report };
}

export function replayJournal(ops: GenraphOperation[]): GenraphGraph {
    return replayJournalWithReport(ops).graph;
}

export function compactJournal(ops: GenraphOperation[]): GenraphOperation[] {
    const result: GenraphOperation[] = [];

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

export function analyzeJournal(ops: readonly GenraphOperation[]): JournalStats {
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
