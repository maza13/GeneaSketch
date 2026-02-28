import { GeneGraph, GgPerson, GgFamily } from "./types";
import { GeneaDocument, Person, Family } from "@/types/domain";

/**
 * Converts GeneGraph (internal model) to GeneaDocument (UI/Legacy View Model).
 */
export function toViewModel(graph: GeneGraph): GeneaDocument {
    const persons: Record<string, Person> = {};
    const families: Record<string, Family> = {};

    for (const ggp of Object.values(graph.persons)) {
        persons[ggp.id] = {
            id: ggp.id,
            name: ggp.name,
            surname: ggp.surname,
            sex: ggp.sex,
            lifeStatus: ggp.lifeStatus,
            birthDate: ggp.birthDate,
            birthPlace: ggp.birthPlace,
            deathDate: ggp.deathDate,
            deathPlace: ggp.deathPlace,
            residence: ggp.residence,
            events: ggp.events.map(e => ({
                type: e.type,
                date: e.date,
                place: e.place
            })),
            famc: ggp.parentsFamilyId ? [ggp.parentsFamilyId] : [],
            fams: ggp.familyIds,
            mediaRefs: [],
            sourceRefs: [],
            rawTags: ggp.rawTags
        };
    }

    for (const ggf of Object.values(graph.families)) {
        const husband = ggf.partners.find(p => graph.persons[p]?.sex === "M");
        const wife = ggf.partners.find(p => graph.persons[p]?.sex === "F");

        families[ggf.id] = {
            id: ggf.id,
            husbandId: husband,
            wifeId: wife,
            childrenIds: ggf.children,
            events: ggf.events.map(e => ({
                type: e.type,
                date: e.date,
                place: e.place
            })),
            rawTags: ggf.rawTags
        };
    }

    return {
        persons,
        families,
        media: {},
        metadata: {
            sourceFormat: "GSZ",
            gedVersion: "7.0.x",
            importProvenance: []
        }
    };
}

/**
 * Converts GeneaDocument (UI/Legacy View Model) to GeneGraph (internal model).
 */
export function fromViewModel(doc: GeneaDocument): GeneGraph {
    const persons: Record<string, GgPerson> = {};
    const families: Record<string, GgFamily> = {};

    for (const p of Object.values(doc.persons)) {
        persons[p.id] = {
            id: p.id,
            name: p.name,
            surname: p.surname,
            sex: p.sex,
            lifeStatus: p.lifeStatus,
            birthDate: p.birthDate,
            birthPlace: p.birthPlace,
            deathDate: p.deathDate,
            deathPlace: p.deathPlace,
            residence: p.residence,
            events: p.events.map(e => ({
                type: e.type,
                date: e.date,
                place: e.place
            })),
            notes: [],
            parentsFamilyId: p.famc[0], // Phase 1: only first famc
            familyIds: p.fams,
            rawTags: p.rawTags
        };
    }

    for (const f of Object.values(doc.families)) {
        const partners: string[] = [];
        if (f.husbandId) partners.push(f.husbandId);
        if (f.wifeId) partners.push(f.wifeId);

        families[f.id] = {
            id: f.id,
            partners,
            children: f.childrenIds,
            events: f.events.map(e => ({
                type: e.type,
                date: e.date,
                place: e.place
            })),
            notes: [],
            rawTags: f.rawTags
        };
    }

    return {
        persons,
        families,
        indices: {
            byXref: new Map(),
            byName: new Map()
        }
    };
}
