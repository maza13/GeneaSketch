import { GgRelationshipSelector } from "./selector";

/**
 * atomic fact: can be an event or a note.
 */
export interface GgFact {
    type: "BIRT" | "DEAT" | "MARR" | "DIV" | "NOTE";
    date?: string;
    place?: string;
    text?: string;
    confidence?: "direct" | "hearsay" | "unknown";
}

/**
 * Links a fact to one or more selectors.
 */
export interface GgFactApplication {
    factIndex: number;
    selector: GgRelationshipSelector;
}

/**
 * Used when the AI identifies a specific name for a new entity.
 */
export interface GgNewEntity {
    tempId: string; // e.g. "new_1"
    name: string;
    surname?: string;
    sex?: "M" | "F" | "U";
    relationToAnchor: GgRelationshipSelector;
}

/**
 * The full output the AI should produce in Local Mode.
 */
export interface GgAiOutput {
    facts: GgFact[];
    applications: GgFactApplication[];
    newEntities: GgNewEntity[];
    userMessage: string;
}
