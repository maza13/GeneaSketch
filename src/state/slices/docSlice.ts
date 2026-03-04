import { StateCreator } from "zustand";
import { AppState, DocSlice } from "../types";
import { GeneaEngine } from "@/core/engine/GeneaEngine";
import { UiEngine } from "@/core/engine/UiEngine";
import { ensureExpanded } from "../helpers/graphHelpers";
import { documentToGSchema } from "@/core/gschema/GedcomBridge";
import { GraphMutations } from "@/core/gschema/GraphMutations";
import { projectGraphDocument } from "@/core/read-model/selectors";

function mapRelType(type: string): "parent" | "child" | "spouse" {
    if (["father", "mother", "parent"].includes(type)) return "parent";
    if (["son", "daughter", "child"].includes(type)) return "child";
    return "spouse";
}

export const createDocSlice: StateCreator<AppState, [], [], DocSlice> = (set, get) => ({
    gschemaGraph: null,
    graphRevision: 0,
    expandedGraph: { nodes: [], edges: [] },

    loadGraph: (payload) => set((state) => {
        const finalGraph = payload.graph;
        const finalDoc = projectGraphDocument(finalGraph);

        if (!finalGraph || !finalDoc) {
            return {
                gschemaGraph: null,
                graphRevision: state.graphRevision + 1,
                expandedGraph: { nodes: [], edges: [] }
            };
        }

        const firstPersonId = Object.keys(finalDoc.persons)[0] || "";
        let viewConfig = state.viewConfig;
        if (!viewConfig) {
            viewConfig = UiEngine.createDefaultViewConfig(firstPersonId);
        } else if (!viewConfig.focusPersonId) {
            viewConfig = { ...viewConfig, focusPersonId: firstPersonId, homePersonId: firstPersonId };
        }
        const selectedPersonId = state.selectedPersonId && finalDoc.persons[state.selectedPersonId]
            ? state.selectedPersonId
            : firstPersonId || null;

        return {
            gschemaGraph: finalGraph,
            graphRevision: state.graphRevision + 1,
            xrefToUid: finalDoc.xrefToUid,
            uidToXref: finalDoc.uidToXref,
            viewConfig,
            selectedPersonId,
            expandedGraph: ensureExpanded(finalDoc, viewConfig)
        };
    }),

    createNewTreeDoc: () => {
        const newDoc = GeneaEngine.createNewTree();
        const graph = documentToGSchema(newDoc, "7.0.x").graph;
        get().loadGraph({ graph, source: "mock" });
    },

    updatePersonById: (personId, patch) => set((state) => {
        if (!state.gschemaGraph) return {};
        const graphUid = state.xrefToUid?.[personId];
        if (!graphUid) return {};
        GraphMutations.updatePersonInGraph(state.gschemaGraph, graphUid, patch as any);
        const tempDoc = projectGraphDocument(state.gschemaGraph);
        if (!tempDoc) return {};
        return {
            graphRevision: state.graphRevision + 1,
            xrefToUid: tempDoc.xrefToUid,
            uidToXref: tempDoc.uidToXref,
            expandedGraph: ensureExpanded(tempDoc, state.viewConfig)
        };
    }),

    updateSelectedPerson: (patch) => {
        const { selectedPersonId, updatePersonById } = get();
        if (!selectedPersonId) return;
        updatePersonById(selectedPersonId, patch);
    },

    createStandalonePerson: (input) => set((state) => {
        if (!state.gschemaGraph) return {};
        const { node } = GraphMutations.createPersonInGraph(state.gschemaGraph, input);
        const tempDoc = projectGraphDocument(state.gschemaGraph);
        if (!tempDoc) return {};
        // We know node.uid is the created person's UID, and tempDoc.uidToXref gives us the xref ID to select
        const newXrefId = tempDoc.uidToXref?.[node.uid];
        return {
            graphRevision: state.graphRevision + 1,
            xrefToUid: tempDoc.xrefToUid,
            uidToXref: tempDoc.uidToXref,
            expandedGraph: ensureExpanded(tempDoc, state.viewConfig),
            selectedPersonId: newXrefId || node.uid
        };
    }),

    createPersonRecord: (input) => {
        const state = get();
        if (!state.gschemaGraph) return null;
        const { node } = GraphMutations.createPersonInGraph(state.gschemaGraph, input);
        const tempDoc = projectGraphDocument(state.gschemaGraph);
        if (!tempDoc) return null;
        const newXrefId = tempDoc.uidToXref?.[node.uid];
        set({
            graphRevision: state.graphRevision + 1,
            xrefToUid: tempDoc.xrefToUid,
            uidToXref: tempDoc.uidToXref,
            expandedGraph: ensureExpanded(tempDoc, state.viewConfig)
        });
        return newXrefId || node.uid;
    },

    updateFamilyById: (familyId, patch) => set((state) => {
        if (!state.gschemaGraph) return {};
        const graphUid = state.xrefToUid?.[familyId];
        if (!graphUid) return {};
        GraphMutations.updateFamilyInGraph(state.gschemaGraph, graphUid, patch);
        const tempDoc = projectGraphDocument(state.gschemaGraph);
        if (!tempDoc) return {};
        return {
            graphRevision: state.graphRevision + 1,
            xrefToUid: tempDoc.xrefToUid,
            uidToXref: tempDoc.uidToXref,
            expandedGraph: ensureExpanded(tempDoc, state.viewConfig)
        };
    }),

    linkExistingRelation: (anchorId, existingPersonId, type) => set((state) => {
        if (!state.gschemaGraph) return {};
        const anchorUid = state.xrefToUid?.[anchorId];
        const existingUid = state.xrefToUid?.[existingPersonId];
        if (!anchorUid || !existingUid) return {};
        GraphMutations.linkRelationInGraph(state.gschemaGraph, anchorUid, existingUid, mapRelType(type));
        const tempDoc = projectGraphDocument(state.gschemaGraph);
        if (!tempDoc) return {};
        return {
            graphRevision: state.graphRevision + 1,
            xrefToUid: tempDoc.xrefToUid,
            uidToXref: tempDoc.uidToXref,
            expandedGraph: ensureExpanded(tempDoc, state.viewConfig)
        };
    }),

    unlinkRelation: (personId, relatedId, type) => set((state) => {
        if (!state.gschemaGraph) return {};
        const personUid = state.xrefToUid?.[personId];
        const relatedUid = state.xrefToUid?.[relatedId];
        if (!personUid || !relatedUid) return {};
        GraphMutations.unlinkRelationInGraph(state.gschemaGraph, personUid, relatedUid, mapRelType(type));
        const tempDoc = projectGraphDocument(state.gschemaGraph);
        if (!tempDoc) return {};
        return {
            graphRevision: state.graphRevision + 1,
            xrefToUid: tempDoc.xrefToUid,
            uidToXref: tempDoc.uidToXref,
            expandedGraph: ensureExpanded(tempDoc, state.viewConfig)
        };
    }),

    addRelationFromAnchor: (anchorId, type, input, targetFamilyId) => set((state) => {
        if (!state.gschemaGraph) return {};
        const anchorUid = state.xrefToUid?.[anchorId];
        if (!anchorUid) return {};
        const targetFamUid = targetFamilyId ? state.xrefToUid?.[targetFamilyId] : undefined;
        const { node } = GraphMutations.createPersonInGraph(state.gschemaGraph, input);
        GraphMutations.linkRelationInGraph(state.gschemaGraph, anchorUid, node.uid, mapRelType(type), targetFamUid);
        const tempDoc = projectGraphDocument(state.gschemaGraph);
        if (!tempDoc) return {};
        const newXrefId = tempDoc.uidToXref?.[node.uid];
        return {
            graphRevision: state.graphRevision + 1,
            xrefToUid: tempDoc.xrefToUid,
            uidToXref: tempDoc.uidToXref,
            expandedGraph: ensureExpanded(tempDoc, state.viewConfig),
            selectedPersonId: newXrefId || node.uid
        };
    }),

    addRelationFromSelected: (type, input, targetFamilyId) => {
        const { selectedPersonId, addRelationFromAnchor } = get();
        if (!selectedPersonId) return;
        addRelationFromAnchor(selectedPersonId, type, input, targetFamilyId);
    },

    updateNoteRecord: (noteId, text) => set((state) => {
        if (!state.gschemaGraph) return {};

        const graphUid = state.xrefToUid?.[noteId] || noteId;
        const node = state.gschemaGraph.node(graphUid);
        if (node && node.type === "Note") {
            (node as any).text = text;
        } else {
            console.warn("note update failed: missing node or not a Note in graph");
        }

        const tempDoc = projectGraphDocument(state.gschemaGraph);
        if (!tempDoc) return {};
        return {
            graphRevision: state.graphRevision + 1,
            expandedGraph: ensureExpanded(tempDoc, state.viewConfig)
        };
    })
});
