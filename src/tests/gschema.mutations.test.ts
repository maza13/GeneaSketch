import { expect, test, describe } from 'vitest';
import { GSchemaGraph } from '@/core/gschema/GSchemaGraph';
import { GraphMutations } from '@/core/gschema/GraphMutations';
import { PersonPredicates } from '@/core/gschema/predicates';

describe('GraphMutations (UI to Graph Translation)', () => {
    test('createPersonInGraph creates node and assigns claims securely', () => {
        const graph = GSchemaGraph.create();
        const { node } = GraphMutations.createPersonInGraph(graph, {
            name: "Test",
            surname: "User",
            birthDate: "1 Jan 1990",
            sex: "M"
        });

        expect(node.uid).toBeDefined();
        expect(graph.journalLength).toBeGreaterThan(0);

        const given = graph.getValue<string>(node.uid, PersonPredicates.NAME_GIVEN);
        expect(given).toBe("Test");

        const surname = graph.getValue<string>(node.uid, PersonPredicates.NAME_SURNAME);
        expect(surname).toBe("User");

        const sex = graph.getValue<string>(node.uid, PersonPredicates.SEX);
        expect(sex).toBe("M");

        const bdate = graph.getValue<{ year: number }>(node.uid, PersonPredicates.EVENT_BIRTH_DATE);
        expect(bdate?.year).toBe(1990);
    });

    test('updatePersonInGraph correctly retracts and adds claims', () => {
        const graph = GSchemaGraph.create();
        const { node } = GraphMutations.createPersonInGraph(graph, {
            name: "Initial",
            birthDate: "1 Jan 1900"
        });

        // Update
        GraphMutations.updatePersonInGraph(graph, node.uid, {
            name: "Updated Name", // Replace
            birthDate: "",        // Clear (retract)
            deathDate: "2000"     // Add new
        });

        expect(graph.getValue(node.uid, PersonPredicates.NAME_GIVEN)).toBe("Updated Name");
        expect(graph.getValue(node.uid, PersonPredicates.EVENT_BIRTH_DATE)).toBeNull();
        const ddate = graph.getValue<{ year: number }>(node.uid, PersonPredicates.EVENT_DEATH_DATE);
        expect(ddate?.year).toBe(2000);
    });

    test('linkRelationInGraph establishes correct edges and unions', () => {
        const graph = GSchemaGraph.create();
        const { node: p1 } = GraphMutations.createPersonInGraph(graph, { name: "P1" });
        const { node: p2 } = GraphMutations.createPersonInGraph(graph, { name: "P2" });

        // Link as spouse
        GraphMutations.linkRelationInGraph(graph, p1.uid, p2.uid, "spouse");
        const unions = graph.allNodes().filter(n => n.type === "Union");
        expect(unions.length).toBe(1);

        const edges = graph.allEdges().filter(e => e.type === "Member");
        expect(edges.length).toBe(2);

        // Link as parent/child
        const { node: child } = GraphMutations.createPersonInGraph(graph, { name: "Child" });
        GraphMutations.linkRelationInGraph(graph, child.uid, p1.uid, "parent");

        const pcEdges = graph.allEdges().filter(e => e.type === "ParentChild");
        expect(pcEdges.length).toBe(1);
        expect(pcEdges[0].fromUid).toBe(p1.uid); // parent
        expect(pcEdges[0].toUid).toBe(child.uid); // child
    });
});
