import type { GSchemaEdge, GSchemaEdgeType, GSchemaOperation } from "./types";

const KNOWN_EDGE_TYPES: readonly GSchemaEdgeType[] = [
    "ParentChild",
    "Member",
    "Association",
    "EvidenceRef",
    "MediaLink",
    "NoteLink",
] as const;

const KNOWN_EDGE_TYPES_SET = new Set<string>(KNOWN_EDGE_TYPES);

export function isKnownEdgeType(value: string): value is GSchemaEdgeType {
    return KNOWN_EDGE_TYPES_SET.has(value);
}

export function findUnknownEdges(edges: Record<string, GSchemaEdge>): Array<{ uid: string; type: string; edge: GSchemaEdge }> {
    const unknown: Array<{ uid: string; type: string; edge: GSchemaEdge }> = [];
    for (const [uid, edge] of Object.entries(edges)) {
        if (!isKnownEdgeType(edge.type)) {
            unknown.push({ uid, type: edge.type, edge });
        }
    }
    return unknown;
}

export function findUnknownEdgeAddOps(
    ops: readonly GSchemaOperation[]
): Array<{ opId: string; opSeq: number; edgeUid: string; edgeType: string; op: GSchemaOperation }> {
    const unknown: Array<{ opId: string; opSeq: number; edgeUid: string; edgeType: string; op: GSchemaOperation }> = [];
    for (const op of ops) {
        if (op.type !== "ADD_EDGE") continue;
        if (isKnownEdgeType(op.edge.type)) continue;
        unknown.push({
            opId: op.opId,
            opSeq: op.opSeq,
            edgeUid: op.edge.uid,
            edgeType: op.edge.type,
            op,
        });
    }
    return unknown;
}

