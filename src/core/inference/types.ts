export type InferenceEvidence = {
    type: "strict_limit" | "contextual" | "info";
    sourceId: string;
    message: string;
    suggestedRange?: [number, number];
    minLimit?: number;
    maxLimit?: number;
    layer?: 1 | 2 | 3;
    impact?: "high" | "medium" | "low";
    ruleId?: string;
    relationClass?: string;
    count?: number;
};

export type FactEvent = {
    personId: string;
    relationToFocus: "focus" | "parent" | "child" | "spouse" | "sibling" | "other";
    eventTag: "BIRT" | "DEAT" | "MARR" | "DIV" | "CHR" | "BAPM" | "BURI" | "CENS" | "RESI" | "NOTE";
    dateRaw?: string;
    placeRaw?: string;
    value?: string;
    quality?: "0" | "1" | "2" | "3";
    reference: string;
    flags?: string[];
    layer?: 1 | 2 | 3;
    generationDelta?: number;
    relationPath?: string[];
};

export type YearSpan = {
    minYear?: number;
    maxYear?: number;
    precision: "exact" | "year" | "range" | "open_before" | "open_after" | "unknown";
    warnings: string[];
};

export type EvidenceInterval = {
    id: string;
    kind: "hard" | "soft" | "info";
    type: string;
    hardSpan?: [number, number];
    bestSpan?: [number, number];
    weight: number;
    qualityFactor: number;
    reference: string;
    label: string;
    notes: string[];
    layer?: 1 | 2 | 3;
    impact?: "high" | "medium" | "low";
    relationClass?: string;
    ruleId?: string;
};

export type ConstraintSolveResult = {
    feasibleSpan: [number, number];
    finalRange: [number, number];
    confidence: number;
    usedEvidence: EvidenceInterval[];
    droppedEvidence: EvidenceInterval[];
    diagnostics: string[];
};

export type InferenceResult = {
    minYear?: number;
    maxYear?: number;
    suggestedYear?: number;
    suggestedRange?: [number, number];
    evidences: InferenceEvidence[];
    evidenceSummary?: InferenceEvidence[];
    evidenceGroups?: Array<{ key: string; label: string; items: InferenceEvidence[] }>;
    isImpossible?: boolean;
    diagnostics?: string[];
    droppedEvidenceRefs?: string[];
};

export type InferenceEventTypes = "BIRT" | "DEAT";
