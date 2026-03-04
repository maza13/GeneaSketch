import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiPipelineStageError, runAiGlobalFocusDetection, runAiPipeline } from "@/core/ai/orchestrator";
import { createDefaultAiSettings } from "@/core/ai/defaults";
import type { AiInvokeProviderRequest } from "@/types/ai";
import type { GeneaDocument } from "@/types/domain";

const aiInvokeProviderMock = vi.fn();

vi.mock("@/services/aiRuntime", () => ({
  aiInvokeProvider: (request: AiInvokeProviderRequest) => aiInvokeProviderMock(request)
}));

function doc(): GeneaDocument {
  return {
    persons: {
      "@I1@": { id: "@I1@", name: "Juan Jesus", surname: "Nunez Mendoza", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] },
      "@I2@": { id: "@I2@", name: "Mateo", surname: "Lopez", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: [], mediaRefs: [], sourceRefs: [] }
    },
    families: {},
    media: {},
    metadata: { sourceFormat: "GSK", gedVersion: "7.0.x" }
  };
}

function extractionV4(overrides: Record<string, unknown> = {}) {
  return {
    focus: { name: "Juan Jesus Nunez Mendoza", idHint: "ANCHOR", confidence: 0.98 },
    persons: [{ tempId: "ANCHOR", name: "Juan Jesus", surname: "Nunez Mendoza", role: "focus", confidence: 0.98 }],
    familyFacts: [],
    personFacts: [],
    relations: [],
    rawText: "mensaje",
    confidence: 0.9,
    ...overrides
  };
}

beforeEach(() => {
  aiInvokeProviderMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ai orchestrator deterministic v5", () => {
  it("falls back to alternate provider on retryable errors in extraction", async () => {
    const settings = createDefaultAiSettings();
    settings.executionMode = "chatgpt_only";
    settings.retryPolicy.maxRetries = 0;

    aiInvokeProviderMock.mockImplementation(async (request: AiInvokeProviderRequest) => {
      if (request.provider === "chatgpt") {
        throw new Error("HTTP_429: rate limited");
      }
      return {
        provider: request.provider,
        model: request.model,
        text: JSON.stringify(extractionV4({
          persons: [
            { tempId: "ANCHOR", name: "Juan Jesus", surname: "Nunez Mendoza", role: "focus", confidence: 0.98 },
            { tempId: "P2", name: "Johana", surname: "Torres", role: "spouse", confidence: 0.91 }
          ],
          relations: [{ type: "spouse", from: "ANCHOR", to: "P2", confidence: 0.9 }]
        }))
      };
    });

    const review = await runAiPipeline({
      document: doc(),
      settings,
      context: { kind: "local", anchorPersonId: "@I1@" },
      text: "juan jesus se caso con johana torres en 2019"
    });

    expect(review.providerTrace.length).toBe(1);
    expect(review.providerTrace[0].provider).toBe("gemini");
    expect(review.providerTrace[0].fallbackFrom).toBe("chatgpt");
  });

  it("uses fallback extraction prompt when first extraction is weak", async () => {
    const settings = createDefaultAiSettings();
    settings.executionMode = "gemini_only";
    settings.fallbackEnabled = false;

    let calls = 0;
    aiInvokeProviderMock.mockImplementation(async (request: AiInvokeProviderRequest) => {
      calls += 1;
      if (calls === 1) {
        return { provider: request.provider, model: request.model, text: JSON.stringify(extractionV4({ persons: [], relations: [], familyFacts: [], personFacts: [], confidence: 0.2 })) };
      }
      return {
        provider: request.provider,
        model: request.model,
        text: JSON.stringify(extractionV4({ persons: [
          { tempId: "ANCHOR", name: "Juan Jesus", surname: "Nunez Mendoza", role: "focus", confidence: 0.98 },
          { tempId: "P2", name: "Johana", surname: "Torres", role: "spouse", confidence: 0.92 }
        ], relations: [{ type: "spouse", from: "ANCHOR", to: "P2", confidence: 0.9 }] }))
      };
    });

    const review = await runAiPipeline({
      document: doc(),
      settings,
      context: { kind: "local", anchorPersonId: "@I1@" },
      text: "se caso con johana torres en 2019"
    });

    expect(calls).toBe(2);
    expect(review.deterministicWarnings.some((w) => w.includes("Fallback extraction applied"))).toBe(true);
  });

  it("uses local deterministic engine for resolution (no second AI stage)", async () => {
    const settings = createDefaultAiSettings();
    settings.executionMode = "gemini_only";
    settings.fallbackEnabled = false;

    aiInvokeProviderMock.mockResolvedValue({
      provider: "gemini",
      model: "gemini-2.5-flash",
      text: JSON.stringify(extractionV4({
        persons: [
          { tempId: "ANCHOR", name: "Juan Jesus", surname: "Nunez Mendoza", role: "focus", confidence: 0.98 },
          { tempId: "P2", name: "Johana", surname: "Torres", role: "spouse", confidence: 0.93 }
        ],
        relations: [{ type: "spouse", from: "ANCHOR", to: "P2", confidence: 0.92 }],
        familyFacts: [{ type: "MARR", date: "2019", spouses: ["ANCHOR", "P2"], confidence: 0.9 }]
      }))
    });

    const review = await runAiPipeline({
      document: doc(),
      settings,
      context: { kind: "local", anchorPersonId: "@I1@" },
      text: "se caso con johana torres en 2019"
    });

    expect(aiInvokeProviderMock).toHaveBeenCalledTimes(1);
    expect(review.usedModels?.resolution).toBe("code_engine_v5");
    expect(review.resolution?.resolutionSource).toBe("code_engine_v5");
  });

  it("uses local heuristic extraction when AI extraction remains empty on genealogical text", async () => {
    const settings = createDefaultAiSettings();
    settings.executionMode = "gemini_only";
    settings.fallbackEnabled = false;

    aiInvokeProviderMock.mockResolvedValue({
      provider: "gemini",
      model: "gemini-2.5-flash",
      text: JSON.stringify(extractionV4({ persons: [], familyFacts: [], personFacts: [], relations: [], confidence: 0.1 }))
    });

    const review = await runAiPipeline({
      document: doc(),
      settings,
      context: { kind: "local", anchorPersonId: "@I1@" },
      text: "se caso en 2018 con sofia"
    });

    expect(review.deterministicWarnings.some((w) => w.includes("Extraccion IA insuficiente"))).toBe(true);
    expect(review.extraction?.assumptions?.length).toBeGreaterThan(0);
  });

  it("is deterministic on equal input and mocks (ignoring runId/timestamps)", async () => {
    const settings = createDefaultAiSettings();
    settings.executionMode = "gemini_only";
    settings.fallbackEnabled = false;

    aiInvokeProviderMock.mockResolvedValue({
      provider: "gemini",
      model: "gemini-2.5-flash",
      text: JSON.stringify(extractionV4())
    });

    const first = await runAiPipeline({
      document: doc(),
      settings,
      context: { kind: "local", anchorPersonId: "@I1@" },
      text: "juan jesus"
    });

    const second = await runAiPipeline({
      document: doc(),
      settings,
      context: { kind: "local", anchorPersonId: "@I1@" },
      text: "juan jesus"
    });

    expect(JSON.stringify(first.items)).toBe(JSON.stringify(second.items));
  });

  it("detects focus in global mode and returns candidates for confirmation", async () => {
    const settings = createDefaultAiSettings();
    settings.executionMode = "gemini_only";

    aiInvokeProviderMock.mockResolvedValue({
      provider: "gemini",
      model: "gemini-2.5-flash",
      text: JSON.stringify({
        focusName: "Juan Jesus Nunez Mendoza",
        confidence: 0.91,
        alternatives: ["Mateo Lopez"],
        notes: ["ok"]
      })
    });

    const focus = await runAiGlobalFocusDetection({
      document: doc(),
      settings,
      text: "Juan Jesus Nunez Mendoza se caso con Johana"
    });

    expect(focus.requiresConfirmation).toBe(true);
    expect(focus.candidates.length).toBeGreaterThan(0);
    expect(focus.topCandidateId).toBe("@I1@");
  });

  it("throws a summarized stage error with HTTP codes when providers fail extraction", async () => {
    const settings = createDefaultAiSettings();
    settings.executionMode = "chatgpt_only";
    settings.fallbackEnabled = true;
    settings.retryPolicy.maxRetries = 0;

    aiInvokeProviderMock.mockImplementation(async (request: AiInvokeProviderRequest) => {
      if (request.provider === "chatgpt") {
        throw new Error("HTTP_400: invalid_request_error");
      }
      throw new Error("HTTP_429: RESOURCE_EXHAUSTED");
    });

    await expect(runAiPipeline({
      document: doc(),
      settings,
      context: { kind: "local", anchorPersonId: "@I1@" },
      text: "mensaje"
    })).rejects.toThrow("AI_STAGE_EXTRACTION_FAILED: chatgpt(400), gemini(429)");
  });

  it("includes structured diagnostics in stage errors", async () => {
    const settings = createDefaultAiSettings();
    settings.executionMode = "chatgpt_only";
    settings.fallbackEnabled = false;
    settings.retryPolicy.maxRetries = 0;

    aiInvokeProviderMock.mockImplementation(async () => {
      throw new Error("HTTP_429: provider=chatgpt; reason=rate_limit_exceeded; details=boom");
    });

    try {
      await runAiPipeline({
        document: doc(),
        settings,
        context: { kind: "local", anchorPersonId: "@I1@" },
        text: "mensaje"
      });
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(AiPipelineStageError);
      const stageError = error as AiPipelineStageError;
      expect(stageError.diagnostics.length).toBe(1);
      expect(stageError.diagnostics[0].statusCode).toBe(429);
      expect(stageError.diagnostics[0].reasonShort).toBe("rate_limit_exceeded");
      expect(stageError.diagnostics[0].elapsedMs).toBeTypeOf("number");
      expect(stageError.runId.startsWith("airun_")).toBe(true);
    }
  });
});

