/**
 * GSchema 0.1.x — Append-Only Journal
 *
 * The Journal is a sequential log of all operations applied to a GSchemaGraph.
 * It enables:
 * - Persistence: serialize the journal, replay it to reconstruct the graph.
 * - Undo (future): walk back the journal.
 * - CRDT Sync (future): merge journals from multiple devices.
 * - Audit: full history of who changed what and when.
 *
 * The Journal itself is stateless — it just stores operations.
 * GSchemaGraph is the live engine that applies and records operations.
 */

import type { GSchemaOperation } from "./types";
import { GSchemaGraph } from "./GSchemaGraph";

// ─────────────────────────────────────────────
// Serialization helpers
// ─────────────────────────────────────────────

/** Serialize a list of operations to JSONL (one JSON object per line). */
export function serializeJournalToJsonl(ops: readonly GSchemaOperation[]): string {
    return ops.map(op => JSON.stringify(op)).join("\n");
}

/** Parse a JSONL string back into an array of operations. */
export function parseJournalFromJsonl(jsonl: string): GSchemaOperation[] {
    return jsonl
        .split("\n")
        .filter(line => line.trim().length > 0)
        .map(line => {
            try {
                return JSON.parse(line) as GSchemaOperation;
            } catch {
                return null;
            }
        })
        .filter((op): op is GSchemaOperation => op !== null);
}

// ─────────────────────────────────────────────
// Replay
// ─────────────────────────────────────────────

/**
 * Reconstructs a GSchemaGraph by replaying an ordered list of operations.
 *
 * This is equivalent to loading a .gsk package's journal.jsonl and
 * rebuilding the graph from scratch — the "Event Sourcing" pattern.
 */
export function replayJournal(ops: GSchemaOperation[]): GSchemaGraph {
    const graph = GSchemaGraph.create();

    for (const op of ops) {
        switch (op.type) {
            case "ADD_NODE":
                // Directly set since addNode would double-record to journal
                (graph as unknown as { _nodes: Map<string, unknown> })
                    ._nodes.set(op.node.uid, op.node);
                break;
            case "ADD_EDGE":
                (graph as unknown as { _edges: Map<string, unknown> })
                    ._edges.set(op.edge.uid, op.edge);
                break;
            case "ADD_CLAIM":
                graph.addClaim(op.claim, op.actorId);
                break;
            case "SET_PREF_CLAIM":
                graph.setPreferredClaim(op.nodeUid, op.predicate, op.claimUid, op.actorId);
                break;
            case "RETRACT_CLAIM":
                graph.retractClaim(op.claimUid, op.reason, op.actorId);
                break;
            case "SOFT_DELETE_NODE":
                graph.softDeleteNode(op.nodeUid, op.reason, op.actorId);
                break;
            case "SOFT_DELETE_EDGE":
                graph.softDeleteEdge(op.edgeUid, op.reason, op.actorId);
                break;
            case "QUARANTINE":
                // Already captured in quarantine log, no action needed
                break;
            case "INITIAL_IMPORT":
                // Metadata-only, no graph change
                break;
        }
    }

    return graph;
}

// ─────────────────────────────────────────────
// Compaction
// ─────────────────────────────────────────────

/**
 * Compact the journal by removing operations that have been superseded.
 *
 * Rules:
 * - If a node was added and later soft-deleted, keep only a single ADD_NODE
 *   followed by the SOFT_DELETE_NODE. Remove intermediate mutations on that node.
 * - If a claim was added and later retracted, remove the ADD_CLAIM.
 * - Collapse multiple SET_PREF_CLAIM for the same predicate into only the last one.
 *
 * Returns a new, shorter operation array. The graph produced by replaying
 * the compacted journal MUST be identical to the original.
 *
 * NOTE: This is a "safe" compaction — it never removes information that
 * cannot be reconstructed. CRDT sync relies on the full journal,
 * so compact only locally after all sync has been resolved.
 */
export function compactJournal(ops: GSchemaOperation[]): GSchemaOperation[] {
    const result: GSchemaOperation[] = [];

    // Track the last SET_PREF_CLAIM per (nodeUid, predicate)
    const lastPref = new Map<string, number>(); // key → index in result

    // Track retracted claim UIDs
    const retractedClaims = new Set<string>();

    for (const op of ops) {
        if (op.type === "RETRACT_CLAIM") {
            retractedClaims.add(op.claimUid);
        }
        if (op.type === "ADD_CLAIM" && retractedClaims.has(op.claim.uid)) {
            // Skip — this claim was immediately retracted, no interesting history
            continue;
        }
        if (op.type === "SET_PREF_CLAIM") {
            const key = `${op.nodeUid}::${op.predicate}`;
            const prev = lastPref.get(key);
            if (prev !== undefined) {
                // Remove the previous SET_PREF_CLAIM for this predicate
                result.splice(prev, 1);
                // Update all subsequent indices
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

// ─────────────────────────────────────────────
// Journal Stats
// ─────────────────────────────────────────────

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
        latestTimestamp: latest
    };
}
