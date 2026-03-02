import { StateCreator } from "zustand";
import { AppState, DocSlice } from "../types";
import { GeneaEngine } from "@/core/engine/GeneaEngine";
import { UiEngine } from "@/core/engine/UiEngine";
import { ensureExpanded } from "../helpers/graphHelpers";
import { documentToGSchema } from "@/core/gschema/GedcomBridge";
import { GSchemaGraph } from "@/core/gschema/GSchemaGraph";

export const createDocSlice: StateCreator<AppState, [], [], DocSlice> = (set, get) => ({
    document: null,
    gschemaGraph: null,
    expandedGraph: { nodes: [], edges: [] },

    setDocument: (doc) => set((state) => {
        const normalized = GeneaEngine.normalizeDocument(doc);
        if (!normalized) return { document: null, gschemaGraph: null, expandedGraph: { nodes: [], edges: [] } };

        let viewConfig = state.viewConfig;
        if (!viewConfig) {
            const firstPersonId = Object.keys(normalized.persons)[0] || "";
            viewConfig = UiEngine.createDefaultViewConfig(firstPersonId);
        } else if (!viewConfig.focusPersonId) {
            const firstPersonId = Object.keys(normalized.persons)[0] || "";
            viewConfig = { ...viewConfig, focusPersonId: firstPersonId, homePersonId: firstPersonId };
        }

        // Build the GSchema graph from the normalized document.
        // This is async-free and runs in O(n) — fine for UI thread.
        let gschemaGraph: GSchemaGraph | null = null;
        try {
            const result = documentToGSchema(
                normalized,
                (normalized.metadata?.gedVersion?.startsWith("7") ? "7.0.x" : "5.5.1") as "5.5.1" | "7.0.x"
            );
            gschemaGraph = result.graph;
        } catch (e) {
            console.error("[GSchemaGraph] Failed to build graph from document:", e);
        }

        return {
            document: normalized,
            gschemaGraph,
            viewConfig,
            expandedGraph: ensureExpanded(normalized, viewConfig)
        };
    }),

    applyDiagnosticDocument: (nextDoc) => set((state) => ({
        document: nextDoc,
        expandedGraph: ensureExpanded(nextDoc, state.viewConfig)
    })),

    createNewTreeDoc: () => {
        const newDoc = GeneaEngine.createNewTree();
        get().setDocument(newDoc);
    },

    updatePersonById: (personId, patch) => set((state) => {
        if (!state.document) return {};
        const nextDoc = GeneaEngine.updatePerson(state.document, personId, patch as any);
        return {
            document: nextDoc,
            expandedGraph: ensureExpanded(nextDoc, state.viewConfig)
        };
    }),

    updateSelectedPerson: (patch) => {
        const { document, selectedPersonId, updatePersonById } = get();
        if (!document || !selectedPersonId) return;
        updatePersonById(selectedPersonId, patch);
    },

    createStandalonePerson: (input) => set((state) => {
        if (!state.document) return {};
        const { next, personId } = GeneaEngine.createPerson(state.document, input);
        return {
            document: next,
            expandedGraph: ensureExpanded(next, state.viewConfig),
            selectedPersonId: personId
        };
    }),

    createPersonRecord: (input) => {
        const state = get();
        if (!state.document) return null;
        const { next, personId } = GeneaEngine.createPerson(state.document, input);
        set({
            document: next,
            expandedGraph: ensureExpanded(next, state.viewConfig)
        });
        return personId;
    },

    updateFamilyById: (familyId, patch) => set((state) => {
        if (!state.document) return {};
        const nextDoc = GeneaEngine.updateFamily(state.document, familyId, patch);
        return {
            document: nextDoc,
            expandedGraph: ensureExpanded(nextDoc, state.viewConfig)
        };
    }),

    linkExistingRelation: (anchorId, existingPersonId, type) => set((state) => {
        if (!state.document) return {};
        const nextDoc = GeneaEngine.linkExistingRelation(state.document, anchorId, existingPersonId, type);
        return {
            document: nextDoc,
            expandedGraph: ensureExpanded(nextDoc, state.viewConfig)
        };
    }),

    unlinkRelation: (personId, relatedId, type) => set((state) => {
        if (!state.document) return {};
        let nextDoc = state.document;
        if (type === "parent") nextDoc = GeneaEngine.unlinkParent(nextDoc, personId, relatedId);
        else if (type === "child") nextDoc = GeneaEngine.unlinkChild(nextDoc, personId, relatedId);
        else if (type === "spouse") nextDoc = GeneaEngine.unlinkSpouse(nextDoc, personId, relatedId);

        return {
            document: nextDoc,
            expandedGraph: ensureExpanded(nextDoc, state.viewConfig)
        };
    }),

    addRelationFromAnchor: (anchorId, type, input, targetFamilyId) => set((state) => {
        if (!state.document) return {};
        const { next, personId } = GeneaEngine.addRelation(state.document, anchorId, type, input, targetFamilyId);
        return {
            document: next,
            expandedGraph: ensureExpanded(next, state.viewConfig),
            selectedPersonId: personId
        };
    }),

    addRelationFromSelected: (type, input, targetFamilyId) => {
        const { selectedPersonId, addRelationFromAnchor } = get();
        if (!selectedPersonId) return;
        addRelationFromAnchor(selectedPersonId, type, input, targetFamilyId);
    }
});
