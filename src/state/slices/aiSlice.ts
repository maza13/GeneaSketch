import { StateCreator } from "zustand";
import { AppState, AiSlice } from "../types";
import { UiEngine } from "@/core/engine/UiEngine";

export const createAiSlice: StateCreator<AppState, [], [], AiSlice> = (set) => ({
    aiSettings: undefined as any, // Will be initialized in store.ts
    mergeDraft: null,

    setMergeDraft: (draft) => set({ mergeDraft: draft }),
    clearMergeDraft: () => set({ mergeDraft: null }),

    setAiSettings: (settings) => set((state) => ({
        aiSettings: UiEngine.normalizeAiSettings(state.aiSettings, settings)
    })),
});
