/**
 * GeneGraph Core Types (Phase 1)
 * Internal deterministic model for genealogical data.
 */

export type GgId = string;
export type GgXref = string; // GEDCOM xref like @I1@

export type GgSex = "M" | "F" | "U";

export type GgConfidence = "direct" | "hearsay" | "unknown";

export interface GgNote {
    text: string;
    confidence: GgConfidence;
}

export type GgEventType = "BIRT" | "DEAT" | "MARR" | "DIV" | "OTHER";

export interface GgEvent {
    type: GgEventType;
    date?: string;
    place?: string;
    rawText?: string;
    confidence?: number; // 0..1
}

export interface GgPerson {
    id: GgId;
    name: string;
    surname?: string;
    sex: GgSex;
    lifeStatus: "alive" | "deceased";

    birthDate?: string;
    birthPlace?: string;
    deathDate?: string;
    deathPlace?: string;
    residence?: string;

    events: GgEvent[];
    notes: GgNote[];

    // Graph Adjacency
    parentsFamilyId?: GgId; // The family where this person is a child
    familyIds: GgId[];      // Families where this person is a partner (parent)

    // External Mappings
    xref?: GgXref;
    rawTags?: Record<string, string[]>;
}

export interface GgFamily {
    id: GgId;
    partners: GgId[];
    children: GgId[];

    events: GgEvent[];
    notes: GgNote[];

    // External Mappings
    xref?: GgXref;
    rawTags?: Record<string, string[]>;
}

export interface GeneGraph {
    persons: Record<GgId, GgPerson>;
    families: Record<GgId, GgFamily>;

    // Indices for fast lookup
    indices: {
        byXref: Map<GgXref, GgId>;
        byName: Map<string, GgId[]>;
    };
}
