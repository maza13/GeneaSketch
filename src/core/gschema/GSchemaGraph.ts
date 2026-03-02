/**
 * GSchema 0.1.x — GSchemaGraph Class
 *
 * The in-memory graph container. All mutations are:
 * 1. Applied to the in-memory indexes immediately (for O(1) reads).
 * 2. Recorded as operations in the Journal (for persistence and replay).
 *
 * Usage:
 *   const graph = GSchemaGraph.create();
 *   const op = graph.addNode({ type: "Person", uid: uuidv4(), ... });
 *   // op is recorded in graph.journal for serialization
 */

import {
    type GSchemaGraph as GSchemaGraphData,
    type GSchemaNode,
    type GSchemaEdge,
    type GClaim,
    type GSchemaOperation,
    type AddNodeOperation,
    type AddEdgeOperation,
    type AddClaimOperation,
    type SetPrefClaimOperation,
    type RetractClaimOperation,
    type SoftDeleteNodeOperation,
    type SoftDeleteEdgeOperation,
    type QuarantineOperation,
    type ParentChildEdge,
    type MemberEdge,
    type GskPackageManifest,
} from "./types";
import { validateGSchemaGraph, type ValidationResult } from "./validation";

// ─────────────────────────────────────────────
// UID generation (UUID v4, no external deps)
// ─────────────────────────────────────────────

function uuidv4(): string {
    // Cryptographically random where available (browser + Node 16+)
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback (non-crypto, for environments without Web Crypto)
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function nowIso(): string {
    return new Date().toISOString();
}

function nowSec(): number {
    return Math.floor(Date.now() / 1000);
}

// ─────────────────────────────────────────────
// Adjacency Index (O(1) lookups)
// ─────────────────────────────────────────────

interface AdjacencyIndex {
    /** out[nodeUid] = set of edge UIDs where fromUid === nodeUid */
    out: Map<string, Set<string>>;
    /** in[nodeUid] = set of edge UIDs where toUid === nodeUid */
    in: Map<string, Set<string>>;
}

function createAdjacencyIndex(): AdjacencyIndex {
    return { out: new Map(), in: new Map() };
}

function indexEdge(index: AdjacencyIndex, edge: GSchemaEdge): void {
    if (!index.out.has(edge.fromUid)) index.out.set(edge.fromUid, new Set());
    if (!index.in.has(edge.toUid)) index.in.set(edge.toUid, new Set());
    index.out.get(edge.fromUid)!.add(edge.uid);
    index.in.get(edge.toUid)!.add(edge.uid);
}

function deIndexEdge(index: AdjacencyIndex, edge: GSchemaEdge): void {
    index.out.get(edge.fromUid)?.delete(edge.uid);
    index.in.get(edge.toUid)?.delete(edge.uid);
}

// ─────────────────────────────────────────────
// GSchemaGraph Class
// ─────────────────────────────────────────────

export class GSchemaGraph {
    private _nodes: Map<string, GSchemaNode> = new Map();
    private _edges: Map<string, GSchemaEdge> = new Map();
    /** claims[nodeUid][predicate] = GClaim[] */
    private _claims: Map<string, Map<string, GClaim[]>> = new Map();
    private _quarantine: QuarantineOperation[] = [];
    private _journal: GSchemaOperation[] = [];
    private _adjacency: AdjacencyIndex = createAdjacencyIndex();
    private _graphId: string;
    private _schemaVersion: string;
    private _createdAt: string;
    private _updatedAt: string;

    private constructor() {
        this._graphId = uuidv4();
        this._schemaVersion = "0.1.0";
        this._createdAt = nowIso();
        this._updatedAt = nowIso();
    }

    // ── Factories ─────────────────────────────

    static create(): GSchemaGraph {
        return new GSchemaGraph();
    }

    /**
     * Reconstruct a GSchemaGraph from its serialized data (e.g., from a .gsk file).
     * Replays operations to rebuild indexes.
     */
    static fromData(data: GSchemaGraphData): GSchemaGraph {
        const g = new GSchemaGraph();
        g._graphId = data.graphId;
        g._schemaVersion = data.schemaVersion;
        g._createdAt = data.createdAt;
        g._updatedAt = data.updatedAt;

        // Load nodes
        for (const node of Object.values(data.nodes)) {
            g._nodes.set(node.uid, node);
        }

        // Load edges + rebuild adjacency index
        for (const edge of Object.values(data.edges)) {
            g._edges.set(edge.uid, edge);
            if (!edge.deleted) indexEdge(g._adjacency, edge);
        }

        // Load claims
        for (const [nodeUid, byPred] of Object.entries(data.claims)) {
            const nodeMap = new Map<string, GClaim[]>();
            for (const [pred, claims] of Object.entries(byPred)) {
                nodeMap.set(pred, [...claims]);
            }
            g._claims.set(nodeUid, nodeMap);
        }

        g._quarantine = [...data.quarantine];
        return g;
    }

    // ── Read Accessors ────────────────────────

    get graphId(): string { return this._graphId; }
    get schemaVersion(): string { return this._schemaVersion; }

    node(uid: string): GSchemaNode | undefined {
        const n = this._nodes.get(uid);
        return n && !n.deleted ? n : undefined;
    }

    edge(uid: string): GSchemaEdge | undefined {
        const e = this._edges.get(uid);
        return e && !e.deleted ? e : undefined;
    }

    allNodes(): GSchemaNode[] {
        return [...this._nodes.values()].filter(n => !n.deleted);
    }

    allEdges(): GSchemaEdge[] {
        return [...this._edges.values()].filter(e => !e.deleted);
    }

    /** Returns all active edges going out of a node. */
    edgesFrom(nodeUid: string): GSchemaEdge[] {
        const uids = this._adjacency.out.get(nodeUid) ?? new Set();
        return [...uids].map(uid => this._edges.get(uid)).filter(
            (e): e is GSchemaEdge => e !== undefined && !e.deleted
        );
    }

    /** Returns all active edges coming into a node. */
    edgesTo(nodeUid: string): GSchemaEdge[] {
        const uids = this._adjacency.in.get(nodeUid) ?? new Set();
        return [...uids].map(uid => this._edges.get(uid)).filter(
            (e): e is GSchemaEdge => e !== undefined && !e.deleted
        );
    }

    /** Returns all claims for a node and predicate. */
    getClaims(nodeUid: string, predicate: string): GClaim[] {
        return this._claims.get(nodeUid)?.get(predicate) ?? [];
    }

    /** Returns the preferred claim for a node and predicate, or null. */
    getPreferred(nodeUid: string, predicate: string): GClaim | null {
        return this.getClaims(nodeUid, predicate).find(
            c => c.isPreferred && c.status !== "retracted"
        ) ?? null;
    }

    /** Returns the preferred value for a predicate, cast to T. */
    getValue<T>(nodeUid: string, predicate: string): T | null {
        return (this.getPreferred(nodeUid, predicate)?.value as T) ?? null;
    }

    /** Returns all predicates that have at least one active claim for a node. */
    getPredicates(nodeUid: string): string[] {
        return [...(this._claims.get(nodeUid)?.keys() ?? [])];
    }

    /** Returns all parents of a person (via ParentChild edges). */
    getParents(personUid: string): Array<{ parent: GSchemaNode; edge: ParentChildEdge }> {
        return this.edgesTo(personUid)
            .filter((e): e is ParentChildEdge => e.type === "ParentChild")
            .map(edge => {
                const parent = this._nodes.get(edge.fromUid);
                return parent && !parent.deleted ? { parent, edge } : null;
            })
            .filter((x): x is { parent: GSchemaNode; edge: ParentChildEdge } => x !== null);
    }

    /** Returns all children of a person (via ParentChild edges). */
    getChildren(personUid: string): Array<{ child: GSchemaNode; edge: ParentChildEdge }> {
        return this.edgesFrom(personUid)
            .filter((e): e is ParentChildEdge => e.type === "ParentChild")
            .map(edge => {
                const child = this._nodes.get(edge.toUid);
                return child && !child.deleted ? { child, edge } : null;
            })
            .filter((x): x is { child: GSchemaNode; edge: ParentChildEdge } => x !== null);
    }

    /** Returns all unions (marriages/partnerships) a person belongs to. */
    getUnions(personUid: string): Array<{ union: GSchemaNode; edge: MemberEdge }> {
        return this.edgesFrom(personUid)
            .filter((e): e is MemberEdge => e.type === "Member")
            .map(edge => {
                const union = this._nodes.get(edge.toUid);
                return union && !union.deleted ? { union, edge } : null;
            })
            .filter((x): x is { union: GSchemaNode; edge: MemberEdge } => x !== null);
    }

    /** Returns all members of a union. */
    getMembers(unionUid: string): Array<{ person: GSchemaNode; edge: MemberEdge }> {
        return this.edgesTo(unionUid)
            .filter((e): e is MemberEdge => e.type === "Member")
            .map(edge => {
                const person = this._nodes.get(edge.fromUid);
                return person && !person.deleted ? { person, edge } : null;
            })
            .filter((x): x is { person: GSchemaNode; edge: MemberEdge } => x !== null);
    }

    // ── Mutations ─────────────────────────────

    addNode(nodeInput: Omit<GSchemaNode, "createdAt">, actorId = "system"): GSchemaNode {
        const node: GSchemaNode = { ...nodeInput, createdAt: nowIso() } as GSchemaNode;
        this._nodes.set(node.uid, node);
        this._updatedAt = nowIso();

        const op: AddNodeOperation = {
            opId: uuidv4(), type: "ADD_NODE", timestamp: nowSec(), actorId, node
        };
        this._journal.push(op);
        return node;
    }

    addEdge(edgeInput: Omit<GSchemaEdge, "createdAt">, actorId = "system"): GSchemaEdge {
        const edge: GSchemaEdge = { ...edgeInput, createdAt: nowIso() } as GSchemaEdge;
        this._edges.set(edge.uid, edge);
        indexEdge(this._adjacency, edge);
        this._updatedAt = nowIso();

        const op: AddEdgeOperation = {
            opId: uuidv4(), type: "ADD_EDGE", timestamp: nowSec(), actorId, edge
        };
        this._journal.push(op);
        return edge;
    }

    /**
     * Adds a claim to a node. If `makePreferred` is true (default for first claim),
     * it also clears the preferred flag from other claims for the same predicate.
     */
    addClaim(claim: GClaim, actorId = "system"): GClaim {
        if (!this._claims.has(claim.nodeUid)) {
            this._claims.set(claim.nodeUid, new Map());
        }
        const nodeMap = this._claims.get(claim.nodeUid)!;
        if (!nodeMap.has(claim.predicate)) {
            nodeMap.set(claim.predicate, []);
        }
        const existing = nodeMap.get(claim.predicate)!;

        // If being set as preferred, unset all others
        if (claim.isPreferred) {
            for (const c of existing) c.isPreferred = false;
        }

        existing.push(claim);
        this._updatedAt = nowIso();

        const op: AddClaimOperation = {
            opId: uuidv4(), type: "ADD_CLAIM", timestamp: nowSec(), actorId, claim
        };
        this._journal.push(op);
        return claim;
    }

    /** Marks a specific claim as the preferred one for its predicate. */
    setPreferredClaim(nodeUid: string, predicate: string, claimUid: string, actorId = "user"): boolean {
        const claims = this._claims.get(nodeUid)?.get(predicate);
        if (!claims) return false;

        let found = false;
        for (const c of claims) {
            c.isPreferred = c.uid === claimUid;
            if (c.uid === claimUid) found = true;
        }
        if (!found) return false;

        this._updatedAt = nowIso();
        const op: SetPrefClaimOperation = {
            opId: uuidv4(), type: "SET_PREF_CLAIM", timestamp: nowSec(), actorId,
            nodeUid, predicate, claimUid
        };
        this._journal.push(op);
        return true;
    }

    /** Marks a claim as retracted (soft delete). */
    retractClaim(claimUid: string, reason?: string, actorId = "user"): boolean {
        for (const nodeMap of this._claims.values()) {
            for (const claims of nodeMap.values()) {
                const claim = claims.find(c => c.uid === claimUid);
                if (claim) {
                    claim.status = "retracted";
                    claim.isPreferred = false;
                    this._updatedAt = nowIso();
                    const op: RetractClaimOperation = {
                        opId: uuidv4(), type: "RETRACT_CLAIM", timestamp: nowSec(), actorId,
                        claimUid, reason
                    };
                    this._journal.push(op);
                    return true;
                }
            }
        }
        return false;
    }

    /** Soft-deletes a node (hidden from UI, preserved in journal). */
    softDeleteNode(nodeUid: string, reason?: string, actorId = "user"): boolean {
        const node = this._nodes.get(nodeUid);
        if (!node) return false;
        (node as { deleted?: boolean }).deleted = true;
        this._updatedAt = nowIso();

        const op: SoftDeleteNodeOperation = {
            opId: uuidv4(), type: "SOFT_DELETE_NODE", timestamp: nowSec(), actorId,
            nodeUid, reason
        };
        this._journal.push(op);
        return true;
    }

    /** Soft-deletes an edge. */
    softDeleteEdge(edgeUid: string, reason?: string, actorId = "user"): boolean {
        const edge = this._edges.get(edgeUid);
        if (!edge) return false;
        (edge as { deleted?: boolean }).deleted = true;
        deIndexEdge(this._adjacency, edge);
        this._updatedAt = nowIso();

        const op: SoftDeleteEdgeOperation = {
            opId: uuidv4(), type: "SOFT_DELETE_EDGE", timestamp: nowSec(), actorId,
            edgeUid, reason
        };
        this._journal.push(op);
        return true;
    }

    /** Records a quarantine entry for an unrecognized tag or malformed data. */
    quarantine(entry: Omit<QuarantineOperation, "opId" | "type" | "timestamp" | "actorId">, actorId = "system"): void {
        const op: QuarantineOperation = {
            opId: uuidv4(), type: "QUARANTINE", timestamp: nowSec(), actorId,
            ...entry
        };
        this._quarantine.push(op);
        this._journal.push(op);
    }

    // ── Journal & Serialization ───────────────

    getJournal(): readonly GSchemaOperation[] {
        return this._journal;
    }

    getQuarantine(): readonly QuarantineOperation[] {
        return this._quarantine;
    }

    /** Returns the count of journal operations. */
    get journalLength(): number {
        return this._journal.length;
    }

    /** Exports the graph to a serializable plain object (for JSON storage). */
    toData(): GSchemaGraphData {
        const claims: Record<string, Record<string, GClaim[]>> = {};
        for (const [nodeUid, nodeMap] of this._claims.entries()) {
            claims[nodeUid] = {};
            for (const [pred, arr] of nodeMap.entries()) {
                claims[nodeUid][pred] = [...arr];
            }
        }

        return {
            schemaVersion: this._schemaVersion,
            graphId: this._graphId,
            createdAt: this._createdAt,
            updatedAt: this._updatedAt,
            nodes: Object.fromEntries(this._nodes),
            edges: Object.fromEntries(this._edges),
            claims,
            quarantine: [...this._quarantine]
        };
    }

    /** Generates the manifest for inclusion in a .gsk package. */
    toManifest(): GskPackageManifest {
        const data = this.toData();
        const personCount = this.allNodes().filter(n => n.type === "Person").length;
        const unionCount = this.allNodes().filter(n => n.type === "Union").length;
        const mediaCount = this.allNodes().filter(n => n.type === "Media").length;
        const mediaFiles = this.allNodes()
            .filter(n => n.type === "Media")
            .map(n => (n as { fileName?: string }).fileName ?? n.uid)
            .filter(Boolean);

        let claimCount = 0;
        for (const byPred of Object.values(data.claims)) {
            for (const arr of Object.values(byPred)) claimCount += arr.length;
        }

        return {
            schemaVersion: this._schemaVersion,
            graphId: this._graphId,
            createdAt: this._createdAt,
            updatedAt: this._updatedAt,
            stats: {
                personCount,
                unionCount,
                edgeCount: this.allEdges().length,
                claimCount,
                mediaCount,
            },
            mediaFiles,
        };
    }

    // ── Validation ────────────────────────────

    validate(): ValidationResult {
        return validateGSchemaGraph(this.toData());
    }

    // ── Stats ─────────────────────────────────

    get nodeCount(): number { return this.allNodes().length; }
    get edgeCount(): number { return this.allEdges().length; }
    get quarantineCount(): number { return this._quarantine.length; }
}
