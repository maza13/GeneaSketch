/**
 * Genraph 0.1.x — Core Type Definitions
 *
 * These types represent the Genraph graph model for GeneaSketch 0.2.0.
 * Genraph is a knowledge graph where every attribute of a person or union
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

export type GenraphNodeType = "Person" | "Union" | "Source" | "Note" | "Media";

/** Base fields present on every node. */
export interface GenraphNodeBase {
    /** UUID v4 — internal stable identifier. Never changes after creation. */
    uid: string;
    /** The GEDCOM XREF (e.g., "@I1@") from the original import, if applicable. Informational only. */
    xref?: string;
    /** Soft-deleted nodes are hidden from UI but preserved in the journal. */
    deleted?: boolean;
    /** ISO-8601 timestamp of node creation */
    createdAt: string;
}

export interface PersonNode extends GenraphNodeBase {
    type: "Person";
    /** Biological sex. "X" is Genraph extension for intersex/non-binary. */
    sex: "M" | "F" | "U" | "X";
    /** Whether this person is believed to be living. Affects privacy export. */
    isLiving: boolean;
    /** True if this is a placeholder node (e.g., unknown parent). */
    isPlaceholder?: boolean;
}

export interface UnionNode extends GenraphNodeBase {
    type: "Union";
    /** Legal/relationship classification of this union. */
    unionType: "MARR" | "DIV" | "PART" | "UNM";
}

export interface SourceNode extends GenraphNodeBase {
    type: "Source";
    title?: string;
    abbreviation?: string;
    author?: string;
    publication?: string;
}

export interface NoteNode extends GenraphNodeBase {
    type: "Note";
    text: string;
    mimeType?: "text/plain" | "text/html";
}

export interface MediaNode extends GenraphNodeBase {
    type: "Media";
    fileName?: string;
    title?: string;
    mimeType?: string;
    /** Data URL or embedded blob reference. */
    dataUrl?: string;
}

export type GenraphNode = PersonNode | UnionNode | SourceNode | NoteNode | MediaNode;

// ─────────────────────────────────────────────
// Edge Types
// ─────────────────────────────────────────────

export type GenraphEdgeType =
    | "ParentChild"
    | "Member"
    | "Association"
    | "EvidenceRef"
    | "MediaLink"
    | "NoteLink";

export interface GenraphEdgeBase {
    uid: string;
    type: GenraphEdgeType;
    fromUid: string;
    toUid: string;
    evidenceGate?: "direct" | "indirect" | "negative" | "unassessed";
    deleted?: boolean;
    createdAt: string;
}

/**
 * Directed relationship: a Person is a parent of another Person.
 * Supports biological, adoptive, foster, step, and sealed relationships.
 */
export interface ParentChildEdge extends GenraphEdgeBase {
    type: "ParentChild";
    /** The parent's role (determined by sex or explicit declaration). */
    parentRole: "father" | "mother" | "unknown";
    /** Required canonical union context for this parent-child link. */
    unionUid: string;
    /** Nature of the parent-child relationship. */
    nature: "BIO" | "ADO" | "FOS" | "STE" | "SEAL" | "UNK";
    certainty: "high" | "medium" | "low" | "uncertain";
    /** Optional import assumptions applied by GEDCOM defaults policy. */
    gedcomAssumptions?: {
        defaultPolicy: "conservative" | "legacy-aggressive";
        pediDefaultApplied?: boolean;
        quayDefaultApplied?: boolean;
        pediInput?: string;
        quayInput?: string;
    };
}

/**
 * A Person is a member of a Union (e.g., a marriage partnership).
 * Replaces the GEDCOM HUSB/WIFE tags.
 */
export interface MemberEdge extends GenraphEdgeBase {
    type: "Member";
    role: "HUSB" | "WIFE" | "PART";
    isPrimary?: boolean;
}

/**
 * An informal or social association between two persons.
 * Covers godparent, witness, friend, neighbor, etc.
 */
export interface AssociationEdge extends GenraphEdgeBase {
    type: "Association";
    associationType: "GODP" | "WITN" | "FRI" | "NGHBR" | "OTHER";
    note?: string;
}

/** A Claim references a Source as evidence. */
export interface EvidenceRefEdge extends GenraphEdgeBase {
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

export interface MediaLinkEdge extends GenraphEdgeBase {
    type: "MediaLink";
    /** Context: the entity (person, event) this media is primarily for. */
    context?: "primary" | "supplemental";
}

export interface NoteLinkEdge extends GenraphEdgeBase {
    type: "NoteLink";
    /** UID of the node (Person, Union, Claim) this note is attached to. */
    targetUid: string;
}

export type GenraphEdge =
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
 * The Claim is the atomic unit of knowledge in Genraph.
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
    /** Current epistemic quality (independent from lifecycle). */
    quality: "raw" | "reviewed" | "verified" | "disputed";
    /** Logical lifecycle state of the claim. */
    lifecycle: "active" | "retracted";
    /** Optional evidence gate classification for review workflows. */
    evidenceGate?: "direct" | "indirect" | "negative" | "unassessed";
    /** Optional structured citations supporting this claim. */
    citations?: ClaimCitation[];
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

export interface ClaimCitation {
    sourceUid: string;
    transcription?: string;
    page?: string;
    confidence?: number;
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
    /** True if the date has a non-standard or informal format. */
    isInformal?: boolean;
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
export type GenraphOperationType =
    | "ADD_NODE"
    | "ADD_EDGE"
    | "ADD_CLAIM"
    | "SET_PREF_CLAIM"
    | "RETRACT_CLAIM"
    | "SOFT_DELETE_NODE"
    | "SOFT_DELETE_EDGE"
    | "REPAIR_CREATE_UNION"
    | "REPAIR_CREATE_MEMBER_EDGE"
    | "REPAIR_RELINK_PARENT_CHILD"
    | "QUARANTINE"
    | "INITIAL_IMPORT";

export interface GenraphOperationBase {
    opId: string;
    /** Monotonic sequence number used for deterministic replay ordering. */
    opSeq: number;
    type: GenraphOperationType;
    /** Unix timestamp of the operation. */
    timestamp: number;
    actorId: string;
}

export interface AddNodeOperation extends GenraphOperationBase {
    type: "ADD_NODE";
    node: GenraphNode;
}

export interface AddEdgeOperation extends GenraphOperationBase {
    type: "ADD_EDGE";
    edge: GenraphEdge;
}

export interface AddClaimOperation extends GenraphOperationBase {
    type: "ADD_CLAIM";
    claim: GClaim;
}

export interface SetPrefClaimOperation extends GenraphOperationBase {
    type: "SET_PREF_CLAIM";
    nodeUid: string;
    predicate: string;
    claimUid: string;
}

export interface RetractClaimOperation extends GenraphOperationBase {
    type: "RETRACT_CLAIM";
    claimUid: string;
    reason?: string;
}

export interface SoftDeleteNodeOperation extends GenraphOperationBase {
    type: "SOFT_DELETE_NODE";
    nodeUid: string;
    reason?: string;
}

export interface SoftDeleteEdgeOperation extends GenraphOperationBase {
    type: "SOFT_DELETE_EDGE";
    edgeUid: string;
    reason?: string;
}

export interface RepairCreateUnionOperation extends GenraphOperationBase {
    type: "REPAIR_CREATE_UNION";
    synthetic: true;
    method: string;
    unionUid: string;
    childUid: string;
    parentUids: string[];
}

export interface RepairCreateMemberEdgeOperation extends GenraphOperationBase {
    type: "REPAIR_CREATE_MEMBER_EDGE";
    synthetic: true;
    method: string;
    edgeUid: string;
    unionUid: string;
    parentUid: string;
    role: "HUSB" | "WIFE" | "PART";
}

export interface RepairRelinkParentChildOperation extends GenraphOperationBase {
    type: "REPAIR_RELINK_PARENT_CHILD";
    synthetic: true;
    method: string;
    edgeUid: string;
    unionUid: string;
    previousUnionUid?: string;
}

export interface QuarantineAstNode {
    level: number;
    tag: string;
    value?: string;
    pointer?: string;
    children: QuarantineAstNode[];
    sourceLines?: string[];
}

export interface QuarantineOperation extends GenraphOperationBase {
    type: "QUARANTINE";
    importId: string;
    ast: QuarantineAstNode;
    reason: string;
    context?: string;
    originalGedcomVersion?: string;
}

export interface InitialImportOperation extends GenraphOperationBase {
    type: "INITIAL_IMPORT";
    sourceFormat: "GEDCOM_551" | "GEDCOM_703" | "GSZ_03x" | "GSK_01x";
    sourceFileName?: string;
    nodeCount: number;
    edgeCount: number;
    claimCount: number;
}

export type GenraphOperation =
    | AddNodeOperation
    | AddEdgeOperation
    | AddClaimOperation
    | SetPrefClaimOperation
    | RetractClaimOperation
    | SoftDeleteNodeOperation
    | SoftDeleteEdgeOperation
    | RepairCreateUnionOperation
    | RepairCreateMemberEdgeOperation
    | RepairRelinkParentChildOperation
    | QuarantineOperation
    | InitialImportOperation;

// ─────────────────────────────────────────────
// Graph Container
// ─────────────────────────────────────────────

/**
 * The top-level container for a Genraph graph.
 * This is what gets serialized to `graph.json` inside a .gsk package.
 */
export interface GenraphGraph {
    /** Genraph format version (SemVer). */
    schemaVersion: string;
    /** UUID of this specific graph instance. */
    graphId: string;
    createdAt: string;
    updatedAt: string;

    /** All nodes by uid. */
    nodes: Record<string, GenraphNode>;
    /** All edges by uid. */
    edges: Record<string, GenraphEdge>;
    /**
     * Claims indexed by nodeUid, then predicate.
     * Structure: claims[nodeUid][predicate] = GClaim[]
     */
    claims: Record<string, Record<string, GClaim[]>>;
    /** Quarantined entries that couldn't be mapped to Genraph. */
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
    /** Last opSeq represented in graph.json snapshot. */
    graphDerivedFromOpSeq: number;
    /** Last opSeq present in journal.jsonl. */
    journalHeadOpSeq: number;
    /** Structured media manifest for deterministic integrity checks. */
    mediaEntries?: GskMediaEntry[];
    /** Full-package integrity tree + hash. */
    integrity?: GskIntegrityBlock;
    /** Security contract block (reserved/no-op in 0.4.0). */
    security?: GskSecurityBlock;
    /** SHA-256 over journal.jsonl bytes (hex). */
    journalHash?: string;
    /** SHA-256 over graph.json bytes (hex). */
    graphHash?: string;
    /** Signature metadata (future cryptographic verification policy). */
    signature?: string;
    /** Container encryption mode. */
    encryption?: "none" | "aes-256-gcm";
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

export interface GskMediaEntry {
    uid: string;
    path: string;
    sha256: string;
    bytes: number;
    mime: string;
}

export interface GskIntegrityEntry {
    path: string;
    sha256: string;
    bytes: number;
    role: "manifest" | "graph" | "journal" | "quarantine" | "media" | "meta";
    canonicalized?: boolean;
}

export interface GskIntegrityBlock {
    algorithm: "sha256";
    packageHash: string;
    entries: GskIntegrityEntry[];
}

export interface GskSecurityBlock {
    mode: "none";
    signature: { mode: "none" };
    encryption: { mode: "none" };
}
