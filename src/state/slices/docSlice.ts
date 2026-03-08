import { StateCreator } from "zustand";
import { AppState, DocSlice } from "../types";
import { createNewTree } from "@/core/edit/commands";
import { documentToGenraph } from "@/core/genraph/GedcomBridge";
import { GraphMutations } from "@/core/genraph/GraphMutations";
import { buildLoadedGraphStateForSource, runGraphMutation } from "../helpers/graphStateTransitions";

function mapRelType(type: string): "parent" | "child" | "spouse" {
    if (["father", "mother", "parent"].includes(type)) return "parent";
    if (["son", "daughter", "child"].includes(type)) return "child";
    return "spouse";
}

export const createDocSlice: StateCreator<AppState, [], [], DocSlice> = (set, get) => ({
    genraphGraph: null,
    graphRevision: 0,
    expandedGraph: { nodes: [], edges: [] },

    loadGraph: (payload) => set((state) => buildLoadedGraphStateForSource(state, payload.graph, payload.source)),
    applyProjectedDocument: (document, source) => {
        const gedVersion = document.metadata?.gedVersion?.startsWith("7") ? "7.0.x" : "5.5.1";
        const graph = documentToGenraph(document, gedVersion).graph;
        get().loadGraph({ graph, source });
    },

    createNewTreeDoc: () => {
        const newDoc = createNewTree();
        get().applyProjectedDocument(newDoc, "mock");
    },

    updatePersonById: (personId, patch) => set((state) => runGraphMutation(state, (graph) => {
        const graphUid = state.xrefToUid?.[personId];
        if (!graphUid) return null;
        GraphMutations.updatePersonInGraph(graph, graphUid, patch as any);
        return {};
    })),

    updateSelectedPerson: (patch) => {
        const { selectedPersonId, updatePersonById } = get();
        if (!selectedPersonId) return;
        updatePersonById(selectedPersonId, patch);
    },

    createStandalonePerson: (input) => set((state) => runGraphMutation(state, (graph) => {
        const { node } = GraphMutations.createPersonInGraph(graph, input);
        return { selectedPersonUid: node.uid };
    })),

    createPersonRecord: (input) => {
        let createdPersonId: string | null = null;
        set((current) => runGraphMutation(current, (graph) => {
            const { node } = GraphMutations.createPersonInGraph(graph, input);
            createdPersonId = node.uid;
            return {};
        }));
        if (!createdPersonId) return null;
        return get().uidToXref?.[createdPersonId] ?? createdPersonId;
    },

    updateFamilyById: (familyId, patch) => set((state) => runGraphMutation(state, (graph) => {
        const graphUid = state.xrefToUid?.[familyId];
        if (!graphUid) return null;
        GraphMutations.updateFamilyInGraph(graph, graphUid, patch);
        return {};
    })),

    linkExistingRelation: (anchorId, existingPersonId, type) => set((state) => runGraphMutation(state, (graph) => {
        const anchorUid = state.xrefToUid?.[anchorId];
        const existingUid = state.xrefToUid?.[existingPersonId];
        if (!anchorUid || !existingUid) return null;
        GraphMutations.linkRelationInGraph(graph, anchorUid, existingUid, mapRelType(type));
        return {};
    })),

    unlinkRelation: (personId, relatedId, type) => set((state) => runGraphMutation(state, (graph) => {
        const personUid = state.xrefToUid?.[personId];
        const relatedUid = state.xrefToUid?.[relatedId];
        if (!personUid || !relatedUid) return null;
        GraphMutations.unlinkRelationInGraph(graph, personUid, relatedUid, mapRelType(type));
        return {};
    })),

    addRelationFromAnchor: (anchorId, type, input, targetFamilyId) => set((state) => runGraphMutation(state, (graph) => {
        const anchorUid = state.xrefToUid?.[anchorId];
        if (!anchorUid) return null;
        const targetFamUid = targetFamilyId ? state.xrefToUid?.[targetFamilyId] : undefined;
        const { node } = GraphMutations.createPersonInGraph(graph, input);
        GraphMutations.linkRelationInGraph(graph, anchorUid, node.uid, mapRelType(type), targetFamUid);
        return { selectedPersonUid: node.uid };
    })),

    addRelationFromSelected: (type, input, targetFamilyId) => {
        const { selectedPersonId, addRelationFromAnchor } = get();
        if (!selectedPersonId) return;
        addRelationFromAnchor(selectedPersonId, type, input, targetFamilyId);
    },

    updateNoteRecord: (noteId, text) => set((state) => runGraphMutation(state, (graph) => {
        const graphUid = state.xrefToUid?.[noteId] || noteId;
        const ok = GraphMutations.updateNoteInGraph(graph, graphUid, text);
        if (!ok) {
            console.warn("note update failed: missing node or not a Note in graph");
            return null;
        }
        return {};
    }))
});
