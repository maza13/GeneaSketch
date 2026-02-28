import { GgId, GgPerson, GgFamily, GeneGraph, GgXref } from "./types";

export class GeneGraphManager {
    private graph: GeneGraph;

    constructor(initialGraph?: Partial<GeneGraph>) {
        this.graph = {
            persons: initialGraph?.persons || {},
            families: initialGraph?.families || {},
            indices: {
                byXref: initialGraph?.indices?.byXref || new Map(),
                byName: initialGraph?.indices?.byName || new Map(),
            },
        };

        if (Object.keys(this.graph.persons).length > 0 && this.graph.indices.byXref.size === 0) {
            this.rebuildIndices();
        }
    }

    getGraph(): GeneGraph {
        return this.graph;
    }

    getPerson(id: GgId): GgPerson | undefined {
        return this.graph.persons[id];
    }

    getFamily(id: GgId): GgFamily | undefined {
        return this.graph.families[id];
    }

    getPersonByXref(xref: GgXref): GgPerson | undefined {
        const id = this.graph.indices.byXref.get(xref);
        return id ? this.getPerson(id) : undefined;
    }

    getFamiliesByPartner(personId: GgId): GgFamily[] {
        const person = this.getPerson(personId);
        if (!person) return [];
        return person.familyIds
            .map(id => this.getFamily(id))
            .filter((f): f is GgFamily => !!f);
    }

    getParentsFamily(personId: GgId): GgFamily | undefined {
        const person = this.getPerson(personId);
        if (!person || !person.parentsFamilyId) return undefined;
        return this.getFamily(person.parentsFamilyId);
    }

    private rebuildIndices() {
        this.graph.indices.byXref.clear();
        this.graph.indices.byName.clear();

        for (const person of Object.values(this.graph.persons)) {
            if (person.xref) {
                this.graph.indices.byXref.set(person.xref, person.id);
            }

            const fullName = `${person.name} ${person.surname || ""}`.trim().toLowerCase();
            const existing = this.graph.indices.byName.get(fullName) || [];
            existing.push(person.id);
            this.graph.indices.byName.set(fullName, existing);
        }
    }

    // Basic mutations (to be expanded in engine.ts)
    addPerson(person: GgPerson) {
        this.graph.persons[person.id] = person;
        if (person.xref) this.graph.indices.byXref.set(person.xref, person.id);

        const fullName = `${person.name} ${person.surname || ""}`.trim().toLowerCase();
        const existing = this.graph.indices.byName.get(fullName) || [];
        existing.push(person.id);
        this.graph.indices.byName.set(fullName, existing);
    }

    addFamily(family: GgFamily) {
        this.graph.families[family.id] = family;
        if (family.xref) this.graph.indices.byXref.set(family.xref, family.id);
    }
}
