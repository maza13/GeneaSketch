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
    birthRefinementLevel: "balanced",
    birthEstimatorVersion: "v2",
    birthRefinementIncludeNotesByLevel: {
      simple: false,
      balanced: true,
      complex: true
    },
    birthRefinementNotesScopeByLevel: {
      simple: "none",
      balanced: "focus_only",
      complex: "focus_parents_children"
    },
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
    birthRefinementModel: { provider: "chatgpt", model: DEFAULT_CHATGPT_MODEL },
    birthRefinementLevelModels: {
      simple: { provider: "chatgpt", model: DEFAULT_CHATGPT_MODEL },
      balanced: { provider: "chatgpt", model: DEFAULT_CHATGPT_MODEL },
      complex: { provider: "chatgpt", model: DEFAULT_CHATGPT_MODEL }
    },
    birthRefinementIncludeNotes: true,
    birthRefinementNotesScope: "focus_only",
    modelCatalog: {
      chatgpt: [
        { id: "gpt-5-nano", label: "OpenAI: GPT-5 Nano (★★★) ($0.05/$0.005/$0.40) (recomendado)", recommended: true, price: "$0.05", priceOut: "$0.40", intelligence: 3, isReasoning: true },
        { id: "gpt-4o-mini", label: "OpenAI: GPT-4o Mini (★★★) ($0.15/$0.075/$0.60)", price: "$0.15", priceOut: "$0.60", intelligence: 3 },
        { id: "gpt-5-mini", label: "OpenAI: GPT-5 Mini (★★★★) ($0.25/$0.025/$2.00)", price: "$0.25", priceOut: "$2.00", intelligence: 4, isReasoning: true },
        { id: "o4-mini", label: "OpenAI: o4-mini (★★★★) ($1.10/$0.28/$4.40)", price: "$1.10", priceOut: "$4.40", intelligence: 4, isReasoning: true },
        { id: "gpt-5.1", label: "OpenAI: GPT-5.1 (★★★★★) ($1.25/$0.125/$10.00)", price: "$1.25", priceOut: "$10.00", intelligence: 5, isReasoning: true }
      ],
      gemini: [
        { id: "gemini-2.0-flash", label: "Google: Gemini 2.0 Flash (★★★★) ($0.10/$0.025/$0.40)", price: "$0.10", priceOut: "$0.40", intelligence: 4 },
        { id: "gemini-2.5-flash", label: "Google: Gemini 2.5 Flash (★★★★) ($0.30/$0.03/$2.50) (recomendado)", recommended: true, price: "$0.30", priceOut: "$2.50", intelligence: 4 }
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
