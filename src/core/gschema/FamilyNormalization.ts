import type {
    GSchemaEdge,
    GSchemaGraph as GSchemaGraphData,
    MemberEdge,
    ParentChildEdge,
    UnionNode,
} from "./types";

export interface ParentChildUnionRepairResult {
    missingUnionEdges: number;
    repairedEdges: number;
    createdUnions: number;
    createdMembers: number;
    createdUnionUids: string[];
    createdMemberEdges: Array<{ edgeUid: string; unionUid: string; parentUid: string; role: MemberEdge["role"] }>;
    relinkedParentChildEdges: Array<{ edgeUid: string; unionUid: string; previousUnionUid?: string; childUid: string; parentUid: string }>;
    repairsByChild: Array<{ childUid: string; unionUid: string; parentUids: string[] }>;
}

function isParentChild(edge: GSchemaEdge): edge is ParentChildEdge {
    return edge.type === "ParentChild";
}

function isMember(edge: GSchemaEdge): edge is MemberEdge {
    return edge.type === "Member";
}

function isActive(edge: { deleted?: boolean }): boolean {
    return edge.deleted !== true;
}

function uniqueEdgeUid(edges: Record<string, GSchemaEdge>, base: string): string {
    let candidate = base;
    let i = 1;
    while (edges[candidate]) {
        candidate = `${base}#${i++}`;
    }
    return candidate;
}

function roleForParent(
    parentUid: string,
    missingEdges: ParentChildEdge[]
): MemberEdge["role"] {
    const parentEdges = missingEdges.filter((edge) => edge.fromUid === parentUid);
    const hasFather = parentEdges.some((edge) => edge.parentRole === "father");
    const hasMother = parentEdges.some((edge) => edge.parentRole === "mother");
    if (hasFather && !hasMother) return "HUSB";
    if (hasMother && !hasFather) return "WIFE";
    return "PART";
}

function intersection<T>(sets: Array<Set<T>>): Set<T> {
    if (sets.length === 0) return new Set<T>();
    const [head, ...tail] = sets;
    const out = new Set<T>(head);
    for (const value of out) {
        if (!tail.every((set) => set.has(value))) {
            out.delete(value);
        }
    }
    return out;
}

function findSharedUnionForParents(
    parentUids: string[],
    edges: Record<string, GSchemaEdge>,
    nodes: GSchemaGraphData["nodes"]
): string | null {
    const memberSets = parentUids.map((parentUid) => {
        const unions = new Set<string>();
        for (const edge of Object.values(edges)) {
            if (!isMember(edge) || !isActive(edge)) continue;
            if (edge.fromUid !== parentUid) continue;
            const unionNode = nodes[edge.toUid];
            if (unionNode?.type === "Union" && isActive(unionNode)) {
                unions.add(edge.toUid);
            }
        }
        return unions;
    });

    const shared = [...intersection(memberSets)].sort();
    return shared[0] ?? null;
}

export function countMissingParentChildUnionLinks(data: GSchemaGraphData): number {
    let count = 0;
    for (const edge of Object.values(data.edges)) {
        if (!isParentChild(edge) || !isActive(edge)) continue;
        if (!(edge as { unionUid?: string }).unionUid) count++;
    }
    return count;
}

export function ensureParentChildUnionLinks(data: GSchemaGraphData): ParentChildUnionRepairResult {
    const result: ParentChildUnionRepairResult = {
        missingUnionEdges: 0,
        repairedEdges: 0,
        createdUnions: 0,
        createdMembers: 0,
        createdUnionUids: [],
        createdMemberEdges: [],
        relinkedParentChildEdges: [],
        repairsByChild: [],
    };

    const missingByChild = new Map<string, ParentChildEdge[]>();
    for (const edge of Object.values(data.edges)) {
        if (!isParentChild(edge) || !isActive(edge)) continue;
        const unionUid = (edge as { unionUid?: string }).unionUid;
        if (unionUid) continue;
        result.missingUnionEdges++;
        if (!missingByChild.has(edge.toUid)) missingByChild.set(edge.toUid, []);
        missingByChild.get(edge.toUid)!.push(edge);
    }

    if (missingByChild.size === 0) return result;

    const stamp = data.updatedAt || data.createdAt || new Date().toISOString();

    for (const [childUid, missingEdges] of missingByChild.entries()) {
        const parentUids = [...new Set(missingEdges.map((edge) => edge.fromUid))].sort();
        if (parentUids.length === 0) continue;

        let unionUid = findSharedUnionForParents(parentUids, data.edges, data.nodes);
        if (!unionUid) {
            unionUid = `union:synthetic:${childUid}:${parentUids.join("+")}`;
            if (!data.nodes[unionUid]) {
                data.nodes[unionUid] = {
                    uid: unionUid,
                    type: "Union",
                    unionType: "UNM",
                    createdAt: stamp,
                } as UnionNode;
                result.createdUnions++;
                result.createdUnionUids.push(unionUid);
            }
        }
        result.repairsByChild.push({ childUid, unionUid, parentUids });

        for (const parentUid of parentUids) {
            const alreadyMember = Object.values(data.edges).some(
                (edge) =>
                    isMember(edge) &&
                    isActive(edge) &&
                    edge.fromUid === parentUid &&
                    edge.toUid === unionUid
            );
            if (alreadyMember) continue;

            const memberUid = uniqueEdgeUid(
                data.edges,
                `edge:synthetic:member:${unionUid}:${parentUid}`
            );
            data.edges[memberUid] = {
                uid: memberUid,
                type: "Member",
                fromUid: parentUid,
                toUid: unionUid,
                role: roleForParent(parentUid, missingEdges),
                isPrimary: false,
                createdAt: stamp,
            } as MemberEdge;
            result.createdMembers++;
            result.createdMemberEdges.push({
                edgeUid: memberUid,
                unionUid,
                parentUid,
                role: roleForParent(parentUid, missingEdges),
            });
        }

        for (const edge of missingEdges) {
            const previousUnionUid = edge.unionUid;
            (edge as ParentChildEdge).unionUid = unionUid;
            result.repairedEdges++;
            result.relinkedParentChildEdges.push({
                edgeUid: edge.uid,
                unionUid,
                previousUnionUid,
                childUid: edge.toUid,
                parentUid: edge.fromUid,
            });
        }
    }

    return result;
}
