/**
 * GeneGraph Persistence Phase 1: GEDCOM 7.0.x Support
 * This is a minimal implementation to satisfy Phase 1 requirements.
 * In a real scenario, this would orchestrate with the existing GEDCOM parser.
 */

import { GeneGraph } from "./types";

/**
 * Minimal GEDCOM 7.0 generator from GeneGraph.
 */
export function exportToGedcom7(graph: GeneGraph): string {
    const lines: string[] = [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "1 CHAR UTF-8"
    ];

    // Export Persons
    for (const person of Object.values(graph.persons)) {
        const xref = person.xref || `@I${person.id}@`;
        lines.push(`0 ${xref} INDI`);
        lines.push(`1 NAME ${person.name} /${person.surname || ""}/`);
        lines.push(`1 SEX ${person.sex}`);

        if (person.birthDate || person.birthPlace) {
            lines.push("1 BIRT");
            if (person.birthDate) lines.push(`2 DATE ${person.birthDate}`);
            if (person.birthPlace) lines.push(`2 PLAC ${person.birthPlace}`);
        }

        if (person.deathDate || person.deathPlace) {
            lines.push("1 DEAT");
            if (person.deathDate) lines.push(`2 DATE ${person.deathDate}`);
            if (person.deathPlace) lines.push(`2 PLAC ${person.deathPlace}`);
        }

        if (person.parentsFamilyId) {
            const pFam = graph.families[person.parentsFamilyId];
            if (pFam) {
                lines.push(`1 FAMC ${pFam.xref || `@F${pFam.id}@`}`);
            }
        }

        for (const fId of person.familyIds) {
            const fam = graph.families[fId];
            if (fam) {
                lines.push(`1 FAMS ${fam.xref || `@F${fam.id}@`}`);
            }
        }
    }

    // Export Families
    for (const family of Object.values(graph.families)) {
        const xref = family.xref || `@F${family.id}@`;
        lines.push(`0 ${xref} FAM`);

        // In GEDCOM 7, partners are usually HUSB/WIFE or just PART (depending on sub-spec)
        // For Phase 1 we stick to the traditional HUSB/WIFE mapping for husbandId/wifeId logic if sex is known
        for (const pId of family.partners) {
            const p = graph.persons[pId];
            if (p?.sex === "M") lines.push(`1 HUSB ${p.xref || `@I${p.id}@`}`);
            else if (p?.sex === "F") lines.push(`1 WIFE ${p.xref || `@I${p.id}@`}`);
            else lines.push(`1 PART ${p?.xref || `@I${pId}@`}`);
        }

        for (const cId of family.children) {
            const c = graph.persons[cId];
            lines.push(`1 CHIL ${c?.xref || `@I${cId}@`}`);
        }

        for (const event of family.events) {
            lines.push(`1 ${event.type}`);
            if (event.date) lines.push(`2 DATE ${event.date}`);
            if (event.place) lines.push(`2 PLAC ${event.place}`);
        }
    }

    lines.push("0 TRLR");
    return lines.join("\n");
}
