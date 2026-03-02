import { StateCreator } from "zustand";
import { AppState, SessionSlice } from "../types";
import { SessionService } from "@/io/sessionService";

const newRecentId = () => `recent_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;

export const createSessionSlice: StateCreator<AppState, [], [], SessionSlice> = (set, get) => ({
    focusHistory: [],
    focusIndex: -1,
    restoreAvailable: false,
    parseErrors: [],
    parseWarnings: [],
    recentFiles: [],
    recentPayloads: {},
    isRestoring: true,

    inspectPerson: (personId) => set((state) => {
        if (!state.document || (personId && !state.document.persons[personId])) return {};
        return { selectedPersonId: personId };
    }),

    goBack: () => set((state) => {
        if (state.focusIndex <= 0 || state.focusHistory.length === 0) return {};
        const focusIndex = state.focusIndex - 1;
        const nextPersonId = state.focusHistory[focusIndex];
        if (!nextPersonId || (state.document && !state.document.persons[nextPersonId])) return { focusIndex };
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
        if (!nextPersonId || (state.document && !state.document.persons[nextPersonId])) return { focusIndex };
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
        if (state.isRestoring) return;
        const snapshot = {
            schemaVersion: 4,
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
        await SessionService.saveAutosession(snapshot as any);
    },

    checkRestoreAvailability: async () => {
        const restored = await SessionService.restoreAutosession();
        const hasSession = !!restored;
        set({ restoreAvailable: hasSession });
        if (!hasSession) set({ isRestoring: false });
    },

    restoreSession: async () => {
        const restored = await SessionService.restoreAutosession();
        if (!restored) {
            set({ restoreAvailable: false, isRestoring: false });
            return;
        }
        set({ isRestoring: false, restoreAvailable: false });
    },

    clearSession: async () => {
        await SessionService.clearAutosession();
        set({ restoreAvailable: false, isRestoring: false });
    }
});
