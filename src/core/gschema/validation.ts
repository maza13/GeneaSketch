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
import { isClaimsCanonical } from "./ClaimNormalization";
import { isKnownEdgeType } from "./EdgeNormalization";

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
    const parentRoleByUnionChild = new Map<string, { fathers: Set<string>; mothers: Set<string> }>();

    // ── Edge Reference Integrity ──────────────────────────
    for (const [uid, edge] of Object.entries(graph.edges)) {
        if (edge.deleted) continue;
        if (!isKnownEdgeType(edge.type)) {
            issues.push({
                severity: "error",
                code: "EDGE_TYPE_UNKNOWN",
                message: `Edge ${uid} has unknown type: ${String(edge.type)}`,
                targetUid: uid
            });
            continue;
        }

        if (!nodeUids.has(edge.fromUid)) {
            issues.push({
                severity: "error",
                code: "EDGE_ORPHAN_FROM",
                message: `Edge ${uid} references non-existent fromUid: ${edge.fromUid}`,
                targetUid: uid
            });
            orphanedEdges++;
        }
        const fromNode = graph.nodes[edge.fromUid];
        if (fromNode?.deleted) {
            issues.push({
                severity: "error",
                code: "EDGE_FROM_SOFT_DELETED_NODE",
                message: `Edge ${uid} references soft-deleted fromUid: ${edge.fromUid}`,
                targetUid: uid
            });
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
        const toNode = graph.nodes[edge.toUid];
        if (toNode?.deleted) {
            issues.push({
                severity: "error",
                code: "EDGE_TO_SOFT_DELETED_NODE",
                message: `Edge ${uid} references soft-deleted toUid: ${edge.toUid}`,
                targetUid: uid
            });
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

        if (edge.type === "NoteLink") {
            const noteNode = graph.nodes[edge.fromUid];
            if (!noteNode || noteNode.deleted || noteNode.type !== "Note") {
                issues.push({
                    severity: "error",
                    code: "NOTELINK_FROM_NOT_NOTE",
                    message: `NoteLink edge ${uid} must originate from a Note node`,
                    targetUid: uid
                });
            }
            if (!nodeUids.has(edge.toUid)) {
                issues.push({
                    severity: "error",
                    code: "NOTELINK_TARGET_MISSING",
                    message: `NoteLink edge ${uid} references missing target node ${edge.toUid}`,
                    targetUid: uid
                });
            }
            if (!nodeUids.has(edge.targetUid)) {
                issues.push({
                    severity: "error",
                    code: "NOTELINK_TARGET_UID_MISSING",
                    message: `NoteLink edge ${uid} references missing targetUid ${edge.targetUid}`,
                    targetUid: uid
                });
            }
        }

        if (edge.type === "ParentChild") {
            const allowedNature = new Set(["BIO", "ADO", "FOS", "STE", "SEAL", "UNK"]);
            const allowedCertainty = new Set(["high", "medium", "low", "uncertain"]);
            if (!edge.nature) {
                issues.push({
                    severity: "error",
                    code: "PARENT_CHILD_MISSING_NATURE",
                    message: `ParentChild edge ${uid} is missing required nature`,
                    targetUid: uid
                });
            } else if (!allowedNature.has(edge.nature)) {
                issues.push({
                    severity: "error",
                    code: "PARENT_CHILD_INVALID_NATURE",
                    message: `ParentChild edge ${uid} has invalid nature: ${String(edge.nature)}`,
                    targetUid: uid
                });
            }
            if (!edge.certainty) {
                issues.push({
                    severity: "error",
                    code: "PARENT_CHILD_MISSING_CERTAINTY",
                    message: `ParentChild edge ${uid} is missing required certainty`,
                    targetUid: uid
                });
            } else if (!allowedCertainty.has(edge.certainty)) {
                issues.push({
                    severity: "error",
                    code: "PARENT_CHILD_INVALID_CERTAINTY",
                    message: `ParentChild edge ${uid} has invalid certainty: ${String(edge.certainty)}`,
                    targetUid: uid
                });
            }
            if (!edge.unionUid) {
                issues.push({
                    severity: "error",
                    code: "PARENT_CHILD_MISSING_UNION",
                    message: `ParentChild edge ${uid} is missing required unionUid`,
                    targetUid: uid
                });
                continue;
            }
            const union = graph.nodes[edge.unionUid];
            if (!union || union.deleted || union.type !== "Union") {
                issues.push({
                    severity: "error",
                    code: "PARENT_CHILD_INVALID_UNION",
                    message: `ParentChild edge ${uid} references invalid unionUid: ${edge.unionUid}`,
                    targetUid: uid
                });
            } else {
                const parentIsUnionMember = Object.values(graph.edges).some((candidate) =>
                    !candidate.deleted &&
                    candidate.type === "Member" &&
                    candidate.fromUid === edge.fromUid &&
                    candidate.toUid === edge.unionUid
                );
                if (!parentIsUnionMember) {
                    issues.push({
                        severity: "error",
                        code: "PARENT_CHILD_PARENT_NOT_MEMBER",
                        message: `ParentChild edge ${uid} has unionUid=${edge.unionUid}, but parent ${edge.fromUid} is not a member of that union`,
                        targetUid: uid
                    });
                }
            }

            const key = `${edge.unionUid}:${edge.toUid}`;
            const bucket = parentRoleByUnionChild.get(key) ?? { fathers: new Set<string>(), mothers: new Set<string>() };
            if (edge.parentRole === "father") bucket.fathers.add(edge.fromUid);
            if (edge.parentRole === "mother") bucket.mothers.add(edge.fromUid);
            parentRoleByUnionChild.set(key, bucket);
        }
    }

    for (const [key, roles] of parentRoleByUnionChild.entries()) {
        if (roles.fathers.size > 1) {
            issues.push({
                severity: "error",
                code: "UNION_CHILD_MULTIPLE_FATHERS",
                message: `Union-child tuple ${key} has multiple father roles: ${[...roles.fathers].join(", ")}`,
                targetUid: key
            });
        }
        if (roles.mothers.size > 1) {
            issues.push({
                severity: "error",
                code: "UNION_CHILD_MULTIPLE_MOTHERS",
                message: `Union-child tuple ${key} has multiple mother roles: ${[...roles.mothers].join(", ")}`,
                targetUid: key
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
            if (!isClaimsCanonical(claims)) {
                issues.push({
                    severity: "error",
                    code: "CLAIMS_NOT_CANONICAL_ORDER",
                    message: `Node ${nodeUid} has non-canonical claim order for "${predicate}"`,
                    targetUid: nodeUid
                });
            }
            const activeClaims = claims.filter(c => c.lifecycle !== "retracted");
            const preferredClaims = activeClaims.filter(c => c.isPreferred);

            // Exactly one preferred active claim is required when active claims exist
            if (activeClaims.length > 0 && preferredClaims.length === 0) {
                issues.push({
                    severity: "error",
                    code: "PREFERRED_CLAIM_REQUIRED",
                    message: `Node ${nodeUid} has ${activeClaims.length} active claim(s) for "${predicate}" but none is preferred`,
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
                if (claim.nodeUid !== nodeUid) {
                    issues.push({
                        severity: "error",
                        code: "CLAIM_BUCKET_NODEUID_MISMATCH",
                        message: `Claim ${claim.uid} is bucketed under ${nodeUid} but claim.nodeUid=${claim.nodeUid}`,
                        targetUid: claim.uid
                    });
                }
                if (claim.predicate !== predicate) {
                    issues.push({
                        severity: "error",
                        code: "CLAIM_BUCKET_PREDICATE_MISMATCH",
                        message: `Claim ${claim.uid} is bucketed under predicate "${predicate}" but claim.predicate="${claim.predicate}"`,
                        targetUid: claim.uid
                    });
                }
                if (
                    claim.lifecycle !== "retracted" &&
                    (claim.quality === "reviewed" || claim.quality === "verified") &&
                    (!claim.citations || claim.citations.length === 0)
                ) {
                    issues.push({
                        severity: "info",
                        code: "MISSING_CITATIONS",
                        message: `Claim ${claim.uid} (${predicate}) is ${claim.quality} but has no citations`,
                        targetUid: claim.uid
                    });
                }
                if (claim.lifecycle === "retracted" && claim.isPreferred) {
                    issues.push({
                        severity: "error",
                        code: "RETRACTED_CLAIM_IS_PREFERRED",
                        message: `Claim ${claim.uid} is retracted but still marked as preferred`,
                        targetUid: claim.uid
                    });
                }
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
            if (nameClaims.filter(c => c.lifecycle !== "retracted").length === 0 && !node.isPlaceholder) {
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
    return (graph.claims[nodeUid]?.[predicate] ?? []).filter(c => c.lifecycle !== "retracted");
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
