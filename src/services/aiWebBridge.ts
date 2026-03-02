import type {
    AiAppendDiagnosticLogRequest,
    AiCredentialPayload,
    AiCredentialStatus,
    AiDiagnosticEntry,
    AiInvokeProviderRequest,
    AiInvokeProviderResponse,
    AiListModelsRequest,
    AiListModelsResponse,
    AiReadDiagnosticLogResponse,
    AiValidateRequest,
    AiValidateResponse,
    AiModelCatalogEntry,
    AiProvider
} from "@/types/ai";

const STORAGE_KEY = "geneasketch_ai_credentials";
const LOG_MEMORY_MAX = 100;
let diagnosticLogs: AiDiagnosticEntry[] = [];

// --- Storage Utilities ---

function getStoredCredentials(): AiCredentialPayload & { updatedAt?: string } {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function saveStoredCredentials(creds: AiCredentialPayload & { updatedAt?: string }) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
}

function buildStatus(creds: AiCredentialPayload & { updatedAt?: string }): AiCredentialStatus {
    return {
        hasOpenAiKey: !!creds.openaiApiKey?.trim(),
        hasGeminiKey: !!creds.geminiApiKey?.trim(),
        updatedAt: creds.updatedAt
    };
}

// --- API Implementation ---

export async function webAiGetCredentialsStatus(): Promise<AiCredentialStatus> {
    return buildStatus(getStoredCredentials());
}

export async function webAiSaveCredentials(payload: AiCredentialPayload): Promise<AiCredentialStatus> {
    const current = getStoredCredentials();
    const next = {
        ...current,
        ...(payload.openaiApiKey !== undefined ? { openaiApiKey: payload.openaiApiKey } : {}),
        ...(payload.geminiApiKey !== undefined ? { geminiApiKey: payload.geminiApiKey } : {}),
        updatedAt: new Date().toISOString()
    };
    saveStoredCredentials(next);
    return buildStatus(next);
}

export async function webAiClearCredentials(): Promise<AiCredentialStatus> {
    localStorage.removeItem(STORAGE_KEY);
    return {
        hasOpenAiKey: false,
        hasGeminiKey: false,
        updatedAt: new Date().toISOString()
    };
}

export async function webAiListModels(request: AiListModelsRequest): Promise<AiListModelsResponse> {
    const chatgptModels: AiModelCatalogEntry[] = [
        { id: "gpt-5-nano", label: "OpenAI: GPT-5 Nano (★★★) ($0.05/$0.005/$0.40) (recomendado)", recommended: true, price: "$0.05", priceOut: "$0.40", intelligence: 3 },
        { id: "gpt-4o-mini", label: "OpenAI: GPT-4o Mini (★★★) ($0.15/$0.075/$0.60)", recommended: false, price: "$0.15", priceOut: "$0.60", intelligence: 3 },
        { id: "gpt-5-mini", label: "OpenAI: GPT-5 Mini (★★★★) ($0.25/$0.025/$2.00)", recommended: false, price: "$0.25", priceOut: "$2.00", intelligence: 4 },
        { id: "o4-mini", label: "OpenAI: o4-mini (★★★★) ($1.10/$0.28/$4.40)", recommended: false, price: "$1.10", priceOut: "$4.40", intelligence: 4, isReasoning: true },
        { id: "gpt-5.1", label: "OpenAI: GPT-5.1 (★★★★★) ($1.25/$0.125/$10.00)", recommended: false, price: "$1.25", priceOut: "$10.00", intelligence: 5 }
    ];

    const geminiModels: AiModelCatalogEntry[] = [
        { id: "gemini-2.0-flash", label: "Google: Gemini 2.0 Flash (★★★★) ($0.10/$0.025/$0.40)", recommended: false, price: "$0.10", priceOut: "$0.40", intelligence: 4 },
        { id: "gemini-2.5-flash", label: "Google: Gemini 2.5 Flash (★★★★) ($0.30/$0.03/$2.50) (recomendado)", recommended: true, price: "$0.30", priceOut: "$2.50", intelligence: 4 }
    ];

    return {
        provider: request.provider,
        models: request.provider === "chatgpt" ? chatgptModels : geminiModels,
        fetchedAt: new Date().toISOString()
    };
}

export async function webAiInvokeProvider(request: AiInvokeProviderRequest): Promise<AiInvokeProviderResponse> {
    const creds = getStoredCredentials();
    const provider = request.provider;

    if (provider === "chatgpt") {
        if (!creds.openaiApiKey) throw new Error("Missing OpenAI API Key");
        return invokeOpenAi(request, creds.openaiApiKey);
    } else {
        if (!creds.geminiApiKey) throw new Error("Missing Gemini API Key");
        return invokeGemini(request, creds.geminiApiKey);
    }
}

function extractChatCompletionsText(data: any): { text: string; finishReason?: string } {
    const choice = data?.choices?.[0];
    const finishReason = typeof choice?.finish_reason === "string" ? choice.finish_reason : undefined;
    const content = choice?.message?.content;
    if (typeof content === "string" && content.trim().length > 0) {
        return { text: content, finishReason };
    }
    if (Array.isArray(content)) {
        const text = content
            .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
            .filter((chunk: string) => chunk.trim().length > 0)
            .join("\n");
        if (text.trim().length > 0) {
            return { text, finishReason };
        }
    }
    if (typeof choice?.message?.refusal === "string" && choice.message.refusal.trim().length > 0) {
        return { text: `REFUSAL: ${choice.message.refusal}`, finishReason };
    }
    return { text: "", finishReason };
}

function extractResponsesText(data: any): { text: string; finishReason?: string } {
    if (typeof data?.output_text === "string" && data.output_text.trim().length > 0) {
        return { text: data.output_text, finishReason: data?.status };
    }
    if (Array.isArray(data?.output_text)) {
        const joined = data.output_text
            .map((item: any) => (typeof item === "string" ? item : ""))
            .join("\n")
            .trim();
        if (joined.length > 0) {
            return { text: joined, finishReason: data?.status };
        }
    }
    if (Array.isArray(data?.output)) {
        const chunks: string[] = [];
        for (const node of data.output) {
            if (!Array.isArray(node?.content)) continue;
            for (const part of node.content) {
                if (typeof part?.text === "string" && part.text.trim().length > 0) {
                    chunks.push(part.text);
                    continue;
                }
                if (typeof part?.refusal === "string" && part.refusal.trim().length > 0) {
                    chunks.push(`REFUSAL: ${part.refusal}`);
                }
            }
        }
        const text = chunks.join("\n").trim();
        if (text.length > 0) return { text, finishReason: data?.status };
    }
    return { text: "", finishReason: data?.status };
}

function parseHttpCode(message: string): number | null {
    const match = message.match(/HTTP_(\d{3})/);
    if (!match) return null;
    const code = Number(match[1]);
    return Number.isFinite(code) ? code : null;
}

function extractUsage(data: any, provider: AiProvider): { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined {
    if (provider === "chatgpt") {
        const usage = data?.usage;
        if (usage && typeof usage.prompt_tokens === "number") {
            return {
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens ?? 0,
                total_tokens: usage.total_tokens ?? (usage.prompt_tokens + (usage.completion_tokens ?? 0))
            };
        }
    } else if (provider === "gemini") {
        const usage = data?.usageMetadata;
        if (usage && typeof usage.promptTokenCount === "number") {
            return {
                prompt_tokens: usage.promptTokenCount,
                completion_tokens: usage.candidatesTokenCount ?? 0,
                total_tokens: usage.totalTokenCount ?? (usage.promptTokenCount + (usage.candidatesTokenCount ?? 0))
            };
        }
    }
    return undefined;
}

function isResponsesCompatError(message: string): boolean {
    const lower = message.toLowerCase();
    const code = parseHttpCode(message);
    if (code === 400 || code === 404 || code === 422) return true;
    return lower.includes("unsupported") || lower.includes("unknown") || lower.includes("not found");
}

function isRestrictedTemperatureModel(model: string): boolean {
    const normalized = model.trim().toLowerCase();
    return normalized.startsWith("gpt-5") || normalized.startsWith("o");
}

async function invokeOpenAiChatCompletions(req: AiInvokeProviderRequest, apiKey: string): Promise<AiInvokeProviderResponse> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: req.model,
            messages: [
                { role: "system", content: req.systemPrompt },
                { role: "user", content: req.userPrompt }
            ],
            max_completion_tokens: req.maxOutputTokens,
            ...(req.temperature !== undefined ? { temperature: req.temperature } : {})
        })
    });

    const rawBody = await response.text();
    if (!response.ok) {
        throw new Error(`HTTP_${response.status}: OpenAI error: ${rawBody}`);
    }
    const data = JSON.parse(rawBody);
    const parsed = extractChatCompletionsText(data);

    return {
        text: parsed.text,
        model: req.model,
        provider: "chatgpt",
        rawBody,
        apiUsed: "chat_completions",
        finishReason: parsed.finishReason,
        usage: extractUsage(data, "chatgpt")
    };
}

async function invokeOpenAiResponses(req: AiInvokeProviderRequest, apiKey: string): Promise<AiInvokeProviderResponse> {
    const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: req.model,
            input: [
                { role: "system", content: req.systemPrompt },
                { role: "user", content: req.userPrompt }
            ],
            max_output_tokens: req.maxOutputTokens,
            ...(req.temperature !== undefined ? { temperature: req.temperature } : {})
        })
    });

    const rawBody = await response.text();
    if (!response.ok) {
        throw new Error(`HTTP_${response.status}: OpenAI error: ${rawBody}`);
    }
    const data = JSON.parse(rawBody);
    const parsed = extractResponsesText(data);
    return {
        text: parsed.text,
        model: req.model,
        provider: "chatgpt",
        rawBody,
        apiUsed: "responses",
        finishReason: parsed.finishReason,
        usage: extractUsage(data, "chatgpt")
    };
}

async function invokeOpenAi(req: AiInvokeProviderRequest, apiKey: string): Promise<AiInvokeProviderResponse> {
    const preferred = req.preferredApi || "auto";
    const effectiveReq: AiInvokeProviderRequest = {
        ...req,
        temperature: isRestrictedTemperatureModel(req.model) ? undefined : req.temperature
    };
    if (preferred === "chat_completions") {
        return invokeOpenAiChatCompletions(effectiveReq, apiKey);
    }
    if (preferred === "responses") {
        return invokeOpenAiResponses(effectiveReq, apiKey);
    }
    try {
        const response = await invokeOpenAiResponses(effectiveReq, apiKey);
        if (response.text.trim().length > 0) return response;
        const fallback = await invokeOpenAiChatCompletions(effectiveReq, apiKey);
        return {
            ...fallback,
            providerWarnings: ["responses_empty_output_fallback_to_chat_completions"]
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isResponsesCompatError(message)) {
            const fallback = await invokeOpenAiChatCompletions(effectiveReq, apiKey);
            return {
                ...fallback,
                providerWarnings: [`responses_fallback_reason:${message}`]
            };
        }
        throw error;
    }
}

async function invokeGemini(req: AiInvokeProviderRequest, apiKey: string): Promise<AiInvokeProviderResponse> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: req.systemPrompt }] },
            contents: [{ parts: [{ text: req.userPrompt }] }],
            generation_config: {
                maxOutputTokens: req.maxOutputTokens,
                ...(req.temperature !== undefined ? { temperature: req.temperature } : {})
            }
        })
    });

    const rawBody = await response.text();
    if (!response.ok) {
        throw new Error(`HTTP_${response.status}: Gemini error: ${rawBody}`);
    }

    const data = JSON.parse(rawBody);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return {
        text,
        model: req.model,
        provider: "gemini",
        rawBody,
        apiUsed: "gemini_generate_content",
        usage: extractUsage(data, "gemini")
    };
}

export async function webAiValidateCredentials(request: AiValidateRequest): Promise<AiValidateResponse> {
    try {
        const mid = request.model.toLowerCase();
        const isRestricted = mid.startsWith("o") || mid.startsWith("gpt-5");

        await webAiInvokeProvider({
            ...request,
            systemPrompt: "You are a health-check endpoint. Return exactly PONG.",
            userPrompt: "ping",
            maxOutputTokens: 16,
            temperature: isRestricted ? undefined : 0.0,
            preferredApi: "auto"
        });
        return { valid: true, message: "Conexión OK.", statusCode: 200 };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            valid: false,
            message: `Error de validación: ${message}`,
            statusCode: message.includes("HTTP_") ? parseInt(message.match(/HTTP_(\d+)/)?.[1] || "500") : 500
        };
    }
}

export async function webAiAppendDiagnosticLog(request: AiAppendDiagnosticLogRequest): Promise<void> {
    diagnosticLogs.push(request.entry);
    if (diagnosticLogs.length > LOG_MEMORY_MAX) {
        diagnosticLogs.shift();
    }
}

export async function webAiReadDiagnosticLog(): Promise<AiReadDiagnosticLogResponse> {
    return {
        path: "memory://diagnostic_log",
        contents: diagnosticLogs.map(l => JSON.stringify(l)).join("\n")
    };
}
