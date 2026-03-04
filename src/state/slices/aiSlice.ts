import { StateCreator } from "zustand";
import { AppState, AiSlice } from "../types";
import { UiEngine } from "@/core/engine/UiEngine";
import type { AiProvider } from "@/types/ai";

export const createAiSlice: StateCreator<AppState, [], [], AiSlice> = (set) => ({
    aiSettings: undefined as any, // Will be initialized in store.ts
    mergeDraft: null,

    setMergeDraft: (draft) => set({ mergeDraft: draft }),
    clearMergeDraft: () => set({ mergeDraft: null }),

    setAiSettings: (settings) => set((state) => {
        const merged = UiEngine.normalizeAiSettings(state.aiSettings, settings);
        const nextCatalog = {
            ...merged.modelCatalog,
            ...(settings.modelCatalog || {})
        };
        const providers: AiProvider[] = ["chatgpt", "gemini"];
        const providerModels = { ...merged.providerModels };

        for (const provider of providers) {
            const incoming = nextCatalog[provider] || [];
            if (!incoming.length) continue;
            const selected = providerModels[provider];
            const exists = incoming.some((entry) => entry.id === selected);
            if (!exists) {
                const recommended = incoming.find((entry) => entry.recommended)?.id;
                providerModels[provider] = recommended || incoming[0].id;
            }
        }

        return {
            aiSettings: {
                ...merged,
                modelCatalog: nextCatalog,
                providerModels,
                useCaseModels: {
                    ...merged.useCaseModels,
                    birth_refinement: {
                        provider: merged.useCaseModels.birth_refinement?.provider || "chatgpt",
                        model: providerModels[merged.useCaseModels.birth_refinement?.provider || "chatgpt"]
                    }
                }
            }
        };
    }),
});
