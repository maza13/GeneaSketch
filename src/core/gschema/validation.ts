/**
 * GSchema 0.1.x — Graph Integrity Validation
 *
 * Validates a GSchemaGraph for structural consistency. This is used:
 * 1. After importing a .gsk package to detect corruption.
 * 2. Before exporting to GEDCOM to ensure a valid source.
 * 3. During development as assertion guards.
 *
 * Validation is intentionally lenient on semantic rules (e.g., a person
 * can have 3 biological parents if sources say so — we store the debate
 * as competing claims). Structural rules are strict.
 */

import type { GSchemaGraph, GSchemaEdge, GClaim } from "./types";

export interface ValidationIssue {
    severity: "error" | "warning" | "info";
    code: string;
    message: string;
    /** UID of the affected node, edge, or claim. */
    targetUid?: string;
}

export interface ValidationResult {
    isValid: boolean;
    issues: ValidationIssue[];
    stats: {
        nodeCount: number;
        edgeCount: number;
        claimCount: number;
        orphanedEdges: number;
        missingPreferred: number;
        conflictingPreferred: number;
        quarantineCount: number;
    };
}

// ─────────────────────────────────────────────
// Main Validator
// ─────────────────────────────────────────────

export function validateGSchemaGraph(graph: GSchemaGraph): ValidationResult {
    const issues: ValidationIssue[] = [];
    let orphanedEdges = 0;
    let missingPreferred = 0;
    let conflictingPreferred = 0;

    const nodeUids = new Set(Object.keys(graph.nodes));
    const edgeUids = new Set(Object.keys(graph.edges));

    // ── Edge Reference Integrity ──────────────────────────
    for (const [uid, edge] of Object.entries(graph.edges)) {
        if (edge.deleted) continue;

        if (!nodeUids.has(edge.fromUid)) {
            issues.push({
                severity: "error",
                code: "EDGE_ORPHAN_FROM",
                message: `Edge ${uid} references non-existent fromUid: ${edge.fromUid}`,
                targetUid: uid
            });
            orphanedEdges++;
        }

        if (!nodeUids.has(edge.toUid)) {
            issues.push({
                severity: "error",
                code: "EDGE_ORPHAN_TO",
                message: `Edge ${uid} references non-existent toUid: ${edge.toUid}`,
                targetUid: uid
            });
            orphanedEdges++;
        }

        // EvidenceRef must reference an existing claim UID (soft check — claims can be lazy)
        if (edge.type === "EvidenceRef" && !graph.nodes[edge.toUid]) {
            issues.push({
                severity: "warning",
                code: "EVIDENCE_REF_TARGET_MISSING",
                message: `EvidenceRef edge ${uid} points to unknown source node: ${edge.toUid}`,
                targetUid: uid
            });
        }
    }

    // ── Claim Integrity ───────────────────────────────────
    for (const [nodeUid, byPredicate] of Object.entries(graph.claims)) {
        // Claim must reference an existing node
        if (!nodeUids.has(nodeUid)) {
            issues.push({
                severity: "error",
                code: "CLAIM_ORPHAN_NODE",
                message: `Claims exist for non-existent node: ${nodeUid}`,
                targetUid: nodeUid
            });
        }

        for (const [predicate, claims] of Object.entries(byPredicate)) {
            const activeClaims = claims.filter(c => c.status !== "retracted");
            const preferredClaims = activeClaims.filter(c => c.isPreferred);

            // Allow missing preferred only as a warning (data might be in-flight)
            if (activeClaims.length > 0 && preferredClaims.length === 0) {
                issues.push({
                    severity: "warning",
                    code: "NO_PREFERRED_CLAIM",
                    message: `Node ${nodeUid} has ${activeClaims.length} claim(s) for "${predicate}" but none is preferred`,
                    targetUid: nodeUid
                });
                missingPreferred++;
            }

            // Multiple preferred is an error
            if (preferredClaims.length > 1) {
                issues.push({
                    severity: "error",
                    code: "MULTIPLE_PREFERRED_CLAIMS",
                    message: `Node ${nodeUid} has ${preferredClaims.length} preferred claims for "${predicate}" — exactly one is allowed`,
                    targetUid: nodeUid
                });
                conflictingPreferred++;
            }

            // Validate claim UID uniqueness within the predicate
            const claimUids = new Set<string>();
            for (const claim of claims) {
                if (claimUids.has(claim.uid)) {
                    issues.push({
                        severity: "error",
                        code: "DUPLICATE_CLAIM_UID",
                        message: `Duplicate claim UID "${claim.uid}" in node ${nodeUid} predicate "${predicate}"`,
                        targetUid: claim.uid
                    });
                }
                claimUids.add(claim.uid);
            }
        }
    }

    // ── Node Type Constraints ─────────────────────────────
    for (const [uid, node] of Object.entries(graph.nodes)) {
        if (node.deleted) continue;

        // Person must have at least a name claim (warning only — data might be incomplete)
        if (node.type === "Person") {
            const nameClaims = graph.claims[uid]?.["person.name.full"] ?? [];
            if (nameClaims.filter(c => c.status !== "retracted").length === 0 && !node.isPlaceholder) {
                issues.push({
                    severity: "warning",
                    code: "PERSON_NO_NAME",
                    message: `Person node ${uid} has no name claim and is not a placeholder`,
                    targetUid: uid
                });
            }
        }

        // Union must have at least one Member edge (warning)
        if (node.type === "Union") {
            const memberEdges = Object.values(graph.edges).filter(
                e => e.type === "Member" && e.toUid === uid && !e.deleted
            );
            if (memberEdges.length === 0) {
                issues.push({
                    severity: "warning",
                    code: "UNION_NO_MEMBERS",
                    message: `Union node ${uid} has no member edges`,
                    targetUid: uid
                });
            }
        }
    }

    // ── Edge UID Uniqueness ───────────────────────────────
    if (edgeUids.size !== Object.keys(graph.edges).length) {
        issues.push({
            severity: "error",
            code: "DUPLICATE_EDGE_UIDS",
            message: "Duplicate edge UIDs detected in the graph"
        });
    }

    const totalClaims = Object.values(graph.claims).reduce(
        (sum, byPred) => sum + Object.values(byPred).reduce((s, arr) => s + arr.length, 0),
        0
    );

    const errors = issues.filter(i => i.severity === "error");

    return {
        isValid: errors.length === 0,
        issues,
        stats: {
            nodeCount: Object.keys(graph.nodes).length,
            edgeCount: Object.keys(graph.edges).length,
            claimCount: totalClaims,
            orphanedEdges,
            missingPreferred,
            conflictingPreferred,
            quarantineCount: graph.quarantine.length
        }
    };
}

// ─────────────────────────────────────────────
// Fast Assertion Helpers (for development)
// ─────────────────────────────────────────────

/**
 * Returns true if a node exists and is not soft-deleted.
 */
export function isActiveNode(graph: GSchemaGraph, uid: string): boolean {
    const node = graph.nodes[uid];
    return node !== undefined && !node.deleted;
}

/**
 * Returns all active (non-retracted) claims for a given node and predicate.
 */
export function getActiveClaims(graph: GSchemaGraph, nodeUid: string, predicate: string): GClaim[] {
    return (graph.claims[nodeUid]?.[predicate] ?? []).filter(c => c.status !== "retracted");
}

/**
 * Returns the preferred claim for a given node and predicate, or null if none.
 */
export function getPreferredClaim(graph: GSchemaGraph, nodeUid: string, predicate: string): GClaim | null {
    return getActiveClaims(graph, nodeUid, predicate).find(c => c.isPreferred) ?? null;
}

/**
 * Gets the preferred value of a claim and casts it to T (unsafe cast — use with care).
 */
export function getPreferredValue<T>(graph: GSchemaGraph, nodeUid: string, predicate: string): T | null {
    const claim = getPreferredClaim(graph, nodeUid, predicate);
    return claim ? (claim.value as T) : null;
}

/**
 * Returns all active edges of a given type from or to a node.
 */
export function getEdgesForNode(
    graph: GSchemaGraph,
    nodeUid: string,
    direction: "from" | "to" | "both"
): GSchemaEdge[] {
    return Object.values(graph.edges).filter(edge => {
        if (edge.deleted) return false;
        const fromMatch = edge.fromUid === nodeUid;
        const toMatch = edge.toUid === nodeUid;
        if (direction === "from") return fromMatch;
        if (direction === "to") return toMatch;
        return fromMatch || toMatch;
    });
}
