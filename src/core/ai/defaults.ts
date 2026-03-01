import type { AiSettings } from "@/types/ai";

export const DEFAULT_CHATGPT_MODEL = "gpt-5-nano";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function createDefaultAiSettings(): AiSettings {
  return {
    executionMode: "hybrid",
    fallbackEnabled: true,
    contextPolicy: "adaptive",
    deterministicMode: true,
    developerBirthRefinementDebug: false,
    developerBirthRefinementShowRawUnfiltered: false,
    openAiPreferredApi: "auto",
    birthRefinementProfile: "balanced",
    geminiFreeTierMode: false,
    providerModels: {
      chatgpt: DEFAULT_CHATGPT_MODEL,
      gemini: DEFAULT_GEMINI_MODEL
    },
    useCaseModels: {
      extraction: { provider: "chatgpt", model: DEFAULT_CHATGPT_MODEL },
      // Deprecated in runtime v4: resolution is computed in local deterministic engine.
      resolution: { provider: "gemini", model: DEFAULT_GEMINI_MODEL },
      narration: { provider: "chatgpt", model: DEFAULT_CHATGPT_MODEL },
      birth_refinement: { provider: "chatgpt", model: DEFAULT_CHATGPT_MODEL }
    },
    modelCatalog: {
      chatgpt: [
        { id: "gpt-5-nano", label: "GPT-5 Nano", recommended: true, price: "$0.05", priceOut: "$0.40", intelligence: 3, isReasoning: true },
        { id: "gpt-5-mini", label: "GPT-5 Mini", price: "$0.25", priceOut: "$2.00", intelligence: 4, isReasoning: true },
        { id: "gpt-5", label: "GPT-5", price: "$1.25", priceOut: "$10.00", intelligence: 5, isReasoning: true },
        { id: "gpt-5.1", label: "GPT-5.1", price: "$1.75", priceOut: "$14.00", intelligence: 5, isReasoning: true },
        { id: "o4-mini", label: "o4-mini", price: "$1.10", priceOut: "$4.40", intelligence: 4, isReasoning: true },
        { id: "o3-mini", label: "o3-mini", price: "Low", priceOut: "Low", intelligence: 4, isReasoning: true },
        { id: "gpt-4o", label: "GPT-4o", price: "$5.00", priceOut: "$20.00", intelligence: 4 },
        { id: "gpt-4o-mini", label: "GPT-4o Mini", price: "$0.15", priceOut: "$0.60", intelligence: 3 }
      ],
      gemini: [
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", recommended: true, price: "Free*", priceOut: "Free*", intelligence: 4 },
        { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", price: "$1.25", priceOut: "$3.75", intelligence: 5 },
        { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", price: "$0.10", priceOut: "$0.40", intelligence: 4 }
      ]
    },
    tokenLimits: {
      extraction: 1200,
      resolution: 2200
    },
    retryPolicy: {
      maxRetries: 2,
      baseDelayMs: 400,
      retryOnStatuses: [429, 500, 502, 503, 504]
    },
    costFlags: {
      showCostEstimate: true,
      warnOnLargeContext: true
    }
  };
}

