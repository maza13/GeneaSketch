import { describe, it, expect } from 'vitest';
import { GeneaDocument } from '../types/domain';
import { estimatePersonBirthYear } from '../core/inference/dateInference';

function createMockDoc(): GeneaDocument {
    return {
        persons: {},
        families: {},
        media: {},
        metadata: { sourceFormat: "GED", gedVersion: "5.5.1" }
    };
}

describe('Date Inference Engine', () => {

    it('infers birth year from biological father and mother', () => {
        const doc = createMockDoc();
        doc.persons["@I1@"] = { id: "@I1@", name: "Padre", sex: "M", lifeStatus: "deceased", events: [{ type: "BIRT", date: "1850" }], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] };
        doc.persons["@I2@"] = { id: "@I2@", name: "Madre", sex: "F", lifeStatus: "deceased", events: [{ type: "BIRT", date: "1855" }], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] };

        doc.families["@F1@"] = { id: "@F1@", husbandId: "@I1@", wifeId: "@I2@", childrenIds: ["@I3@"], events: [] };

        doc.persons["@I3@"] = { id: "@I3@", name: "Hijo Sin Fecha", sex: "M", lifeStatus: "alive", events: [], famc: ["@F1@"], fams: [], mediaRefs: [], sourceRefs: [] };

        const result = estimatePersonBirthYear("@I3@", doc);
        expect(result).not.toBeNull();
        expect(result?.isImpossible).toBe(false);

        // Padre nace en 1850 (hijo maximo asimilable 1850+80=1930)
        // Madre nace en 1855 (hijo maximo asimilable 1855+55=1910) -> Este maximo deberia ganar la interseccion
        expect(result?.maxYear).toBeLessThanOrEqual(1930);
        // Sugerencia esperada estaria rondando el promedio del rango fertil. 
        // Rango P: 1865-1930 // Rango M: 1868-1910
        // Interseccion esperada / Promedio
        expect(result?.suggestedYear).toBeGreaterThan(1860);
        expect(result?.suggestedYear).toBeLessThan(1920);
    });

    it('infers strict limits from death dates', () => {
        const doc = createMockDoc();
        doc.persons["@I1@"] = { id: "@I1@", name: "Padre", sex: "M", lifeStatus: "deceased", events: [{ type: "DEAT", date: "1900" }], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] };
        doc.families["@F1@"] = { id: "@F1@", husbandId: "@I1@", childrenIds: ["@I3@"], events: [] };
        doc.persons["@I3@"] = { id: "@I3@", name: "Hijo", sex: "M", lifeStatus: "alive", events: [], famc: ["@F1@"], fams: [], mediaRefs: [], sourceRefs: [] };

        const result = estimatePersonBirthYear("@I3@", doc);
        // Debe ser maximo 1901 (año despues de la muerte del padre)
        expect(result?.maxYear).toBeLessThanOrEqual(1901);
    });

    it('infers from siblings', () => {
        const doc = createMockDoc();
        doc.families["@F1@"] = { id: "@F1@", childrenIds: ["@I3@", "@I4@", "@I5@"], events: [] };
        doc.persons["@I4@"] = { id: "@I4@", name: "H1", sex: "M", lifeStatus: "alive", events: [{ type: "BIRT", date: "1890" }], famc: ["@F1@"], fams: [], mediaRefs: [], sourceRefs: [] };
        doc.persons["@I5@"] = { id: "@I5@", name: "H2", sex: "M", lifeStatus: "alive", events: [{ type: "BIRT", date: "1895" }], famc: ["@F1@"], fams: [], mediaRefs: [], sourceRefs: [] };

        doc.persons["@I3@"] = { id: "@I3@", name: "Hijo Sin Fecha", sex: "M", lifeStatus: "alive", events: [], famc: ["@F1@"], fams: [], mediaRefs: [], sourceRefs: [] };
        const result = estimatePersonBirthYear("@I3@", doc);
        // Hermanos 1890 y 1895. Margin de 15 años: Min: 1875, Max: 1910.
        expect(result?.suggestedYear).toBeGreaterThanOrEqual(1875);
        expect(result?.suggestedYear).toBeLessThanOrEqual(1910);
    });
});
