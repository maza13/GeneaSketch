/**
 * GSchema 0.1.x — Core Type Definitions
 *
 * These types represent the GSchema graph model for GeneaSketch 0.4.0.
 * GSchema is a knowledge graph where every attribute of a person or union
 * is stored as a Claim with full provenance, enabling auditable, lossless
 * genealogical data management.
 *
 * Key principles:
 * - Every entity is a typed Node identified by a UUID (uid).
 * - Relationships are typed Edges connecting Nodes.
 * - Every attribute is a Claim on a Node, supporting multiple competing
 *   values (e.g., conflicting birth dates from different sources).
 * - One Claim per predicate can be marked as `isPreferred: true`.
 * - Operations on the graph are logged to an append-only Journal.
 */

// ─────────────────────────────────────────────
// Node Types
// ─────────────────────────────────────────────

export type GSchemaNodeType = "Person" | "Union" | "Source" | "Note" | "Media";

/** Base fields present on every node. */
export interface GSchemaNodeBase {
    /** UUID v4 — internal stable identifier. Never changes after creation. */
    uid: string;
    /** The GEDCOM XREF (e.g., "@I1@") from the original import, if applicable. Informational only. */
    xref?: string;
    /** Soft-deleted nodes are hidden from UI but preserved in the journal. */
    deleted?: boolean;
    /** ISO-8601 timestamp of node creation */
    createdAt: string;
}

export interface PersonNode extends GSchemaNodeBase {
    type: "Person";
    /** Biological sex. "X" is GSchema extension for intersex/non-binary. */
    sex: "M" | "F" | "U" | "X";
    /** Whether this person is believed to be living. Affects privacy export. */
    isLiving: boolean;
    /** True if this is a placeholder node (e.g., unknown parent). */
    isPlaceholder?: boolean;
}

export interface UnionNode extends GSchemaNodeBase {
    type: "Union";
    /** Legal/relationship classification of this union. */
    unionType: "MARR" | "DIV" | "PART" | "UNM";
}

export interface SourceNode extends GSchemaNodeBase {
    type: "Source";
    title?: string;
    abbreviation?: string;
    author?: string;
    publication?: string;
}

export interface NoteNode extends GSchemaNodeBase {
    type: "Note";
    text: string;
    mimeType?: "text/plain" | "text/html";
}

export interface MediaNode extends GSchemaNodeBase {
    type: "Media";
    fileName?: string;
    title?: string;
    mimeType?: string;
    /** Data URL or embedded blob reference. */
    dataUrl?: string;
}

export type GSchemaNode = PersonNode | UnionNode | SourceNode | NoteNode | MediaNode;

// ─────────────────────────────────────────────
// Edge Types
// ─────────────────────────────────────────────

export type GSchemaEdgeType =
    | "ParentChild"
    | "Member"
    | "Association"
    | "EvidenceRef"
    | "MediaLink"
    | "NoteLink";

export interface GSchemaEdgeBase {
    uid: string;
    type: GSchemaEdgeType;
    fromUid: string;
    toUid: string;
    deleted?: boolean;
    createdAt: string;
}

/**
 * Directed relationship: a Person is a parent of another Person.
 * Supports biological, adoptive, foster, step, and sealed relationships.
 */
export interface ParentChildEdge extends GSchemaEdgeBase {
    type: "ParentChild";
    /** The parent's role (determined by sex or explicit declaration). */
    parentRole: "father" | "mother" | "unknown";
    /** Nature of the parent-child relationship. */
    nature: "BIO" | "ADO" | "FOS" | "STE" | "SEAL" | "UNK";
    certainty: "high" | "medium" | "low" | "uncertain";
}

/**
 * A Person is a member of a Union (e.g., a marriage partnership).
 * Replaces the GEDCOM HUSB/WIFE tags.
 */
export interface MemberEdge extends GSchemaEdgeBase {
    type: "Member";
    role: "HUSB" | "WIFE" | "PART";
    isPrimary?: boolean;
}

/**
 * An informal or social association between two persons.
 * Covers godparent, witness, friend, neighbor, etc.
 */
export interface AssociationEdge extends GSchemaEdgeBase {
    type: "Association";
    associationType: "GODP" | "WITN" | "FRI" | "NGHBR" | "OTHER";
    note?: string;
}

/** A Claim references a Source as evidence. */
export interface EvidenceRefEdge extends GSchemaEdgeBase {
    type: "EvidenceRef";
    /** UID of the Claim this reference supports. */
    claimUid: string;
    /** Confidence 0–1. */
    confidence?: number;
    /** Verbatim transcription from the source. */
    transcription?: string;
    /** Bounding box within a source image (optional). */
    box?: { x: number; y: number; w: number; h: number };
    page?: string;
}

export interface MediaLinkEdge extends GSchemaEdgeBase {
    type: "MediaLink";
    /** Context: the entity (person, event) this media is primarily for. */
    context?: "primary" | "supplemental";
}

export interface NoteLinkEdge extends GSchemaEdgeBase {
    type: "NoteLink";
    /** UID of the node (Person, Union, Claim) this note is attached to. */
    targetUid: string;
}

export type GSchemaEdge =
    | ParentChildEdge
    | MemberEdge
    | AssociationEdge
    | EvidenceRefEdge
    | MediaLinkEdge
    | NoteLinkEdge;

// ─────────────────────────────────────────────
// Claims
// ─────────────────────────────────────────────

/**
 * The Claim is the atomic unit of knowledge in GSchema.
 *
 * Every attribute (name, birth date, occupation…) of a Person or Union
 * is stored as one or more Claims. When sources conflict, multiple Claims
 * for the same predicate can coexist. One is marked as `isPreferred`.
 *
 * @template T The value type (string, ParsedDate, GeoRef, etc.)
 */
export interface GClaim<T = unknown> {
    uid: string;
    /** The node (Person, Union) this claim is about. */
    nodeUid: string;
    /** Dot-separated predicate path. See predicates.ts for the full catalog. */
    predicate: string;
    /** The asserted value. */
    value: T;
    /** Who, when, and how this assertion was created. */
    provenance: ClaimProvenance;
    /** Current review status of this claim. */
    status: "raw" | "reviewed" | "verified" | "disputed" | "retracted";
    /**
     * True if this is the claim to use when rendering the UI or exporting.
     * At most ONE claim per (nodeUid, predicate) should have isPreferred: true.
     */
    isPreferred: boolean;
    /** Optional: UID of the claim this one supersedes (for corrections). */
    supersedes?: string;
    createdAt: string;
}

export interface ClaimProvenance {
    /** Who created this claim. Could be a user ID, "system_importer", "ai_inference", etc. */
    actorId: string;
    /** Unix timestamp (seconds) of assertion. */
    timestamp: number;
    /**
     * Machine-readable method that generated this claim.
     * Format: "parsing:gedcom:5.5.1" | "user:manual" | "ai:birth_inference:v2" | etc.
     */
    method: string;
}

// ─────────────────────────────────────────────
// Specialized Claim Value Types
// ─────────────────────────────────────────────

/**
 * A parsed genealogical date, allowing for ranges, estimates, and partial dates.
 */
export interface ParsedDate {
    /** Exact or approximate year. */
    year?: number;
    month?: number;
    day?: number;
    /** For ranges: "ABT 1850", "BEF 1860", "AFT 1840", "BET 1850 AND 1860". */
    qualifier?: "ABT" | "EST" | "CAL" | "BEF" | "AFT" | "BET";
    /** For BET ranges, the end year. */
    yearEnd?: number;
    /** The original unparsed string (preserved for lossless export). */
    raw: string;
    /** True if this date was inferred, not directly attested. */
    isInferred?: boolean;
}

/** A geographic reference, potentially linked to a standard gazetteer. */
export interface GeoRef {
    /** Full place string as would appear in GEDCOM. */
    placeRaw: string;
    /** Normalized hierarchy from most to least specific. */
    parts?: string[];
    /** WGS84 coordinates if known. */
    lat?: number;
    lon?: number;
    /** External authority identifier (e.g., Wikidata QID). */
    authorityId?: string;
}

// ─────────────────────────────────────────────
// Journal Operations
// ─────────────────────────────────────────────

/**
 * The operation types that can be recorded in the append-only Journal.
 * These form the basis for replay, undo (future), and CRDT sync (future).
 */
export type GSchemaOperationType =
    | "ADD_NODE"
    | "ADD_EDGE"
    | "ADD_CLAIM"
    | "SET_PREF_CLAIM"
    | "RETRACT_CLAIM"
    | "SOFT_DELETE_NODE"
    | "SOFT_DELETE_EDGE"
    | "QUARANTINE"
    | "INITIAL_IMPORT";

export interface GSchemaOperationBase {
    opId: string;
    type: GSchemaOperationType;
    /** Unix timestamp of the operation. */
    timestamp: number;
    actorId: string;
}

export interface AddNodeOperation extends GSchemaOperationBase {
    type: "ADD_NODE";
    node: GSchemaNode;
}

export interface AddEdgeOperation extends GSchemaOperationBase {
    type: "ADD_EDGE";
    edge: GSchemaEdge;
}

export interface AddClaimOperation extends GSchemaOperationBase {
    type: "ADD_CLAIM";
    claim: GClaim;
}

export interface SetPrefClaimOperation extends GSchemaOperationBase {
    type: "SET_PREF_CLAIM";
    nodeUid: string;
    predicate: string;
    claimUid: string;
}

export interface RetractClaimOperation extends GSchemaOperationBase {
    type: "RETRACT_CLAIM";
    claimUid: string;
    reason?: string;
}

export interface SoftDeleteNodeOperation extends GSchemaOperationBase {
    type: "SOFT_DELETE_NODE";
    nodeUid: string;
    reason?: string;
}

export interface SoftDeleteEdgeOperation extends GSchemaOperationBase {
    type: "SOFT_DELETE_EDGE";
    edgeUid: string;
    reason?: string;
}

export interface QuarantineOperation extends GSchemaOperationBase {
    type: "QUARANTINE";
    importId: string;
    rawTag: string;
    rawValue?: string;
    reason: string;
    context?: string;
}

export interface InitialImportOperation extends GSchemaOperationBase {
    type: "INITIAL_IMPORT";
    sourceFormat: "GEDCOM_551" | "GEDCOM_703" | "GSZ_03x" | "GSK_01x";
    sourceFileName?: string;
    nodeCount: number;
    edgeCount: number;
    claimCount: number;
}

export type GSchemaOperation =
    | AddNodeOperation
    | AddEdgeOperation
    | AddClaimOperation
    | SetPrefClaimOperation
    | RetractClaimOperation
    | SoftDeleteNodeOperation
    | SoftDeleteEdgeOperation
    | QuarantineOperation
    | InitialImportOperation;

// ─────────────────────────────────────────────
// Graph Container
// ─────────────────────────────────────────────

/**
 * The top-level container for a GSchema graph.
 * This is what gets serialized to `graph.json` inside a .gsk package.
 */
export interface GSchemaGraph {
    /** GSchema format version (SemVer). */
    schemaVersion: string;
    /** UUID of this specific graph instance. */
    graphId: string;
    createdAt: string;
    updatedAt: string;

    /** All nodes by uid. */
    nodes: Record<string, GSchemaNode>;
    /** All edges by uid. */
    edges: Record<string, GSchemaEdge>;
    /**
     * Claims indexed by nodeUid, then predicate.
     * Structure: claims[nodeUid][predicate] = GClaim[]
     */
    claims: Record<string, Record<string, GClaim[]>>;
    /** Quarantined entries that couldn't be mapped to GSchema. */
    quarantine: QuarantineOperation[];
}

// ─────────────────────────────────────────────
// Manifest (for .gsk package)
// ─────────────────────────────────────────────

export interface GskPackageManifest {
    schemaVersion: string;
    graphId: string;
    createdAt: string;
    updatedAt: string;
    stats: {
        personCount: number;
        unionCount: number;
        edgeCount: number;
        claimCount: number;
        mediaCount: number;
    };
    /** List of media files included in the package. */
    mediaFiles: string[];
    /** Format of the original source file, if imported. */
    importedFrom?: string;
}
