import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultAiSettings } from "@/core/ai/defaults";
import { SessionService } from "@/io/sessionService";
import { useAppStore } from "@/state/store";

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(SessionService, "saveAutosession").mockResolvedValue();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("ai model catalog normalization", () => {
  it("preserves isPreview flags when catalog is updated", () => {
    const defaults = createDefaultAiSettings();
    useAppStore.setState((state) => ({
      ...state,
      aiSettings: defaults
    }));

    useAppStore.getState().setAiSettings({
      modelCatalog: {
        chatgpt: [
          { id: "gpt-5-preview", label: "GPT-5 Preview", recommended: true, isPreview: true }
        ],
        gemini: defaults.modelCatalog.gemini
      },
      providerModels: {
        chatgpt: "gpt-5-preview",
        gemini: defaults.providerModels.gemini
      }
    });

    const state = useAppStore.getState().aiSettings;
    expect(state.modelCatalog.chatgpt[0].isPreview).toBe(true);
    expect(typeof state.geminiFreeTierMode).toBe("boolean");
    expect(state.useCaseModels.birth_refinement).toBeDefined();
  });

  it("replaces invalid selected model with recommended or first option", () => {
    const defaults = createDefaultAiSettings();
    useAppStore.setState((state) => ({
      ...state,
      aiSettings: defaults
    }));

    useAppStore.getState().setAiSettings({
      providerModels: {
        chatgpt: "non-existent-chatgpt",
        gemini: "non-existent-gemini"
      },
      modelCatalog: {
        chatgpt: [
          { id: "gpt-4.1-mini", label: "GPT-4.1 mini", recommended: true },
          { id: "gpt-4.1", label: "GPT-4.1" }
        ],
        gemini: [
          { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
          { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }
        ]
      }
    });

    const state = useAppStore.getState().aiSettings;
    expect(state.providerModels.chatgpt).toBe("gpt-4.1-mini");
    expect(state.providerModels.gemini).toBe("gemini-2.5-pro");
    expect(state.useCaseModels.birth_refinement.model).toBe("gpt-4.1-mini");
  });
});
