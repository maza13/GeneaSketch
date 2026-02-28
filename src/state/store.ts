import { createNewTree, updatePerson, createPerson, addRelation, linkExistingRelation, unlinkParent, unlinkChild, unlinkSpouse, updateFamily, type FamilyPatch } from "@/core/edit/commands";
import { expandGraph } from "@/core/graph/expand";
import { createDefaultAiSettings } from "@/core/ai/defaults";
import { SessionService } from "@/io/sessionService";
import { create } from "zustand";
import type { MergeDraftSnapshot } from "@/types/merge-draft";
import type { AiSettings } from "@/types/ai";
import type {
    ActiveOverlay,
    ExpandedGraph,
    GeneaDocument,
    OverlayType,
    PendingRelationType,
    RecentFileEntry,
    RightPanelView,
    SessionSnapshot,
    TimelineScope,
    TimelineViewMode,
    ViewConfig,
    ViewMode,
    VisualConfig
} from "@/types/domain";

type PersonInput = {
    name: string;
    surname?: string;
    birthDate?: string;
    deathDate?: string;
    sex?: "M" | "F" | "U";
    lifeStatus?: "alive" | "deceased";
    photoDataUrl?: string | null;
};

type PersonPatch = {
    name?: string;
    surname?: string;
    birthDate?: string;
    deathDate?: string;
    isPlaceholder?: boolean;
    sex?: "M" | "F" | "U";
    lifeStatus?: "alive" | "deceased";
};

type AppState = {
    [key: string]: any;
    document: GeneaDocument | null;
    viewConfig: ViewConfig | null;
    visualConfig: VisualConfig;
    expandedGraph: ExpandedGraph;
    selectedPersonId: string | null;
    focusHistory: string[];
    focusIndex: number;
    fitNonce: number;
    restoreAvailable: boolean;
    parseErrors: string[];
    parseWarnings: string[];
    recentFiles: RecentFileEntry[];
    recentPayloads: Record<string, GeneaDocument>;
    mergeDraft: MergeDraftSnapshot | null;
    aiSettings: AiSettings;
    setDocument: (doc: GeneaDocument) => void;
    applyDiagnosticDocument: (nextDoc: GeneaDocument) => void;
    createNewTreeDoc: () => void;
    setSelectedPerson: (personId: string | null) => void;
    inspectPerson: (personId: string | null) => void;
    setFocusFamilyId: (familyId: string | null) => void;
    updatePersonById: (personId: string, patch: PersonPatch) => void;
    updateSelectedPerson: (patch: PersonPatch) => void;
    createStandalonePerson: (input: PersonInput) => void;
    createPersonRecord: (input: PersonInput) => string | null;
    updateFamilyById: (familyId: string, patch: FamilyPatch) => void;
    linkExistingRelation: (anchorId: string, existingPersonId: string, type: PendingRelationType) => void;
    unlinkRelation: (personId: string, relatedId: string, type: "parent" | "child" | "spouse") => void;
    addRelationFromAnchor: (anchorId: string, type: PendingRelationType, input: PersonInput) => void;
    addRelationFromSelected: (type: PendingRelationType, input: PersonInput) => void;
    setMode: (mode: ViewMode) => void;
    setPreset: (preset: ViewConfig["preset"]) => void;
    setDepth: (kind: keyof ViewConfig["depth"], depth: number) => void;
    setInclude: (key: "spouses", value: boolean) => void;
    setRightPanelView: (view: RightPanelView) => void;
    setTimelineScope: (scope: TimelineScope) => void;
    setTimelineView: (view: TimelineViewMode) => void;
    setTimelineScaleZoom: (zoom: number) => void;
    setTimelineScaleOffset: (offset: number) => void;
    setTimelineStatus: (livingIds: string[], deceasedIds: string[], year: number, eventPersonIds: string[]) => void;
    setNodePosition: (nodeId: string, x: number, y: number) => void;
    clearNodePositions: () => void;
    setGridEnabled: (enabled: boolean) => void;
    setGridSize: (size: number) => void;
    setDTreeOrientation: (isVertical: boolean) => void;
    setDTreeLayoutEngine: (engine: "legacy" | "vnext" | "v2") => void;
    toggleDTreeNodeCollapse: (nodeId: string) => void;
    setOverlay: (overlay: ActiveOverlay) => void;
    removeOverlay: (id: string) => void;
    clearOverlayType: (type: OverlayType) => void;
    clearAllOverlays: () => void;
    goBack: () => void;
    goForward: () => void;
    fitToScreen: () => void;
    setParseErrors: (errors: string[]) => void;
    setParseWarnings: (warnings: string[]) => void;
    addRecentFile: (entry: Omit<RecentFileEntry, "id" | "lastUsedAt">, payload: GeneaDocument) => string;
    removeRecentFile: (id: string) => void;
    clearRecentFiles: () => void;
    openRecentFile: (id: string) => { entry: RecentFileEntry; payload: GeneaDocument } | null;
    setMergeDraft: (draft: MergeDraftSnapshot | null) => void;
    clearMergeDraft: () => void;
    setAiSettings: (settings: Partial<AiSettings>) => void;
    saveAutosessionNow: () => Promise<void>;
    checkRestoreAvailability: () => Promise<void>;
    restoreSession: () => Promise<void>;
    clearSession: () => Promise<void>;
};

function defaultViewConfig(focusPersonId: string): ViewConfig {
    return {
        mode: "tree",
        preset: "all_direct_ancestors",
        focusPersonId,
        focusFamilyId: null,
        homePersonId: focusPersonId,
        rightPanelView: "details",
        timeline: { scope: "visible", view: "list", scaleZoom: 1, scaleOffset: 0 },
        depth: {
            ancestors: 5,
            descendants: 3,
            unclesGreatUncles: 0,
            siblingsNephews: 0,
            unclesCousins: 0
        },
        showSpouses: true,
        dtree: {
            isVertical: true,
            layoutEngine: "vnext",
            overlays: [],
            collapsedNodeIds: []
        }
    };
}

function ensureExpanded(document: GeneaDocument | null, viewConfig: ViewConfig | null): ExpandedGraph {
    if (!document || !viewConfig) return { nodes: [], edges: [] };
    return expandGraph(document, viewConfig);
}

function newRecentId(): string {
    return `recent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function mergeAiSettings(prev: AiSettings, patch: Partial<AiSettings>): AiSettings {
    return {
        ...prev,
        ...patch,
        providerModels: { ...prev.providerModels, ...(patch.providerModels || {}) },
        useCaseModels: { ...prev.useCaseModels, ...(patch.useCaseModels || {}) },
        modelCatalog: { ...prev.modelCatalog, ...(patch.modelCatalog || {}) },
        tokenLimits: { ...prev.tokenLimits, ...(patch.tokenLimits || {}) },
        retryPolicy: { ...prev.retryPolicy, ...(patch.retryPolicy || {}) },
        costFlags: { ...prev.costFlags, ...(patch.costFlags || {}) }
    };
}

const initialDoc = createNewTree();
const initialFocus = Object.keys(initialDoc.persons)[0] || "@I1@";

export const useAppStore = create<AppState>((set, get) => ({
    document: initialDoc,
    viewConfig: defaultViewConfig(initialFocus),
    visualConfig: {
        gridEnabled: false,
        gridSize: 20,
        nodePositions: {},
        canonicalOverrides: {}
    },
    expandedGraph: ensureExpanded(initialDoc, defaultViewConfig(initialFocus)),
    selectedPersonId: initialFocus,
    focusHistory: [initialFocus],
    focusIndex: 0,
    fitNonce: 0,
    restoreAvailable: false,
    parseErrors: [],
    parseWarnings: [],
    recentFiles: [],
    recentPayloads: {},
    mergeDraft: null,
    aiSettings: createDefaultAiSettings(),

    setDocument: (doc) => set((state) => {
        const first = Object.keys(doc.persons)[0] || null;
        const viewConfig = state.viewConfig ? { ...state.viewConfig, focusPersonId: first || state.viewConfig.focusPersonId, homePersonId: first || state.viewConfig.homePersonId } : (first ? defaultViewConfig(first) : null);
        return {
            document: doc,
            selectedPersonId: first,
            viewConfig,
            expandedGraph: ensureExpanded(doc, viewConfig),
            focusHistory: first ? [first] : [],
            focusIndex: 0
        };
    }),

    applyDiagnosticDocument: (nextDoc) => set((state) => ({
        document: nextDoc,
        expandedGraph: ensureExpanded(nextDoc, state.viewConfig)
    })),

    createNewTreeDoc: () => {
        const next = createNewTree();
        const focus = Object.keys(next.persons)[0] || "@I1@";
        const viewConfig = defaultViewConfig(focus);
        set({
            document: next,
            selectedPersonId: focus,
            viewConfig,
            expandedGraph: ensureExpanded(next, viewConfig),
            focusHistory: [focus],
            focusIndex: 0
        });
    },

    setSelectedPerson: (personId) => set({ selectedPersonId: personId }),
    inspectPerson: (personId) => set({ selectedPersonId: personId }),
    setFocusFamilyId: (familyId) => set((state) => state.viewConfig ? { viewConfig: { ...state.viewConfig, focusFamilyId: familyId }, expandedGraph: ensureExpanded(state.document, { ...state.viewConfig, focusFamilyId: familyId }) } : {}),

    updatePersonById: (personId, patch) => set((state) => {
        if (!state.document) return {};
        const next = updatePerson(state.document, personId, patch);
        return { document: next, expandedGraph: ensureExpanded(next, state.viewConfig) };
    }),

    updateSelectedPerson: (patch) => {
        const selected = get().selectedPersonId;
        if (!selected) return;
        get().updatePersonById(selected, patch);
    },

    createStandalonePerson: (input) => set((state) => {
        if (!state.document) return {};
        const created = createPerson(state.document, input);
        return { document: created.next, expandedGraph: ensureExpanded(created.next, state.viewConfig), selectedPersonId: created.personId };
    }),

    createPersonRecord: (input) => {
        const state = get();
        if (!state.document) return null;
        const created = createPerson(state.document, input);
        set({ document: created.next, expandedGraph: ensureExpanded(created.next, state.viewConfig) });
        return created.personId;
    },

    updateFamilyById: (familyId, patch) => set((state) => {
        if (!state.document) return {};
        const next = updateFamily(state.document, familyId, patch);
        return { document: next, expandedGraph: ensureExpanded(next, state.viewConfig) };
    }),

    linkExistingRelation: (anchorId, existingPersonId, type) => set((state) => {
        if (!state.document) return {};
        const next = linkExistingRelation(state.document, anchorId, existingPersonId, type);
        return { document: next, expandedGraph: ensureExpanded(next, state.viewConfig) };
    }),

    unlinkRelation: (personId, relatedId, type) => set((state) => {
        if (!state.document) return {};
        const next = type === "parent" ? unlinkParent(state.document, personId, relatedId) : type === "child" ? unlinkChild(state.document, personId, relatedId) : unlinkSpouse(state.document, personId, relatedId);
        return { document: next, expandedGraph: ensureExpanded(next, state.viewConfig) };
    }),

    addRelationFromAnchor: (anchorId, type, input) => set((state) => {
        if (!state.document) return {};
        const created = addRelation(state.document, anchorId, type, input);
        return { document: created.next, expandedGraph: ensureExpanded(created.next, state.viewConfig), selectedPersonId: created.personId };
    }),

    addRelationFromSelected: (type, input) => {
        const state = get();
        if (!state.selectedPersonId) return;
        state.addRelationFromAnchor(state.selectedPersonId, type, input);
    },

    setMode: (mode) => set((state) => state.viewConfig ? { viewConfig: { ...state.viewConfig, mode }, expandedGraph: ensureExpanded(state.document, { ...state.viewConfig, mode }) } : {}),
    setPreset: (preset) => set((state) => state.viewConfig ? { viewConfig: { ...state.viewConfig, preset }, expandedGraph: ensureExpanded(state.document, { ...state.viewConfig, preset }) } : {}),
    setDepth: (kind, depth) => set((state) => {
        if (!state.viewConfig) return {};
        const nextDepth = { ...state.viewConfig.depth, [kind]: depth };
        if (kind === "unclesGreatUncles" && depth === 0) {
            nextDepth.unclesCousins = 0;
        }
        if (kind === "unclesCousins" && depth > 0 && nextDepth.unclesGreatUncles === 0) {
            nextDepth.unclesGreatUncles = 1;
        }
        return {
            viewConfig: { ...state.viewConfig, depth: nextDepth },
            expandedGraph: ensureExpanded(state.document, { ...state.viewConfig, depth: nextDepth })
        };
    }),
    setInclude: (_key, value) => set((state) => state.viewConfig ? { viewConfig: { ...state.viewConfig, showSpouses: value }, expandedGraph: ensureExpanded(state.document, { ...state.viewConfig, showSpouses: value }) } : {}),
    setRightPanelView: (view) => set((state) => state.viewConfig ? { viewConfig: { ...state.viewConfig, rightPanelView: view } } : {}),
    setTimelineScope: (scope) => set((state) => state.viewConfig ? { viewConfig: { ...state.viewConfig, timeline: { ...state.viewConfig.timeline, scope } } } : {}),
    setTimelineView: (view) => set((state) => state.viewConfig ? { viewConfig: { ...state.viewConfig, timeline: { ...state.viewConfig.timeline, view } } } : {}),
    setTimelineScaleZoom: (zoom) => set((state) => state.viewConfig ? { viewConfig: { ...state.viewConfig, timeline: { ...state.viewConfig.timeline, scaleZoom: zoom } } } : {}),
    setTimelineScaleOffset: (offset) => set((state) => state.viewConfig ? { viewConfig: { ...state.viewConfig, timeline: { ...state.viewConfig.timeline, scaleOffset: offset } } } : {}),

    setTimelineStatus: (livingIds, deceasedIds, year, eventPersonIds) => set((state) => {
        if (!state.viewConfig) return {};
        const overlay: ActiveOverlay = {
            id: "timeline-status",
            type: "timeline",
            priority: 60,
            config: { livingIds, deceasedIds, year, eventPersonIds }
        };
        const overlays = state.viewConfig.dtree?.overlays || [];
        const existing = overlays.findIndex((o: ActiveOverlay) => o.id === overlay.id);
        const nextOverlays = existing >= 0 ? overlays.map((o: ActiveOverlay) => (o.id === overlay.id ? overlay : o)) : [...overlays, overlay];
        return { viewConfig: { ...state.viewConfig, dtree: { ...state.viewConfig.dtree, overlays: nextOverlays } } };
    }),

    setNodePosition: (nodeId, x, y) => set((state) => ({ visualConfig: { ...state.visualConfig, nodePositions: { ...(state.visualConfig.nodePositions || {}), [nodeId]: { x, y } } } })),
    clearNodePositions: () => set((state) => ({ visualConfig: { ...state.visualConfig, nodePositions: {} } })),
    setGridEnabled: (enabled) => set((state) => ({ visualConfig: { ...state.visualConfig, gridEnabled: enabled } })),
    setGridSize: (size) => set((state) => ({ visualConfig: { ...state.visualConfig, gridSize: size } })),
    setDTreeOrientation: (isVertical) => set((state) => state.viewConfig ? { viewConfig: { ...state.viewConfig, dtree: { ...state.viewConfig.dtree, isVertical } } } : {}),
    setDTreeLayoutEngine: (engine) => set((state) => state.viewConfig ? { viewConfig: { ...state.viewConfig, dtree: { ...state.viewConfig.dtree, layoutEngine: engine } } } : {}),
    toggleDTreeNodeCollapse: (nodeId) => set((state) => {
        if (!state.viewConfig) return {};
        const list = state.viewConfig.dtree?.collapsedNodeIds || [];
        const next = list.includes(nodeId) ? list.filter((id: string) => id !== nodeId) : [...list, nodeId];
        return { viewConfig: { ...state.viewConfig, dtree: { ...state.viewConfig.dtree, collapsedNodeIds: next } } };
    }),

    setOverlay: (overlay) => set((state) => {
        if (!state.viewConfig) return {};
        const overlays = state.viewConfig.dtree?.overlays || [];
        const idx = overlays.findIndex((o: ActiveOverlay) => o.id === overlay.id);
        const nextOverlays = idx >= 0 ? overlays.map((o: ActiveOverlay) => (o.id === overlay.id ? overlay : o)) : [...overlays, overlay];
        return { viewConfig: { ...state.viewConfig, dtree: { ...state.viewConfig.dtree, overlays: nextOverlays } } };
    }),

    removeOverlay: (id) => set((state) => state.viewConfig ? { viewConfig: { ...state.viewConfig, dtree: { ...state.viewConfig.dtree, overlays: (state.viewConfig.dtree?.overlays || []).filter((o: ActiveOverlay) => o.id !== id) } } } : {}),
    clearOverlayType: (type) => set((state) => state.viewConfig ? { viewConfig: { ...state.viewConfig, dtree: { ...state.viewConfig.dtree, overlays: (state.viewConfig.dtree?.overlays || []).filter((o: ActiveOverlay) => o.type !== type) } } } : {}),
    clearAllOverlays: () => set((state) => state.viewConfig ? { viewConfig: { ...state.viewConfig, dtree: { ...state.viewConfig.dtree, overlays: [] } } } : {}),

    goBack: () => { },
    goForward: () => { },
    fitToScreen: () => set((state) => ({ fitNonce: state.fitNonce + 1 })),
    setParseErrors: (errors) => set({ parseErrors: errors }),
    setParseWarnings: (warnings) => set({ parseWarnings: warnings }),

    addRecentFile: (entry, payload) => {
        const id = newRecentId();
        const newEntry: RecentFileEntry = { ...entry, id, lastUsedAt: new Date().toISOString() };
        set((state) => {
            const dedup = state.recentFiles.filter((item) => !(item.name === entry.name && item.kind === entry.kind));
            return { recentFiles: [newEntry, ...dedup].slice(0, 30), recentPayloads: { ...state.recentPayloads, [id]: payload } };
        });
        return id;
    },

    removeRecentFile: (id) => set((state) => {
        const nextPayloads = { ...state.recentPayloads };
        delete nextPayloads[id];
        return { recentFiles: state.recentFiles.filter((item) => item.id !== id), recentPayloads: nextPayloads };
    }),

    clearRecentFiles: () => set({ recentFiles: [], recentPayloads: {} }),

    openRecentFile: (id) => {
        const state = get();
        const entry = state.recentFiles.find((item) => item.id === id);
        const payload = state.recentPayloads[id];
        if (!entry || !payload) return null;
        const updated = { ...entry, lastUsedAt: new Date().toISOString() };
        set({ recentFiles: [updated, ...state.recentFiles.filter((item) => item.id !== id)] });
        return { entry: updated, payload };
    },

    setMergeDraft: (draft) => set({ mergeDraft: draft }),
    clearMergeDraft: () => set({ mergeDraft: null }),
    setAiSettings: (settings) => set((state) => ({ aiSettings: mergeAiSettings(state.aiSettings, settings) })),

    saveAutosessionNow: async () => {
        const state = get();
        const snapshot: SessionSnapshot = {
            schemaVersion: 2,
            document: state.document,
            viewConfig: state.viewConfig,
            visualConfig: state.visualConfig,
            focusHistory: state.focusHistory,
            focusIndex: state.focusIndex,
            recentFiles: state.recentFiles,
            recentPayloads: state.recentPayloads,
            mergeDraft: state.mergeDraft,
            aiSettings: state.aiSettings
        };
        await SessionService.saveAutosession(snapshot);
    },

    checkRestoreAvailability: async () => {
        const restored = await SessionService.restoreAutosession();
        set({ restoreAvailable: Boolean(restored) });
    },

    restoreSession: async () => {
        const restored = await SessionService.restoreAutosession();
        if (!restored) {
            set({ restoreAvailable: false });
            return;
        }
        const doc = restored.document;
        const viewConfig = restored.viewConfig;
        set({
            document: doc,
            viewConfig,
            visualConfig: restored.visualConfig || get().visualConfig,
            focusHistory: restored.focusHistory || [],
            focusIndex: restored.focusIndex || 0,
            recentFiles: restored.recentFiles || [],
            recentPayloads: restored.recentPayloads || {},
            mergeDraft: restored.mergeDraft || null,
            aiSettings: mergeAiSettings(createDefaultAiSettings(), restored.aiSettings || {}),
            expandedGraph: ensureExpanded(doc, viewConfig),
            restoreAvailable: false
        });
    },

    clearSession: async () => {
        await SessionService.clearAutosession();
        set({ restoreAvailable: false });
    }
}));
