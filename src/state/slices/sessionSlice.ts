import { StateCreator } from "zustand";
import { AppState, SessionSlice } from "../types";
import { SESSION_SNAPSHOT_SCHEMA_VERSION, SessionService } from "@/io/sessionService";
import { ensureExpanded } from "../helpers/graphHelpers";
import { UiEngine } from "@/core/engine/UiEngine";
import { GenraphGraph } from "@/core/genraph";
import { createDefaultAiSettings } from "@/core/ai/defaults";
import { sanitizeMergeDraftSnapshot } from "@/core/edit/mergeDraftValidation";
import { normalizeKindraConfig } from "@/core/kindra/kindraConfig";
import type { ActiveOverlay, SessionSnapshot, ViewConfig } from "@/types/domain";
import { projectGraphDocument } from "@/core/read-model/selectors";
import type { GraphDocument } from "@/core/read-model/types";

const newRecentId = () => `recent_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;

export const createSessionSlice: StateCreator<AppState, [], [], SessionSlice> = (set, get) => ({
    focusHistory: [],
    focusIndex: -1,
    bootStatus: "checking",
    restoreAvailable: false,
    restoreNoticeVisible: false,
    parseErrors: [],
    parseWarnings: [],
    recentFiles: [],
    recentPayloads: {},
    isRestoring: true,

    inspectPerson: (personId) => set((state) => {
        if (!state.genraphGraph || (personId && !state.genraphGraph.node(personId))) return {};
        if (!state.viewConfig) return { selectedPersonId: personId };
        return { selectedPersonId: personId, viewConfig: { ...state.viewConfig, focusPersonId: personId } };
    }),

    goBack: () => set((state) => {
        if (state.focusIndex <= 0 || state.focusHistory.length === 0) return {};
        const focusIndex = state.focusIndex - 1;
        const nextPersonId = state.focusHistory[focusIndex];
        if (!nextPersonId || (state.genraphGraph && !state.genraphGraph.node(nextPersonId))) return { focusIndex };
        const viewConfig = state.viewConfig ? { ...state.viewConfig, focusPersonId: nextPersonId } : state.viewConfig;
        return {
            focusIndex,
            selectedPersonId: nextPersonId,
            viewConfig
        } as Partial<AppState>;
    }),

    goForward: () => set((state) => {
        if (state.focusIndex >= state.focusHistory.length - 1) return {};
        const focusIndex = state.focusIndex + 1;
        const nextPersonId = state.focusHistory[focusIndex];
        if (!nextPersonId || (state.genraphGraph && !state.genraphGraph.node(nextPersonId))) return { focusIndex };
        const viewConfig = state.viewConfig ? { ...state.viewConfig, focusPersonId: nextPersonId } : state.viewConfig;
        return {
            focusIndex,
            selectedPersonId: nextPersonId,
            viewConfig
        } as Partial<AppState>;
    }),

    setParseErrors: (errors) => set({ parseErrors: errors }),
    setParseWarnings: (warnings) => set({ parseWarnings: warnings }),

    addRecentFile: (entry, payload) => {
        const id = newRecentId();
        const nextEntry = { ...entry, id, lastUsedAt: new Date().toISOString() };
        set((state) => {
            const deduped = state.recentFiles.filter((item) => !(item.name === entry.name && item.kind === entry.kind));
            return {
                recentFiles: [nextEntry, ...deduped].slice(0, 30),
                recentPayloads: { ...state.recentPayloads, [id]: payload }
            };
        });
        return id;
    },

    removeRecentFile: (id) => set((state) => {
        const nextPayloads = { ...state.recentPayloads };
        delete nextPayloads[id];
        return {
            recentFiles: state.recentFiles.filter((item) => item.id !== id),
            recentPayloads: nextPayloads
        };
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

    saveAutosessionNow: async () => {
        const state = get();
        const hasActiveState = hasActiveSessionState(state);
        if (state.isRestoring && !hasActiveState) return;
        if (state.isRestoring && hasActiveState) {
            set({ isRestoring: false });
        }
        await SessionService.saveAutosession(buildAutosessionSnapshot(get()));
    },

    bootstrapSession: async () => {
        try {
            set({ bootStatus: "checking", isRestoring: true });
            const restored = await SessionService.restoreAutosession();
            if (!restored) {
                set({ restoreAvailable: false, restoreNoticeVisible: false, isRestoring: false, bootStatus: "ready" });
                return;
            }
            set({ bootStatus: "restoring" });
            applyRestoredSnapshot(set, get, restored, true);
        } catch (error) {
            console.warn("[sessionSlice] bootstrapSession failed; starting clean", error);
            set({ restoreAvailable: false, restoreNoticeVisible: false, isRestoring: false, bootStatus: "ready" });
        }
    },

    checkRestoreAvailability: async () => {
        const restored = await SessionService.restoreAutosession();
        const hasSession = !!restored;
        set({ restoreAvailable: hasSession });
        if (!hasSession) set({ isRestoring: false });
    },

    restoreSession: async () => {
        try {
            const restored = await SessionService.restoreAutosession();
            if (!restored) {
                set({ restoreAvailable: false, restoreNoticeVisible: false });
                return;
            }
            applyRestoredSnapshot(set, get, restored, false);
        } catch (error) {
            console.warn("[sessionSlice] restoreSession failed; clearing restore state", error);
            set({ restoreAvailable: false, restoreNoticeVisible: false });
        } finally {
            set({ isRestoring: false, bootStatus: "ready" });
        }
    },

    clearSession: async () => {
        await SessionService.clearAutosession();
        set({ restoreAvailable: false, restoreNoticeVisible: false, isRestoring: false, bootStatus: "ready" });
    },

    dismissRestoreNotice: () => set({ restoreNoticeVisible: false }),
});

function applyRestoredSnapshot(
    set: Parameters<StateCreator<AppState, [], [], SessionSlice>>[0],
    get: Parameters<StateCreator<AppState, [], [], SessionSlice>>[1],
    restored: SessionSnapshot,
    showNotice: boolean,
): void {
    const restoredGraph = restored.graph
        ? GenraphGraph.fromData(restored.graph.data, restored.graph.journal)
        : null;
    if ((restored.schemaVersion ?? 0) < SESSION_SNAPSHOT_SCHEMA_VERSION && !restoredGraph) {
        set({ restoreAvailable: false, restoreNoticeVisible: false, isRestoring: false, bootStatus: "ready" });
        return;
    }
    const projectedDoc = projectGraphDocument(restoredGraph);
    const normalizedViewConfig = normalizeRestoredViewConfig(restored.viewConfig, projectedDoc);
    const selectedPersonId = normalizedViewConfig?.focusPersonId
        || Object.keys(projectedDoc?.persons || {})[0]
        || null;
    const normalizedAiSettings = normalizeRestoredAiSettings(restored.aiSettings);
    const mergeDraft = sanitizeMergeDraftSnapshot(restored.mergeDraft) ?? null;
    get().loadGraph({ graph: restoredGraph, source: "session" });
    set({
        viewConfig: normalizedViewConfig,
        visualConfig: UiEngine.normalizeVisualConfig(restored.visualConfig),
        expandedGraph: ensureExpanded(projectedDoc, normalizedViewConfig),
        selectedPersonId,
        focusHistory: restored.focusHistory || [],
        focusIndex: restored.focusIndex ?? -1,
        recentFiles: restored.recentFiles || [],
        recentPayloads: restored.recentPayloads || {},
        mergeDraft,
        aiSettings: normalizedAiSettings,
        restoreAvailable: false,
        restoreNoticeVisible: showNotice,
        isRestoring: false,
        bootStatus: "ready",
    });
}

function hasActiveSessionState(state: AppState): boolean {
    return !!state.genraphGraph || !!state.viewConfig;
}

function buildAutosessionSnapshot(state: AppState): SessionSnapshot {
    const snapshotViewConfig = state.viewConfig
        ? (() => {
            const nextViewConfig: ViewConfig = {
            ...state.viewConfig,
            kindra: state.viewConfig.kindra
                ? {
                    ...normalizeKindraConfig(state.viewConfig.kindra),
                    overlays: (state.viewConfig.kindra.overlays || []).filter((overlay) => overlay.type !== "merge_focus")
                }
                : state.viewConfig.kindra
            };
            return nextViewConfig;
        })()
        : null;
    return {
        schemaVersion: SESSION_SNAPSHOT_SCHEMA_VERSION,
        graph: state.genraphGraph
            ? {
                data: state.genraphGraph.toData(),
                journal: [...state.genraphGraph.getJournal()]
            }
            : null,
        viewConfig: snapshotViewConfig,
        visualConfig: state.visualConfig,
        focusHistory: state.focusHistory,
        focusIndex: state.focusIndex,
        recentFiles: state.recentFiles,
        recentPayloads: state.recentPayloads,
        mergeDraft: state.mergeDraft,
        aiSettings: state.aiSettings
    };
}

function normalizeTimelineOverlay(overlay: ActiveOverlay): ActiveOverlay {
    if (overlay.type !== "timeline") return overlay;
    const config = overlay.config || {};
    const year = typeof config.year === "number" ? config.year : config.currentYear;
    return {
        ...overlay,
        config: {
            ...config,
            year,
            currentYear: undefined
        }
    };
}

function normalizeRestoredViewConfig(
    viewConfig: any,
    document: GraphDocument | null
): ViewConfig | null {
    if (!viewConfig || typeof viewConfig !== "object") {
        const firstPersonId = Object.keys(document?.persons || {})[0] || "";
        return UiEngine.createDefaultViewConfig(firstPersonId);
    }

    const firstPersonId = Object.keys(document?.persons || {})[0] || "";
    const defaults = UiEngine.createDefaultViewConfig(firstPersonId);
    const legacyIncludeSpouses = viewConfig.include?.spouses;
    const overlays = Array.isArray(viewConfig?.kindra?.overlays)
        ? viewConfig.kindra.overlays.map((overlay: ActiveOverlay) => normalizeTimelineOverlay(overlay))
        : [];
    const rightStack = viewConfig.rightStack || {};
    const detailsMode = rightStack.detailsMode
        || (typeof rightStack.detailsExpanded === "boolean" ? (rightStack.detailsExpanded ? "expanded" : "compact") : undefined)
        || defaults.rightStack?.detailsMode;
    const timelineMode = rightStack.timelineMode
        || (typeof rightStack.timelineExpanded === "boolean" ? (rightStack.timelineExpanded ? "expanded" : "compact") : undefined)
        || defaults.rightStack?.timelineMode;

    return {
        ...defaults,
        ...viewConfig,
        focusPersonId: viewConfig.focusPersonId || firstPersonId || null,
        homePersonId: viewConfig.homePersonId || firstPersonId || "",
        depth: {
            ...defaults.depth,
            ...(viewConfig.depth || {})
        },
        showSpouses: typeof viewConfig.showSpouses === "boolean"
            ? viewConfig.showSpouses
            : typeof legacyIncludeSpouses === "boolean"
                ? legacyIncludeSpouses
                : defaults.showSpouses,
        shellPanels: { ...defaults.shellPanels, ...(viewConfig.shellPanels || {}) },
        leftSections: { ...defaults.leftSections, ...(viewConfig.leftSections || {}) },
        timeline: { ...defaults.timeline, ...(viewConfig.timeline || {}) },
        rightStack: {
            ...defaults.rightStack,
            ...rightStack,
            detailsMode,
            timelineMode,
            detailsAutoCompactedByTimeline: !!rightStack.detailsAutoCompactedByTimeline
        },
        kindra: {
            ...normalizeKindraConfig(viewConfig.kindra),
            overlays
        }
    };
}

function normalizeRestoredAiSettings(incoming: any) {
    const defaults = createDefaultAiSettings();
    if (!incoming || typeof incoming !== "object") return defaults;
    return {
        ...defaults,
        ...incoming,
        providerModels: {
            ...defaults.providerModels,
            ...(incoming.providerModels || {})
        },
        useCaseModels: {
            ...defaults.useCaseModels,
            ...(incoming.useCaseModels || {})
        },
        birthRefinementLevelModels: {
            ...defaults.birthRefinementLevelModels,
            ...(incoming.birthRefinementLevelModels || {})
        },
        birthRefinementIncludeNotesByLevel: {
            ...defaults.birthRefinementIncludeNotesByLevel,
            ...(incoming.birthRefinementIncludeNotesByLevel || {})
        },
        birthRefinementNotesScopeByLevel: {
            ...defaults.birthRefinementNotesScopeByLevel,
            ...(incoming.birthRefinementNotesScopeByLevel || {})
        },
        birthEstimatorVersion: "v2" as const
    };
}
