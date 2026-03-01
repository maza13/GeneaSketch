import { describe, expect, it, beforeEach, vi } from "vitest";
import { createDefaultAiSettings } from "@/core/ai/defaults";
import { refineBirthRangeWithAi } from "@/core/inference/aiBirthRefinement";
import type { AiInvokeProviderRequest } from "@/types/ai";
import type { GeneaDocument } from "@/types/domain";

const aiInvokeProviderMock = vi.fn<(request: AiInvokeProviderRequest) => Promise<{ text: string; model: string; provider: "chatgpt" | "gemini" }>>();

vi.mock("@/services/aiRuntime", () => ({
  aiInvokeProvider: (request: AiInvokeProviderRequest) => aiInvokeProviderMock(request)
}));

function buildDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": {
        id: "@I1@",
        name: "Ana",
        surname: "Perez",
        sex: "F",
        lifeStatus: "alive",
        events: [],
        famc: ["@F1@"],
        fams: [],
        mediaRefs: [],
        sourceRefs: []
      },
      "@I2@": {
        id: "@I2@",
        name: "Padre",
        sex: "M",
        lifeStatus: "alive",
        events: [{ type: "BIRT", date: "1950" }],
        famc: [],
        fams: ["@F1@"],
        mediaRefs: [],
        sourceRefs: []
      },
      "@I3@": {
        id: "@I3@",
        name: "Madre",
        sex: "F",
        lifeStatus: "alive",
        events: [{ type: "BIRT", date: "1955" }],
        famc: [],
        fams: ["@F1@"],
        mediaRefs: [],
        sourceRefs: []
      }
    },
    families: {
      "@F1@": {
        id: "@F1@",
        husbandId: "@I2@",
        wifeId: "@I3@",
        childrenIds: ["@I1@"],
        events: []
      }
    },
    media: {},
    metadata: { sourceFormat: "GED", gedVersion: "7.0.x" }
  };
}

describe("ai birth refinement", () => {
  beforeEach(() => {
    aiInvokeProviderMock.mockReset();
  });

  it("does not send temperature for restricted models", async () => {
    aiInvokeProviderMock.mockResolvedValue({
      text: JSON.stringify({ minYear: 1974, maxYear: 1979, confidence: 0.84, verdict: "Consistente", notes: ["ok"] }),
      model: "gpt-5-nano",
      provider: "chatgpt"
    });

    const result = await refineBirthRangeWithAi({
      document: buildDoc(),
      personId: "@I1@",
      settings: createDefaultAiSettings()
    });

    expect(aiInvokeProviderMock).toHaveBeenCalledTimes(1);
    expect(aiInvokeProviderMock.mock.calls[0][0].temperature).toBeUndefined();
    expect(result.usedFallbackLocal).toBe(false);
    expect(result.verdict).toContain("Veredicto:");
    expect(result.verdict).toContain("Consistente");
    expect(result.verdict).toContain("Modelo: chatgpt:gpt-5-nano");
  });

  it("retries without temperature when provider rejects it", async () => {
    const settings = createDefaultAiSettings();
    settings.useCaseModels.birth_refinement = { provider: "chatgpt", model: "gpt-4o" };

    aiInvokeProviderMock
      .mockRejectedValueOnce(new Error("HTTP_400: OpenAI error: {\"error\":{\"param\":\"temperature\",\"code\":\"unsupported_value\"}}"))
      .mockResolvedValueOnce({
        text: JSON.stringify({ minYear: 1970, maxYear: 1978, confidence: 0.8, verdict: "Reintento correcto", notes: [] }),
        model: "gpt-4o",
        provider: "chatgpt"
      });

    const result = await refineBirthRangeWithAi({
      document: buildDoc(),
      personId: "@I1@",
      settings
    });

    expect(aiInvokeProviderMock).toHaveBeenCalledTimes(2);
    expect(aiInvokeProviderMock.mock.calls[0][0].temperature).toBe(0);
    expect(aiInvokeProviderMock.mock.calls[1][0].temperature).toBeUndefined();
    expect(result.usedFallbackLocal).toBe(false);
  });

  it("sends factual-only context (no local inference payload)", async () => {
    const doc = buildDoc();
    doc.persons["@I1@"].events = [{ type: "BIRT", date: "13 JUL 1994" }];

    aiInvokeProviderMock.mockResolvedValue({
      text: JSON.stringify({ minYear: 1974, maxYear: 1979, confidence: 0.84, verdict: "Consistente", notes: [] }),
      model: "gpt-5-nano",
      provider: "chatgpt"
    });

    await refineBirthRangeWithAi({
      document: doc,
      personId: "@I1@",
      settings: createDefaultAiSettings()
    });

    const request = aiInvokeProviderMock.mock.calls[0][0];
    expect(request.userPrompt).toContain("\"facts\"");
    expect(request.userPrompt).not.toContain("localInference");
    expect(request.userPrompt).not.toContain("suggestedRange");
    expect(request.userPrompt).toContain("\"currentBirthDateGedcom\": null");
    expect(request.userPrompt).not.toContain("focus:@I1@:BIRT");
  });

  it("falls back to local range when provider fails", async () => {
    aiInvokeProviderMock.mockRejectedValue(new Error("HTTP_401: Missing API key"));

    const result = await refineBirthRangeWithAi({
      document: buildDoc(),
      personId: "@I1@",
      settings: createDefaultAiSettings()
    });

    expect(result.usedFallbackLocal).toBe(true);
    expect(result.notes[0]).toContain("mantiene rango local");
  });

  it("recovers range and verdict from non-JSON raw text", async () => {
    aiInvokeProviderMock.mockResolvedValue({
      text: "Veredicto: con la evidencia disponible, el rango probable es 1972-1978 por cronología familiar.",
      model: "gpt-5-nano",
      provider: "chatgpt"
    });

    const result = await refineBirthRangeWithAi({
      document: buildDoc(),
      personId: "@I1@",
      settings: createDefaultAiSettings()
    });

    expect(result.usedFallbackLocal).toBe(false);
    expect(result.minYear).toBe(1972);
    expect(result.maxYear).toBe(1978);
    expect(result.verdict).toContain("Veredicto");
  });

  it("preserves verdict when parsed JSON has no range", async () => {
    aiInvokeProviderMock.mockResolvedValue({
      text: JSON.stringify({
        confidence: 0.41,
        verdict: "No puedo estimar rango con seguridad por falta de fechas directas.",
        notes: ["Evidencia insuficiente"]
      }),
      model: "gpt-5-nano",
      provider: "chatgpt"
    });

    const result = await refineBirthRangeWithAi({
      document: buildDoc(),
      personId: "@I1@",
      settings: createDefaultAiSettings()
    });

    expect(result.usedFallbackLocal).toBe(true);
    expect(result.verdict).toContain("No puedo estimar rango");
  });

  it("normalizes english verdict to spanish and signs model", async () => {
    aiInvokeProviderMock.mockResolvedValue({
      text: JSON.stringify({
        minYear: 1995,
        maxYear: 2004,
        confidence: 0.65,
        verdict: "Range based on parents born 1971 and siblings in 1998 and 2002."
      }),
      model: "gpt-5-mini",
      provider: "chatgpt"
    } as any);

    const settings = createDefaultAiSettings();
    settings.useCaseModels.birth_refinement = { provider: "chatgpt", model: "gpt-5-mini" };

    const result = await refineBirthRangeWithAi({
      document: buildDoc(),
      personId: "@I1@",
      settings
    });

    expect(result.verdict).toContain("Veredicto:");
    expect(result.verdict).toContain("Modelo: chatgpt:gpt-5-mini");
    expect(result.verdict.toLowerCase()).not.toContain("range based on");
  });

  it("retries when finish reason is length and succeeds on second attempt", async () => {
    const settings = createDefaultAiSettings();
    settings.birthRefinementProfile = "balanced";
    aiInvokeProviderMock
      .mockResolvedValueOnce({
        text: "",
        model: "gpt-5-nano",
        provider: "chatgpt",
        finishReason: "length",
        apiUsed: "chat_completions",
        rawBody: "{\"choices\":[{\"finish_reason\":\"length\",\"message\":{\"content\":\"\"}}]}"
      } as any)
      .mockResolvedValueOnce({
        text: JSON.stringify({ minYear: 1971, maxYear: 1977, confidence: 0.73, verdict: "OK retry", notes: [] }),
        model: "gpt-5-nano",
        provider: "chatgpt",
        apiUsed: "responses"
      } as any);

    const result = await refineBirthRangeWithAi({
      document: buildDoc(),
      personId: "@I1@",
      settings
    });

    expect(aiInvokeProviderMock).toHaveBeenCalledTimes(2);
    expect(aiInvokeProviderMock.mock.calls[0][0].maxOutputTokens).toBe(600);
    expect(aiInvokeProviderMock.mock.calls[1][0].maxOutputTokens).toBe(900);
    expect(result.usedFallbackLocal).toBe(false);
    expect(result.debugTrace?.retryCount).toBe(1);
    expect(result.debugTrace?.retryReason).toBe("length");
  });

  it("falls back after retries with empty output", async () => {
    const settings = createDefaultAiSettings();
    settings.birthRefinementProfile = "balanced";
    aiInvokeProviderMock
      .mockResolvedValueOnce({
        text: "",
        model: "gpt-5-nano",
        provider: "chatgpt",
        finishReason: "length",
        apiUsed: "chat_completions",
        rawBody: "{\"choices\":[{\"finish_reason\":\"length\",\"message\":{\"content\":\"\"}}]}"
      } as any)
      .mockResolvedValueOnce({
        text: "",
        model: "gpt-5-nano",
        provider: "chatgpt",
        finishReason: "length",
        apiUsed: "responses",
        rawBody: "{\"status\":\"incomplete\"}"
      } as any);

    const result = await refineBirthRangeWithAi({
      document: buildDoc(),
      personId: "@I1@",
      settings
    });

    expect(result.usedFallbackLocal).toBe(true);
    expect(result.notes[0]).toContain("agotó tokens");
    expect(result.debugTrace?.retryCount).toBeGreaterThanOrEqual(2);
  });
});
