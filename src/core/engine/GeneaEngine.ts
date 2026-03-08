import {
    addRelation,
    createNewTree,
    createPerson,
    linkExistingRelation,
    unlinkChild,
    unlinkParent,
    unlinkSpouse,
    updateFamily,
    updateNoteRecord,
    updatePerson,
    type PersonInput
} from "@/core/edit/commands";

export type { PersonInput };
import type { GeneaDocument } from "@/types/domain";
import { normalizePersonSurnames } from "@/core/naming/surname";
// For now, I'll define it to keep the engine working.
export type PersonPatch = {
    name?: string;
    surname?: string;
    surnamePaternal?: string;
    surnameMaternal?: string;
    surnameOrder?: "paternal_first" | "maternal_first" | "single";
    birthDate?: string;
    birthPlace?: string;
    deathDate?: string;
    deathPlace?: string;
    residence?: string;
    isPlaceholder?: boolean;
    sex?: "M" | "F" | "U";
    lifeStatus?: "alive" | "deceased";
    photoDataUrl?: string | null;
    notesAppend?: string[];
    notesReplace?: string[];
};

/**
 * GeneaEngine: Pure logic for GeneaDocument mutations and orchestration.
 * This module is independent of the UI state and can be used in tests, 
 * background workers, or the main store.
 */
export const GeneaEngine = {
    // Re-exports from commands for central access
    createNewTree,
    /** @deprecated Use GraphMutations.createPersonInGraph instead */
    createPerson,
    /** @deprecated Use GraphMutations.updatePersonInGraph instead */
    updatePerson,
    /** @deprecated Use GraphMutations.updateFamilyInGraph instead */
    updateFamily,
    /** @deprecated Use GraphMutations.linkRelationInGraph instead */
    linkExistingRelation,
    /** @deprecated Use GraphMutations.unlinkRelationInGraph instead */
    unlinkChild,
    /** @deprecated Use GraphMutations.unlinkRelationInGraph instead */
    unlinkParent,
    /** @deprecated Use GraphMutations.unlinkRelationInGraph instead */
    unlinkSpouse,
    /** @deprecated Use GraphMutations.createPersonInGraph and GraphMutations.linkRelationInGraph instead */
    addRelation,
    updateNoteRecord,

    /**
     * Normalizes legacy document fields for Genraph 0.3.x compatibility.
     */
    normalizeDocument(document: GeneaDocument | null): GeneaDocument | null {
        if (!document) return null;
        // We use a shallow copy plus deep clones for records to avoid unnecessary overhead 
        // while ensuring we don't mutate the original if it's being used elsewhere.
        const next = { ...document };

        // Ensure core records exist
        next.persons = { ...next.persons };
        next.families = { ...next.families };
        next.media = next.media ? { ...next.media } : {};
        next.sources = next.sources ? { ...next.sources } : {};
        next.notes = next.notes ? { ...next.notes } : {};

        for (const personId in next.persons) {
            const person = { ...next.persons[personId] };
            if (!person.sex) person.sex = "U";
            if (!person.lifeStatus) person.lifeStatus = "alive";
            if (!Array.isArray(person.events)) person.events = [];
            if (!Array.isArray(person.famc)) person.famc = [];
            if (!Array.isArray(person.fams)) person.fams = [];
            if (!Array.isArray(person.mediaRefs)) person.mediaRefs = [];
            if (!Array.isArray(person.sourceRefs)) person.sourceRefs = [];
            if (!Array.isArray(person.noteRefs)) person.noteRefs = [];

            if (!Array.isArray(person.names) || person.names.length === 0) {
                person.names = [{
                    value: person.surname ? `${person.name} /${person.surname}/` : person.name,
                    given: person.name,
                    surname: person.surname,
                    type: "primary",
                    primary: true
                }];
            }
            const canonical = normalizePersonSurnames(person);
            person.surname = canonical.surname;
            person.surnamePaternal = canonical.surnamePaternal;
            person.surnameMaternal = canonical.surnameMaternal;
            person.surnameOrder = canonical.surnameOrder;

            person.events = person.events.map((event, index) => ({
                ...event,
                id: event.id || `evt-${index + 1}`,
                sourceRefs: Array.isArray(event.sourceRefs) ? event.sourceRefs : [],
                mediaRefs: Array.isArray(event.mediaRefs) ? event.mediaRefs : [],
                notesInline: Array.isArray(event.notesInline) ? event.notesInline : [],
                noteRefs: Array.isArray(event.noteRefs) ? event.noteRefs : []
            }));

            next.persons[personId] = person;
        }

        for (const familyId in next.families) {
            const family = { ...next.families[familyId] };
            if (!Array.isArray(family.childrenIds)) family.childrenIds = [];
            if (!Array.isArray(family.events)) family.events = [];
            if (!Array.isArray(family.noteRefs)) family.noteRefs = [];

            family.events = family.events.map((event, index) => ({
                ...event,
                id: event.id || `evt-${index + 1}`,
                sourceRefs: Array.isArray(event.sourceRefs) ? event.sourceRefs : [],
                mediaRefs: Array.isArray(event.mediaRefs) ? event.mediaRefs : [],
                notesInline: Array.isArray(event.notesInline) ? event.notesInline : [],
                noteRefs: Array.isArray(event.noteRefs) ? event.noteRefs : []
            }));

            next.families[familyId] = family;
        }

        if (!next.metadata) next.metadata = { sourceFormat: "GED", gedVersion: "7.0.x" };
        if (!next.metadata.sourceFormat) next.metadata.sourceFormat = "GED";
        if (!next.metadata.gedVersion) next.metadata.gedVersion = "7.0.x";

        return next;
    },

    /**
     * @deprecated Use GraphMutations.unlinkRelationInGraph instead.
     * Unified wrapper for unlinking any relation type.
     */
    unlinkAny(doc: GeneaDocument, personId: string, relatedId: string, type: "parent" | "child" | "spouse"): GeneaDocument {
        switch (type) {
            case "parent": return unlinkParent(doc, personId, relatedId);
            case "child": return unlinkChild(doc, personId, relatedId);
            case "spouse": return unlinkSpouse(doc, personId, relatedId);
            default: return doc;
        }
    }
};
