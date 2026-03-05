import { StateCreator } from "zustand";
import { AppState, ViewSlice } from "../types";
import { ensureExpanded } from "../helpers/graphHelpers";
import { withFocusHistory } from "../helpers/sessionHelpers";
import { projectGraphDocument, setReadModelMode as setGlobalReadModelMode } from "@/core/read-model/selectors";
import { UiEngine } from "@/core/engine/UiEngine";
import { createDefaultDtreeConfig } from "@/core/dtree/dtreeConfig";
import type { ActiveOverlay } from "@/types/domain";

const defaultDtree = () => createDefaultDtreeConfig();
const defaultRightStack = () => ({ detailsMode: "expanded" as const, timelineMode: "compact" as const, detailsAutoCompactedByTimeline: false });

export const createViewSlice: StateCreator<AppState, [], [], ViewSlice> = (set) => ({
    readModelMode: "direct",
    viewConfig: null,
    visualConfig: UiEngine.createDefaultVisualConfig(),
    selectedPersonId: null,
    fitNonce: 0,

    setReadModelMode: (mode) => set((state) => {
        if (state.readModelMode === mode) return {};
        setGlobalReadModelMode(mode);
        const projected = projectGraphDocument(state.gschemaGraph);
        return {
            readModelMode: mode,
            expandedGraph: state.viewConfig && projected
                ? ensureExpanded(projected, state.viewConfig)
                : state.expandedGraph
        };
    }),

    setSelectedPerson: (personId) => set((state) => {
        return { selectedPersonId: personId, ...withFocusHistory(state, personId) };
    }),

    setFocusFamilyId: (familyId) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = { ...state.viewConfig, focusFamilyId: familyId };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(projectGraphDocument(state.gschemaGraph), viewConfig)
        } as Partial<AppState>;
    }),

    setMode: (mode) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = { ...state.viewConfig, mode };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(projectGraphDocument(state.gschemaGraph), viewConfig)
        } as Partial<AppState>;
    }),

    setPreset: (preset) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = { ...state.viewConfig, preset };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(projectGraphDocument(state.gschemaGraph), viewConfig)
        } as Partial<AppState>;
    }),

    setDepth: (kind, depth) => set((state) => {
        if (!state.viewConfig) return {};
        const nextDepth = { ...state.viewConfig.depth, [kind]: depth };
        if (kind === "unclesCousins" && depth > 0 && nextDepth.unclesGreatUncles < 1) {
            nextDepth.unclesGreatUncles = 1;
        }
        if (kind === "unclesGreatUncles" && depth === 0 && nextDepth.unclesCousins > 0) {
            nextDepth.unclesCousins = 0;
        }
        const viewConfig = {
            ...state.viewConfig,
            depth: nextDepth
        };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(projectGraphDocument(state.gschemaGraph), viewConfig)
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
            expandedGraph: ensureExpanded(projectGraphDocument(state.gschemaGraph), viewConfig)
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
        const current = state.viewConfig;
        const currentStack = { ...defaultRightStack(), ...(current.rightStack || {}) };
        const overlays = current.dtree?.overlays || [];
        const nextOverlays = open ? overlays : overlays.filter((overlay) => overlay.type !== "timeline");
        const stack = open
            ? {
                ...currentStack,
                timelineMode: "expanded" as const,
                detailsMode: "compact" as const,
                detailsAutoCompactedByTimeline: true
            }
            : {
                ...currentStack,
                timelineMode: "compact" as const,
                detailsMode: currentStack.detailsAutoCompactedByTimeline ? "expanded" as const : currentStack.detailsMode,
                detailsAutoCompactedByTimeline: false
            };

        if (
            current.timelinePanelOpen === open &&
            currentStack.detailsMode === stack.detailsMode &&
            currentStack.timelineMode === stack.timelineMode &&
            currentStack.detailsAutoCompactedByTimeline === stack.detailsAutoCompactedByTimeline &&
            nextOverlays === overlays
        ) {
            return {};
        }

        return {
            viewConfig: {
                ...current,
                timelinePanelOpen: open,
                rightStack: stack,
                dtree: { ...(current.dtree || defaultDtree()), overlays: nextOverlays }
            }
        };
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
        const current = state.viewConfig;
        const overlays = current.dtree?.overlays || [];
        const timelineOverlay: ActiveOverlay = {
            id: "timeline-simulation",
            type: "timeline",
            priority: 100,
            config: { year, livingIds, deceasedIds, eventPersonIds }
        };
        const idx = overlays.findIndex((overlay) => overlay.type === "timeline");
        let nextOverlays = overlays;
        if (idx >= 0) {
            const existing = overlays[idx];
            const same = JSON.stringify(existing.config) === JSON.stringify(timelineOverlay.config);
            if (!same || existing.id !== timelineOverlay.id || existing.priority !== timelineOverlay.priority) {
                nextOverlays = [...overlays];
                nextOverlays[idx] = timelineOverlay;
            }
        } else {
            nextOverlays = [...overlays, timelineOverlay];
        }
        return {
            viewConfig: {
                ...current,
                dtree: { ...(current.dtree || defaultDtree()), overlays: nextOverlays }
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
            dtree: { ...(state.viewConfig.dtree || defaultDtree()), isVertical }
        };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(projectGraphDocument(state.gschemaGraph), viewConfig)
        } as Partial<AppState>;
    }),

    setDTreeLayoutEngine: (engine) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = {
            ...state.viewConfig,
            dtree: { ...(state.viewConfig.dtree || defaultDtree()), layoutEngine: engine }
        };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(projectGraphDocument(state.gschemaGraph), viewConfig)
        } as Partial<AppState>;
    }),

    toggleDTreeNodeCollapse: (nodeId) => set((state) => {
        if (!state.viewConfig) return {};
        const collapsed = new Set(state.viewConfig.dtree?.collapsedNodeIds || []);
        if (collapsed.has(nodeId)) collapsed.delete(nodeId);
        else collapsed.add(nodeId);
        const viewConfig = {
            ...state.viewConfig,
            dtree: { ...(state.viewConfig.dtree || defaultDtree()), collapsedNodeIds: Array.from(collapsed) }
        };
        return {
            viewConfig,
            expandedGraph: ensureExpanded(projectGraphDocument(state.gschemaGraph), viewConfig)
        } as Partial<AppState>;
    }),

    setOverlay: (overlay) => set((state) => {
        if (!state.viewConfig) return {};
        const current = state.viewConfig.dtree?.overlays || [];
        const next = [...current];
        const idx = next.findIndex(o => o.id === overlay.id);
        if (idx >= 0) {
            if (JSON.stringify(next[idx]) === JSON.stringify(overlay)) return {};
            next[idx] = overlay;
        }
        else next.push(overlay);
        return {
            viewConfig: {
                ...state.viewConfig,
                dtree: { ...(state.viewConfig.dtree || defaultDtree()), overlays: next }
            }
        };
    }),

    removeOverlay: (id) => set((state) => {
        if (!state.viewConfig) return {};
        const current = state.viewConfig.dtree?.overlays || [];
        const next = current.filter(o => o.id !== id);
        if (next.length === current.length) return {};
        return {
            viewConfig: {
                ...state.viewConfig,
                dtree: { ...(state.viewConfig.dtree || defaultDtree()), overlays: next }
            }
        };
    }),

    clearOverlayType: (type) => set((state) => {
        if (!state.viewConfig) return {};
        const current = state.viewConfig.dtree?.overlays || [];
        const next = current.filter(o => o.type !== type);
        if (next.length === current.length) return {};
        return {
            viewConfig: {
                ...state.viewConfig,
                dtree: { ...(state.viewConfig.dtree || defaultDtree()), overlays: next }
            }
        };
    }),

    clearAllOverlays: () => set((state) => {
        if (!state.viewConfig) return {};
        if ((state.viewConfig.dtree?.overlays || []).length === 0) return {};
        return {
            viewConfig: {
                ...state.viewConfig,
                dtree: { ...(state.viewConfig.dtree || defaultDtree()), overlays: [] }
            }
        };
    }),

    clearVisualModes: () => set((state) => {
        if (!state.viewConfig) return {};
        const current = state.viewConfig;
        const currentStack = { ...defaultRightStack(), ...(current.rightStack || {}) };
        const nextStack = {
            ...currentStack,
            timelineMode: "compact" as const,
            detailsMode: currentStack.detailsAutoCompactedByTimeline ? "expanded" as const : currentStack.detailsMode,
            detailsAutoCompactedByTimeline: false
        };
        const needsOverlayClear = (current.dtree?.overlays || []).length > 0;
        const needsTimelineClose = !!current.timelinePanelOpen;
        const needsFamilyReset = current.focusFamilyId !== null;
        const needsStackChange =
            currentStack.timelineMode !== nextStack.timelineMode ||
            currentStack.detailsMode !== nextStack.detailsMode ||
            !!currentStack.detailsAutoCompactedByTimeline !== !!nextStack.detailsAutoCompactedByTimeline;
        if (!needsOverlayClear && !needsTimelineClose && !needsFamilyReset && !needsStackChange) return {};
        return {
            viewConfig: {
                ...current,
                timelinePanelOpen: false,
                focusFamilyId: null,
                rightStack: nextStack,
                dtree: { ...(current.dtree || defaultDtree()), overlays: [] }
            }
        };
    }),

    fitToScreen: () => set((state) => ({ fitNonce: state.fitNonce + 1 }))
});

