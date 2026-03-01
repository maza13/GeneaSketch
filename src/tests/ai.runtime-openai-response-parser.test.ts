import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiInvokeProviderRequest } from "@/types/ai";
import { webAiInvokeProvider } from "@/services/aiWebBridge";

type MockResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

function mockResponse(status: number, body: unknown): MockResponse {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => payload
  };
}

describe("web ai runtime - openai responses parser", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    if (!globalThis.localStorage) {
      let storage = new Map<string, string>();
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => {
          storage = new Map<string, string>();
        }
      });
    }
    globalThis.localStorage.setItem(
      "geneasketch_ai_credentials",
      JSON.stringify({ openaiApiKey: "sk-test-key", updatedAt: new Date().toISOString() })
    );
  });

  it("extracts text from responses output content", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        id: "resp_1",
        status: "completed",
        output: [
          {
            content: [{ type: "output_text", text: "{\"minYear\":1970,\"maxYear\":1976,\"confidence\":0.8,\"verdict\":\"ok\",\"notes\":[]}" }]
          }
        ]
      })
    );

    const request: AiInvokeProviderRequest = {
      provider: "chatgpt",
      model: "gpt-5-nano",
      systemPrompt: "system",
      userPrompt: "user",
      maxOutputTokens: 200,
      preferredApi: "auto"
    };

    const response = await webAiInvokeProvider(request);
    expect(response.apiUsed).toBe("responses");
    expect(response.text).toContain("\"minYear\":1970");
  });

  it("falls back to chat completions when responses is incompatible", async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockResponse(400, {
          error: { message: "Unsupported parameter for responses API", code: "unsupported_value" }
        })
      )
      .mockResolvedValueOnce(
        mockResponse(200, {
          choices: [
            {
              finish_reason: "stop",
              message: { content: "{\"minYear\":1968,\"maxYear\":1974,\"confidence\":0.71,\"verdict\":\"fallback\",\"notes\":[]}" }
            }
          ]
        })
      );

    const response = await webAiInvokeProvider({
      provider: "chatgpt",
      model: "gpt-4o-mini",
      systemPrompt: "system",
      userPrompt: "user",
      maxOutputTokens: 200,
      temperature: 0,
      preferredApi: "auto"
    });

    expect(response.apiUsed).toBe("chat_completions");
    expect(response.providerWarnings?.some((item) => item.includes("responses_fallback_reason"))).toBe(true);
  });

  it("extracts text from chat completions content array", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: [
                { type: "output_text", text: "{\"minYear\":1971,\"maxYear\":1979" },
                { type: "output_text", text: ",\"confidence\":0.62,\"verdict\":\"array\",\"notes\":[]}" }
              ]
            }
          }
        ]
      })
    );

    const response = await webAiInvokeProvider({
      provider: "chatgpt",
      model: "gpt-4o",
      systemPrompt: "system",
      userPrompt: "user",
      maxOutputTokens: 200,
      preferredApi: "chat_completions"
    });

    expect(response.apiUsed).toBe("chat_completions");
    expect(response.text).toContain("\"verdict\":\"array\"");
  });

  it("keeps finishReason and rawBody when chat completion ends by length without content", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        choices: [
          {
            finish_reason: "length",
            message: { content: "", refusal: null, annotations: [] }
          }
        ]
      })
    );

    const response = await webAiInvokeProvider({
      provider: "chatgpt",
      model: "gpt-5-nano",
      systemPrompt: "system",
      userPrompt: "user",
      maxOutputTokens: 200,
      preferredApi: "chat_completions"
    });

    expect(response.finishReason).toBe("length");
    expect(response.rawBody).toContain("\"finish_reason\":\"length\"");
    expect(response.text).toBe("");
  });
});
