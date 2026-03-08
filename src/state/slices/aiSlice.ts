import { StateCreator } from "zustand";
import { AppState, AiSlice } from "../types";
import { mergeAiSettings } from "@/state/workspaceDefaults";
import type { AiProvider } from "@/types/ai";
import { chooseProviderModel } from "@/core/ai/modelSelection";

export const createAiSlice: StateCreator<AppState, [], [], AiSlice> = (set) => ({
    aiSettings: undefined as any, // Will be initialized in store.ts
    mergeDraft: null,

    setMergeDraft: (draft) => set({ mergeDraft: draft }),
    clearMergeDraft: () => set({ mergeDraft: null }),

    setAiSettings: (settings) => set((state) => {
        const merged = mergeAiSettings(state.aiSettings, settings);
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
            providerModels[provider] = chooseProviderModel(incoming, selected);
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
