import { StateCreator } from "zustand";
import { AppState, ViewSlice } from "../types";
import { ensureExpanded } from "../helpers/graphHelpers";
import { withFocusHistory } from "../helpers/sessionHelpers";
import { UiEngine } from "@/core/engine/UiEngine";

export const createViewSlice: StateCreator<AppState, [], [], ViewSlice> = (set) => ({
    viewConfig: null,
    visualConfig: UiEngine.createDefaultVisualConfig(),
    selectedPersonId: null,
    fitNonce: 0,

    setSelectedPerson: (personId) => set((state) => {
        return { selectedPersonId: personId, ...withFocusHistory(state, personId) };
    }),

    setFocusFamilyId: (familyId) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = { ...state.viewConfig, focusFamilyId: familyId };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(state.document, viewConfig)
        } as Partial<AppState>;
    }),

    setMode: (mode) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = { ...state.viewConfig, mode };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(state.document, viewConfig)
        } as Partial<AppState>;
    }),

    setPreset: (preset) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = { ...state.viewConfig, preset };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(state.document, viewConfig)
        } as Partial<AppState>;
    }),

    setDepth: (kind, depth) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = {
            ...state.viewConfig,
            depth: { ...state.viewConfig.depth, [kind]: depth }
        };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(state.document, viewConfig)
        } as Partial<AppState>;
    }),

    setInclude: (key, value) => set((state) => {
        if (!state.viewConfig || key !== "spouses") return {};
        const viewConfig = {
            ...state.viewConfig,
            showSpouses: value
        };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(state.document, viewConfig)
        } as Partial<AppState>;
    }),

    setRightPanelView: (view) => set((state) => {
        if (!state.viewConfig) return {};
        return { viewConfig: { ...state.viewConfig, rightPanelView: view } };
    }),

    setShellPanelCollapsed: (side, collapsed) => set((state) => {
        if (!state.viewConfig) return {};
        const prop = side === "left" ? "leftCollapsed" : "rightCollapsed";
        return {
            viewConfig: {
                ...state.viewConfig,
                shellPanels: { ...state.viewConfig.shellPanels!, [prop]: collapsed }
            }
        };
    }),

    toggleShellPanel: (side) => set((state) => {
        if (!state.viewConfig) return {};
        const prop = side === "left" ? "leftCollapsed" : "rightCollapsed";
        const current = state.viewConfig.shellPanels?.[prop] ?? false;
        return {
            viewConfig: {
                ...state.viewConfig,
                shellPanels: { ...state.viewConfig.shellPanels!, [prop]: !current }
            }
        };
    }),

    setLeftSectionState: (patch) => set((state) => {
        if (!state.viewConfig) return {};
        return {
            viewConfig: {
                ...state.viewConfig,
                leftSections: { ...(state.viewConfig.leftSections || { layersOpen: true, treeConfigOpen: false, canvasToolsOpen: false }), ...patch }
            }
        };
    }),

    toggleLeftSection: (section) => set((state) => {
        if (!state.viewConfig) return {};
        const prop = section === "layers" ? "layersOpen" : section === "treeConfig" ? "treeConfigOpen" : "canvasToolsOpen";
        const current = !!state.viewConfig.leftSections?.[prop];
        return {
            viewConfig: {
                ...state.viewConfig,
                leftSections: { ...(state.viewConfig.leftSections || { layersOpen: true, treeConfigOpen: false, canvasToolsOpen: false }), [prop]: !current }
            }
        };
    }),

    setTimelinePanelOpen: (open) => set((state) => {
        if (!state.viewConfig) return {};
        return { viewConfig: { ...state.viewConfig, timelinePanelOpen: open } };
    }),

    setRightStackState: (patch) => set((state) => {
        if (!state.viewConfig) return {};
        return {
            viewConfig: {
                ...state.viewConfig,
                rightStack: { ...(state.viewConfig.rightStack || { detailsMode: "expanded", timelineMode: "compact" }), ...patch }
            }
        };
    }),

    toggleRightStackSection: (section) => set((state) => {
        if (!state.viewConfig) return {};
        const current = state.viewConfig.rightStack?.[section === "details" ? "detailsMode" : "timelineMode"] === "expanded";
        const mode = current ? "compact" : "expanded";
        return {
            viewConfig: {
                ...state.viewConfig,
                rightStack: {
                    ...(state.viewConfig.rightStack || { detailsMode: "expanded", timelineMode: "compact" }),
                    [section === "details" ? "detailsMode" : "timelineMode"]: mode
                }
            }
        };
    }),

    setTimelineScope: (scope) => set((state) => {
        if (!state.viewConfig) return {};
        return { viewConfig: { ...state.viewConfig, timeline: { ...state.viewConfig.timeline, scope } } };
    }),

    setTimelineView: (view) => set((state) => {
        if (!state.viewConfig) return {};
        return { viewConfig: { ...state.viewConfig, timeline: { ...state.viewConfig.timeline, view } } };
    }),

    setTimelineScaleZoom: (zoom) => set((state) => {
        if (!state.viewConfig) return {};
        return { viewConfig: { ...state.viewConfig, timeline: { ...state.viewConfig.timeline, scaleZoom: zoom } } };
    }),

    setTimelineScaleOffset: (offset) => set((state) => {
        if (!state.viewConfig) return {};
        return { viewConfig: { ...state.viewConfig, timeline: { ...state.viewConfig.timeline, scaleOffset: offset } } };
    }),

    setTimelineStatus: (livingIds, deceasedIds, year, eventPersonIds) => set((state) => {
        if (!state.viewConfig) return {};
        return {
            viewConfig: {
                ...state.viewConfig,
                timelineStatus: { livingIds, deceasedIds, year, eventPersonIds }
            }
        };
    }),

    setNodePosition: (nodeId, x, y) => set((state) => ({
        visualConfig: {
            ...state.visualConfig,
            nodePositions: { ...state.visualConfig.nodePositions, [nodeId]: { x, y } }
        }
    })),

    clearNodePositions: () => set((state) => ({
        visualConfig: { ...state.visualConfig, nodePositions: {} }
    })),

    setGridEnabled: (enabled) => set((state) => ({
        visualConfig: { ...state.visualConfig, gridEnabled: enabled }
    })),

    setGridSize: (size) => set((state) => ({
        visualConfig: { ...state.visualConfig, gridSize: size }
    })),

    setDTreeOrientation: (isVertical) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = {
            ...state.viewConfig,
            dtree: { ...(state.viewConfig.dtree || { isVertical: true, collapsedNodeIds: [], overlays: [] }), isVertical }
        };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(state.document, viewConfig)
        } as Partial<AppState>;
    }),

    setDTreeLayoutEngine: (engine) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = {
            ...state.viewConfig,
            dtree: { ...(state.viewConfig.dtree || { isVertical: true, collapsedNodeIds: [], overlays: [] }), layoutEngine: engine as any }
        };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(state.document, viewConfig)
        } as Partial<AppState>;
    }),

    toggleDTreeNodeCollapse: (nodeId) => set((state) => {
        if (!state.viewConfig) return {};
        const collapsed = new Set(state.viewConfig.dtree?.collapsedNodeIds || []);
        if (collapsed.has(nodeId)) collapsed.delete(nodeId);
        else collapsed.add(nodeId);
        const viewConfig = {
            ...state.viewConfig,
            dtree: { ...(state.viewConfig.dtree || { isVertical: true, collapsedNodeIds: [], overlays: [] }), collapsedNodeIds: Array.from(collapsed) }
        };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(state.document, viewConfig)
        } as Partial<AppState>;
    }),

    setOverlay: (overlay) => set((state) => {
        if (!state.viewConfig) return {};
        const next = [...(state.viewConfig.dtree?.overlays || [])];
        const idx = next.findIndex(o => o.id === overlay.id);
        if (idx >= 0) next[idx] = overlay;
        else next.push(overlay);
        return {
            viewConfig: {
                ...state.viewConfig,
                dtree: { ...(state.viewConfig.dtree || { isVertical: true, collapsedNodeIds: [], overlays: [] }), overlays: next }
            }
        };
    }),

    removeOverlay: (id) => set((state) => {
        if (!state.viewConfig) return {};
        const next = (state.viewConfig.dtree?.overlays || []).filter(o => o.id !== id);
        return {
            viewConfig: {
                ...state.viewConfig,
                dtree: { ...(state.viewConfig.dtree || { isVertical: true, collapsedNodeIds: [], overlays: [] }), overlays: next }
            }
        };
    }),

    clearOverlayType: (type) => set((state) => {
        if (!state.viewConfig) return {};
        const next = (state.viewConfig.dtree?.overlays || []).filter(o => o.type !== type);
        return {
            viewConfig: {
                ...state.viewConfig,
                dtree: { ...(state.viewConfig.dtree || { isVertical: true, collapsedNodeIds: [], overlays: [] }), overlays: next }
            }
        };
    }),

    clearAllOverlays: () => set((state) => {
        if (!state.viewConfig) return {};
        return {
            viewConfig: {
                ...state.viewConfig,
                dtree: { ...(state.viewConfig.dtree || { isVertical: true, collapsedNodeIds: [], overlays: [] }), overlays: [] }
            }
        };
    }),

    clearVisualModes: () => set((state) => {
        if (!state.viewConfig) return {};
        return {
            viewConfig: {
                ...state.viewConfig,
                dtree: { ...(state.viewConfig.dtree || { isVertical: true, collapsedNodeIds: [], overlays: [] }), overlays: [] }
            }
        };
    }),

    fitToScreen: () => set((state) => ({ fitNonce: state.fitNonce + 1 }))
});
