import { StateCreator } from "zustand";
import { AppState, ViewSlice } from "../types";
import { withFocusHistory } from "../helpers/sessionHelpers";
import { withExpandedGraphForView } from "../helpers/viewStateTransitions";
import { createDefaultKindraConfig } from "@/core/kindra/kindraConfig";
import type { ActiveOverlay } from "@/types/domain";
import { createDefaultVisualConfig } from "@/state/workspaceDefaults";

const defaultKindra = () => createDefaultKindraConfig();
const defaultRightStack = () => ({ detailsMode: "expanded" as const });
const withNormalizedKindra = (kindra: Partial<ReturnType<typeof createDefaultKindraConfig>>) => {
    const normalized = { ...defaultKindra(), ...kindra };
    return { kindra: normalized };
};

export const createViewSlice: StateCreator<AppState, [], [], ViewSlice> = (set) => ({
    viewConfig: null,
    visualConfig: createDefaultVisualConfig(),
    selectedPersonId: null,
    fitNonce: 0,

    setSelectedPerson: (personId) => set((state) => {
        return { selectedPersonId: personId, ...withFocusHistory(state, personId) };
    }),

    setFocusFamilyId: (familyId) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = { ...state.viewConfig, focusFamilyId: familyId };
        return withExpandedGraphForView(state, viewConfig);
    }),

    setMode: (mode) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = { ...state.viewConfig, mode };
        return withExpandedGraphForView(state, viewConfig);
    }),

    setPreset: (preset) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = { ...state.viewConfig, preset };
        return withExpandedGraphForView(state, viewConfig);
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
        return withExpandedGraphForView(state, viewConfig);
    }),

    setInclude: (key, value) => set((state) => {
        if (!state.viewConfig || key !== "spouses") return {};
        const viewConfig = {
            ...state.viewConfig,
            showSpouses: value
        };
        return withExpandedGraphForView(state, viewConfig);
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
        const prop = section === "layers"
            ? "layersOpen"
            : section === "treeConfig"
                ? "treeConfigOpen"
                : section === "canvasTools"
                    ? "canvasToolsOpen"
                    : "timelineExpanded";
        const current = !!state.viewConfig.leftSections?.[prop];
        return {
            viewConfig: {
                ...state.viewConfig,
                leftSections: { ...(state.viewConfig.leftSections || { layersOpen: true, treeConfigOpen: false, canvasToolsOpen: false, timelineExpanded: true }), [prop]: !current }
            }
        };
    }),

    setTimelinePanelOpen: (open) => set((state) => {
        if (!state.viewConfig) return {};
        const current = state.viewConfig;
        const overlays = current.kindra?.overlays || [];
        const nextOverlays = open ? overlays : overlays.filter((overlay) => overlay.type !== "timeline");
        const nextLeftSections = {
            ...(current.leftSections || { layersOpen: true, treeConfigOpen: false, canvasToolsOpen: false, timelineExpanded: true }),
            timelineExpanded: open ? (current.leftSections?.timelineExpanded ?? true) : (current.leftSections?.timelineExpanded ?? true),
        };

        if (
            current.timelinePanelOpen === open &&
            current.leftSections?.timelineExpanded === nextLeftSections.timelineExpanded &&
            nextOverlays === overlays
        ) {
            return {};
        }

        return {
            viewConfig: {
                ...current,
                timelinePanelOpen: open,
                leftSections: nextLeftSections,
                ...withNormalizedKindra({ ...(current.kindra || defaultKindra()), overlays: nextOverlays })
            }
        };
    }),

    setRightStackState: (patch) => set((state) => {
        if (!state.viewConfig) return {};
        return {
            viewConfig: {
                ...state.viewConfig,
                rightStack: { ...(state.viewConfig.rightStack || { detailsMode: "expanded" }), ...patch }
            }
        };
    }),

    toggleRightStackSection: () => set((state) => {
        if (!state.viewConfig) return {};
        const current = state.viewConfig.rightStack?.detailsMode === "expanded";
        const mode = current ? "compact" : "expanded";
        return {
            viewConfig: {
                ...state.viewConfig,
                rightStack: {
                    ...(state.viewConfig.rightStack || { detailsMode: "expanded" }),
                    detailsMode: mode
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
        const overlays = current.kindra?.overlays || [];
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
                ...withNormalizedKindra({ ...(current.kindra || defaultKindra()), overlays: nextOverlays })
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

    setKindraOrientation: (isVertical) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = {
            ...state.viewConfig,
            ...withNormalizedKindra({ ...(state.viewConfig.kindra || defaultKindra()), isVertical })
        };
        return withExpandedGraphForView(state, viewConfig);
    }),

    setKindraLayoutEngine: (engine) => set((state) => {
        if (!state.viewConfig) return {};
        const viewConfig = {
            ...state.viewConfig,
            ...withNormalizedKindra({ ...(state.viewConfig.kindra || defaultKindra()), layoutEngine: engine })
        };
        return withExpandedGraphForView(state, viewConfig);
    }),

    toggleKindraNodeCollapse: (nodeId) => set((state) => {
        if (!state.viewConfig) return {};
        const collapsed = new Set(state.viewConfig.kindra?.collapsedNodeIds || []);
        if (collapsed.has(nodeId)) collapsed.delete(nodeId);
        else collapsed.add(nodeId);
        const viewConfig = {
            ...state.viewConfig,
            ...withNormalizedKindra({ ...(state.viewConfig.kindra || defaultKindra()), collapsedNodeIds: Array.from(collapsed) })
        };
        return withExpandedGraphForView(state, viewConfig);
    }),

    setOverlay: (overlay) => set((state) => {
        if (!state.viewConfig) return {};
        const current = state.viewConfig.kindra?.overlays || [];
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
                ...withNormalizedKindra({ ...(state.viewConfig.kindra || defaultKindra()), overlays: next })
            }
        };
    }),

    removeOverlay: (id) => set((state) => {
        if (!state.viewConfig) return {};
        const current = state.viewConfig.kindra?.overlays || [];
        const next = current.filter(o => o.id !== id);
        if (next.length === current.length) return {};
        return {
            viewConfig: {
                ...state.viewConfig,
                ...withNormalizedKindra({ ...(state.viewConfig.kindra || defaultKindra()), overlays: next })
            }
        };
    }),

    clearOverlayType: (type) => set((state) => {
        if (!state.viewConfig) return {};
        const current = state.viewConfig.kindra?.overlays || [];
        const next = current.filter(o => o.type !== type);
        if (next.length === current.length) return {};
        return {
            viewConfig: {
                ...state.viewConfig,
                ...withNormalizedKindra({ ...(state.viewConfig.kindra || defaultKindra()), overlays: next })
            }
        };
    }),

    clearAllOverlays: () => set((state) => {
        if (!state.viewConfig) return {};
        if ((state.viewConfig.kindra?.overlays || []).length === 0) return {};
        return {
            viewConfig: {
                ...state.viewConfig,
                ...withNormalizedKindra({ ...(state.viewConfig.kindra || defaultKindra()), overlays: [] })
            }
        };
    }),

    clearVisualModes: () => set((state) => {
        if (!state.viewConfig) return {};
        const current = state.viewConfig;
        const currentStack = { ...defaultRightStack(), ...(current.rightStack || {}) };
        const nextStack = {
            ...currentStack,
        };
        const needsOverlayClear = (current.kindra?.overlays || []).length > 0;
        const needsTimelineClose = !!current.timelinePanelOpen;
        const needsFamilyReset = current.focusFamilyId !== null;
        const needsStackChange =
            currentStack.detailsMode !== nextStack.detailsMode;
        if (!needsOverlayClear && !needsTimelineClose && !needsFamilyReset && !needsStackChange) return {};
        return {
            viewConfig: {
                ...current,
                timelinePanelOpen: false,
                focusFamilyId: null,
                rightStack: nextStack,
                ...withNormalizedKindra({ ...(current.kindra || defaultKindra()), overlays: [] })
            }
        };
    }),

    fitToScreen: () => set((state) => ({ fitNonce: state.fitNonce + 1 }))
});

