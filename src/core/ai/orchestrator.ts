import { safeParseJson } from "@/core/ai/parsing";
import {
  buildExtractionPromptsGlobalFocusOnly,
  buildExtractionPromptsLocal,
  buildFallbackExtractionPromptsLocal
} from "@/core/ai/prompts";
import { buildReviewItems } from "@/core/ai/review";
import { normalizeActionsWithSafety } from "@/core/ai/safety";
import { tryFastTrack } from "@/core/ai/fastTrack";
import { normalizePlace } from "@/core/ai/normalization";
import { heuristicExtractionFromText, resolveExtractionToResolution } from "@/core/ai/resolutionEngine";
import { rankFocusCandidatesByName } from "@/core/ai/matching";
import { aiInvokeProvider } from "@/services/aiRuntime";
import { aiUsageService } from "@/services/aiUsageService";
import type {
  AiDiagnosticEntry,
  AiAttributeConflict,
  AiExecutionMode,
  AiExtractionV4,
  AiGlobalFocusDetection,
  AiInputContext,
  AiPersonInput,
  AiProvider,
  AiProviderErrorLog,
  AiProviderTrace,
  AiReviewDraft,
  AiSettings,
  AiStage,
  AiResolvedAction
} from "@/types/ai";
import type { GeneaDocument } from "@/types/domain";

type RunParams = {
  document: GeneaDocument;
  settings: AiSettings;
  context: AiInputContext;
  text: string;
  onProgress?: (message: string) => void;
};

type StageResult = {
  text: string;
  trace: AiProviderTrace;
  diagnostics: AiDiagnosticEntry[];
};

type StageFailure = {
  stage: AiStage;
  summary: string;
  details: string;
  diagnostics: AiDiagnosticEntry[];
};

const RETRY_DELAY_MAX_MS = 45_000;
const MAX_429_RETRIES_PER_PROVIDER = 1;
type QuotaScope = "model_minute" | "model_day" | "project_minute" | "unknown";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class AiPipelineStageError extends Error {
  stage: AiStage;
  runId: string;
  diagnostics: AiDiagnosticEntry[];

  constructor(runId: string, failure: StageFailure) {
    super(`AI_STAGE_${failure.stage.toUpperCase()}_FAILED: ${failure.summary}. details: ${failure.details}`);
    this.name = "AiPipelineStageError";
    this.stage = failure.stage;
    this.runId = runId;
    this.diagnostics = failure.diagnostics;
  }
}

function stageProvider(mode: AiExecutionMode, stage: AiStage): AiProvider {
  if (mode === "chatgpt_only") return "chatgpt";
  if (mode === "gemini_only") return "gemini";
  return stage === "extraction" ? "chatgpt" : "gemini";
}

function alternateProvider(provider: AiProvider): AiProvider {
  return provider === "chatgpt" ? "gemini" : "chatgpt";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function statusFromErrorMessage(message: string): number | undefined {
  const match = message.match(/HTTP_(\d{3})/);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function reasonFromErrorMessage(message: string): string | undefined {
  const reasonMatch = message.match(/reason=([^;]+);/i);
  if (reasonMatch?.[1]) return reasonMatch[1].trim().toLowerCase();
  const lower = message.toLowerCase();
  if (lower.includes("insufficient_quota")) return "insufficient_quota";
  if (lower.includes("rate_limit_exceeded")) return "rate_limit_exceeded";
  if (lower.includes("resource_exhausted")) return "resource_exhausted";
  if (lower.includes("timeout") || lower.includes("timed out")) return "timeout";
  return undefined;
}

function quotaScopeFromErrorMessage(message: string): QuotaScope {
  const lower = message.toLowerCase();
  if (lower.includes("generaterequestsperday") || lower.includes("perday")) return "model_day";
  if (lower.includes("perminute") || lower.includes("generatecontentinputtokenspermodelperminute")) return "model_minute";
  return "unknown";
}

function quotaLimitZeroFromErrorMessage(message: string): boolean {
  return /limit:\s*0\b/i.test(message);
}

function extractQuotaSignals(message: string): {
  quotaScope: QuotaScope;
  quotaLimitZero: boolean;
  retryDelayMsHint?: number;
  nonRetryableQuota429: boolean;
} {
  const lowerMessage = message.toLowerCase();
  const quotaScope = quotaScopeFromErrorMessage(message);
  const quotaLimitZero = quotaLimitZeroFromErrorMessage(message);
  const reasonShort = reasonFromErrorMessage(message);
  const retryDelayMsHint = retryDelayFromErrorMessage(message);
  const nonRetryableQuota429 =
    reasonShort === "insufficient_quota" ||
    (reasonShort === "resource_exhausted" &&
      (quotaLimitZero || quotaScope === "model_day" || lowerMessage.includes("generaterequestsperday")));
  return { quotaScope, quotaLimitZero, retryDelayMsHint, nonRetryableQuota429 };
}

function shouldRetry(
  provider: AiProvider,
  statusCode: number | undefined,
  reasonShort: string | undefined,
  message: string,
  settings: AiSettings,
  attempt: number
): boolean {
  if (!statusCode) return false;
  if (!settings.retryPolicy.retryOnStatuses.includes(statusCode)) return false;
  if (provider === "gemini" && settings.geminiFreeTierMode && statusCode === 429) return false;
  const nonRetryableQuota = extractQuotaSignals(message).nonRetryableQuota429 || reasonShort === "insufficient_quota";
  if (nonRetryableQuota) return false;
  const configuredMax = Math.max(0, settings.retryPolicy.maxRetries);
  if (statusCode === 429) return attempt < Math.min(MAX_429_RETRIES_PER_PROVIDER, configuredMax);
  return attempt < configuredMax;
}

function retryDelayFromErrorMessage(message: string): number | undefined {
  const direct = message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i);
  if (direct?.[1]) {
    const seconds = Number(direct[1]);
    if (Number.isFinite(seconds) && seconds > 0) return Math.round(seconds * 1000);
  }

  const textHint = message.match(/Please retry in (\d+(?:\.\d+)?)s/i);
  if (textHint?.[1]) {
    const seconds = Number(textHint[1]);
    if (Number.isFinite(seconds) && seconds > 0) return Math.round(seconds * 1000);
  }

  return undefined;
}

function resolveRetryDelayMs(
  attempt: number,
  settings: AiSettings,
  statusCode: number | undefined,
  message: string
): number {
  const baseDelay = settings.retryPolicy.baseDelayMs * (attempt + 1);
  if (statusCode !== 429) return baseDelay;
  const hintedDelay = retryDelayFromErrorMessage(message) ?? 0;
  return Math.min(RETRY_DELAY_MAX_MS, Math.max(baseDelay, hintedDelay));
}

function geminiAlternativeModels(settings: AiSettings, currentModel: string): string[] {
  const catalog = settings.modelCatalog.gemini || [];
  const preferred = catalog.find((entry) => entry.recommended)?.id;
  const regular = catalog.filter((entry) => !entry.isPreview).map((entry) => entry.id);
  const preview = catalog.filter((entry) => entry.isPreview).map((entry) => entry.id);
  const ordered = [preferred, ...regular, ...preview].filter((value): value is string => Boolean(value));
  const deduped: string[] = [];
  for (const candidate of ordered) {
    if (candidate === currentModel) continue;
    if (!deduped.includes(candidate)) deduped.push(candidate);
  }
  return deduped;
}

function summarizeProviderErrors(providerErrors: AiProviderErrorLog[]): string {
  const latestByProvider = new Map<AiProvider, number | undefined>();
  for (const error of providerErrors) {
    latestByProvider.set(error.provider, error.statusCode);
  }
  return Array.from(latestByProvider.entries())
    .map(([provider, statusCode]) => `${provider}(${statusCode ?? "n/a"})`)
    .join(", ");
}

function redactForDiagnostic(message: string): string {
  return message
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/\bsk-[a-zA-Z0-9_-]+\b/g, "[REDACTED_TOKEN]")
    .replace(/\bAIza[0-9A-Za-z\-_]+\b/g, "[REDACTED_TOKEN]");
}

async function invokeWithFailover(
  settings: AiSettings,
  stage: AiStage,
  preferredProvider: AiProvider,
  systemPrompt: string,
  userPrompt: string,
  runId: string,
  context: AiInputContext,
  textLength: number
): Promise<StageResult> {
  const providers = settings.fallbackEnabled ? [preferredProvider, alternateProvider(preferredProvider)] : [preferredProvider];
  const providerErrors: AiProviderErrorLog[] = [];
  const diagnostics: AiDiagnosticEntry[] = [];

  for (const provider of providers) {
    const modelsToTry = [settings.providerModels[provider]];
    const geminiAlternatives = provider === "gemini" ? geminiAlternativeModels(settings, modelsToTry[0]) : [];
    let autoSwitchAttempted = false;
    let modelAutoSwitchedFrom: string | undefined;
    let modelAutoSwitchedTo: string | undefined;
    let retriesUsed = 0;

    for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex += 1) {
      const model = modelsToTry[modelIndex];
      const maxRetries = Math.max(0, settings.retryPolicy.maxRetries);
      let switchedModel = false;

      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const attemptStartedAt = Date.now();
        try {
          retriesUsed = Math.max(retriesUsed, attempt);
          const mid = model.toLowerCase();
          const catalog = provider === "chatgpt" ? settings.modelCatalog.chatgpt : settings.modelCatalog.gemini;
          const isRestricted =
            catalog.find((e) => e.id === model)?.isReasoning ||
            mid.startsWith("o") ||
            mid.startsWith("gpt-5");

          const response = await aiInvokeProvider({
            provider,
            model,
            systemPrompt,
            userPrompt,
            maxOutputTokens: stage === "extraction" ? settings.tokenLimits.extraction : settings.tokenLimits.resolution,
            temperature: isRestricted ? undefined : 0
          });

          if (response.usage) {
            aiUsageService.saveRecord({
              provider,
              model,
              inputTokens: response.usage.prompt_tokens,
              outputTokens: response.usage.completion_tokens,
              useCase: stage
            }, settings);
          }

          return {
            text: response.text,
            diagnostics,
            trace: {
              stage,
              provider,
              model,
              fallbackFrom: provider !== preferredProvider ? preferredProvider : undefined,
              retries: retriesUsed,
              autoSwitchAttempted,
              modelAutoSwitchedFrom,
              modelAutoSwitchedTo,
              errors: providerErrors.filter((item) => item.provider === provider && item.stage === stage)
            }
          };
        } catch (error) {
          retriesUsed = Math.max(retriesUsed, attempt);
          const attemptEndedAt = Date.now();
          const elapsedMs = attemptEndedAt - attemptStartedAt;
          const message = error instanceof Error ? error.message : String(error);
          const statusCode = statusFromErrorMessage(message);
          const reasonShort = reasonFromErrorMessage(message);
          const isTimeout = /timeout|timed out/i.test(message);
          const providerRetryCount = providerErrors.filter((item) => item.provider === provider && item.stage === stage).length;
          const quota = extractQuotaSignals(message);

          providerErrors.push({
            provider,
            stage,
            statusCode,
            reasonShort,
            quotaScope: quota.quotaScope,
            quotaLimitZero: quota.quotaLimitZero,
            retryDelayMsHint: quota.retryDelayMsHint,
            isTimeout,
            elapsedMs,
            attempt,
            message
          });

          diagnostics.push({
            timestamp: new Date().toISOString(),
            runId,
            stage,
            provider,
            model,
            statusCode,
            reasonShort,
            quotaScope: quota.quotaScope,
            quotaLimitZero: quota.quotaLimitZero,
            retryDelayMsHint: quota.retryDelayMsHint,
            isTimeout,
            elapsedMs,
            retryCount: providerRetryCount,
            fallbackFrom: provider !== preferredProvider ? preferredProvider : undefined,
            modelAutoSwitchedFrom,
            modelAutoSwitchedTo,
            autoSwitchAttempted,
            contextKind: context.kind,
            textLength,
            messageRedacted: redactForDiagnostic(message),
            technicalDetailRedacted: redactForDiagnostic(message)
          });

          const canSwitchModel =
            provider === "gemini" &&
            statusCode === 429 &&
            quota.nonRetryableQuota429 &&
            !autoSwitchAttempted &&
            geminiAlternatives.length > 0;
          if (canSwitchModel) {
            const nextModel = geminiAlternatives.shift();
            if (nextModel) {
              autoSwitchAttempted = true;
              modelAutoSwitchedFrom = model;
              modelAutoSwitchedTo = nextModel;
              modelsToTry.push(nextModel);
              switchedModel = true;
              break;
            }
          }

          const isRetry = shouldRetry(provider, statusCode, reasonShort, message, settings, attempt);
          if (isRetry) {
            const delay = resolveRetryDelayMs(attempt, settings, statusCode, message);
            await sleep(delay);
            continue;
          }
          break;
        }
      }

      if (switchedModel) {
        continue;
      }
    }
  }

  const summary = summarizeProviderErrors(providerErrors);
  const details = providerErrors.map((error) => `${error.provider}:${error.statusCode || "n/a"}:${error.message}`).join(" | ");
  throw {
    stage,
    summary,
    details,
    diagnostics
  } satisfies StageFailure;
}

function tryExtractUserMessage(text: string): string | undefined {
  const match = text.match(/"userMessage"\s*:\s*"([^"]+)"/i);
  if (match?.[1]) return match[1];

  const snippet = text.slice(0, 1000);
  if (snippet.includes("{") && snippet.includes("}")) {
    const innerMatch = snippet.match(/"userMessage"\s*:\s*"([^"]*)"/);
    if (innerMatch?.[1]) return innerMatch[1];
  }

  if (!text.trim().startsWith("{") && !text.trim().includes("```json")) {
    return text.trim().slice(0, 400);
  }
  return undefined;
}

function fallbackExtraction(text: string, context: AiInputContext, rawAiResponse?: string): AiExtractionV4 {
  const focusName =
    context.kind === "local" ? context.anchorLabel || context.anchorPersonId : "Persona foco";
  const [name, ...surnameParts] = focusName.trim().split(/\s+/);
  return {
    focus: {
      name: focusName,
      idHint: context.kind === "local" ? "ANCHOR" : undefined,
      confidence: context.kind === "local" ? 0.9 : 0.3
    },
    persons: context.kind === "local"
      ? [{
        tempId: "ANCHOR",
        name: name || focusName,
        surname: surnameParts.join(" ") || undefined,
        role: "focus",
        confidence: 0.9
      }]
      : [],
    familyFacts: [],
    personFacts: [],
    relations: [],
    rawText: text,
    confidence: 0.1,
    assumptions: ["Fallback extraction vacia por respuesta no parseable."],
    userMessage: rawAiResponse ? tryExtractUserMessage(rawAiResponse) : undefined
  };
}

function looksGenealogicalIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(nacio|nac[ií]o|murio|fallecio|defuncion|se caso|cas[oó]|hijo|hija|padre|madre|abuelo|abuela|esposa|esposo|pareja|reside|vive)\b/.test(lower);
}

function extractionHasData(extraction: AiExtractionV4): boolean {
  const personCount = extraction.persons?.length || 0;
  const informativePersons = extraction.persons?.filter((person) => person.tempId !== "ANCHOR").length || 0;
  const personFacts = extraction.personFacts?.length || 0;
  const familyFacts = extraction.familyFacts?.length || 0;
  const relations = extraction.relations?.length || 0;
  const hasOnlyAnchor = personCount === 1 && informativePersons === 0;
  return (
    relations > 0 ||
    familyFacts > 0 ||
    personFacts > 0 ||
    informativePersons > 0 ||
    (personCount > 0 && !hasOnlyAnchor && Boolean(extraction.focus?.name?.trim()))
  );
}

function consistencyCheckExtraction(extraction: AiExtractionV4): string[] {
  const issues: string[] = [];
  extraction.familyFacts.forEach((event, index) => {
    if (!event.spouses || event.spouses.length !== 2 || !event.spouses[0] || !event.spouses[1]) {
      issues.push(`Hecho familiar #${index + 1} (${event.type}) sin spouses completos.`);
    }
  });
  extraction.relations.forEach((relation, index) => {
    if (!relation.from || !relation.to) {
      issues.push(`Relacion #${index + 1} (${relation.type}) incompleta.`);
    }
  });
  return issues;
}

function actionSortRank(action: AiResolvedAction): number {
  if (action.kind === "create_person") return 0;
  if (action.kind === "create_relation") return 1;
  if (action.kind === "update_family") return 2;
  if (action.kind === "update_person") return 3;
  if (action.kind === "delete_person" || action.kind === "delete_relation" || action.kind === "delete_family") return 4;
  return 5;
}

function sortActionsDeterministically(actions: AiResolvedAction[]): AiResolvedAction[] {
  return [...actions].sort((left, right) => {
    const rankDelta = actionSortRank(left) - actionSortRank(right);
    if (rankDelta !== 0) return rankDelta;
    return JSON.stringify(left).localeCompare(JSON.stringify(right));
  });
}

async function applyLocalPlaceNormalization(draft: AiReviewDraft): Promise<void> {
  for (const item of draft.items) {
    const action = item.action;
    if (action.kind !== "update_person") continue;

    const patch = action.patch;
    const placeKeys: Array<keyof typeof patch> = ["birthPlace", "deathPlace", "residence"];
    for (const key of placeKeys) {
      const value = patch[key];
      if (typeof value === "string" && value.trim()) {
        const normalized = await normalizePlace(value);
        if (normalized && normalized !== value) {
          if (key === "birthPlace") patch.birthPlace = normalized;
          if (key === "deathPlace") patch.deathPlace = normalized;
          if (key === "residence") patch.residence = normalized;
        }
      }
    }
  }
}

export async function runAiPipeline(params: RunParams): Promise<AiReviewDraft> {
  const runId = `airun_${Date.now()}`;
  const extractionPref = params.settings.useCaseModels?.extraction;
  const extractionProvider = stageProvider(params.settings.executionMode, "extraction");
  const extractionModel = extractionPref?.model ?? params.settings.providerModels[extractionProvider];

  const providerTrace: AiProviderTrace[] = [];
  const warnings: string[] = [];
  const deterministicWarnings: string[] = [];
  const textLength = params.text.length;

  if (params.context.kind !== "local") {
    throw new Error("V5 requires local confirmed focus. Use runAiGlobalFocusDetection first.");
  }
  const anchor = params.document.persons[params.context.anchorPersonId];
  const anchorLabel = anchor
    ? `${anchor.name || ""}${anchor.surname ? ` ${anchor.surname}` : ""}`.trim()
    : params.context.anchorLabel || params.context.anchorPersonId;

  const usedContext: AiInputContext = {
    kind: "local",
    anchorPersonId: params.context.anchorPersonId,
    anchorLabel
  };

  const fastTrackResult = tryFastTrack(params.text, usedContext, params.document);
  if (fastTrackResult) {
    const enrichedFastTrack: AiReviewDraft = {
      ...fastTrackResult,
      deterministicProfile: "det_v1",
      deterministicWarnings: []
    };
    await applyLocalPlaceNormalization(enrichedFastTrack);
    return enrichedFastTrack;
  }

  const extractionPrompts = buildExtractionPromptsLocal(params.text, usedContext.anchorLabel || usedContext.anchorPersonId);

  params.onProgress?.(`Extrayendo entidades con ${extractionModel}...`);
  let extractionResponse: StageResult;
  try {
    extractionResponse = await invokeWithFailover(
      params.settings,
      "extraction",
      extractionProvider,
      extractionPrompts.system,
      extractionPrompts.user,
      runId,
      usedContext,
      textLength
    );
  } catch (error) {
    throw new AiPipelineStageError(runId, error as StageFailure);
  }
  providerTrace.push(extractionResponse.trace);

  let extraction = safeParseJson<AiExtractionV4>(extractionResponse.text) || fallbackExtraction(params.text, usedContext, extractionResponse.text);

  if (!extractionHasData(extraction) && looksGenealogicalIntent(params.text)) {
    deterministicWarnings.push("Fallback extraction applied due to weak first extraction.");
    const fallbackPrompts = buildFallbackExtractionPromptsLocal(params.text, usedContext.anchorLabel || usedContext.anchorPersonId);
    try {
      const fallbackResponse = await invokeWithFailover(
        params.settings,
        "extraction",
        extractionProvider,
        fallbackPrompts.system,
        fallbackPrompts.user,
        runId,
        usedContext,
        textLength
      );
      providerTrace.push(fallbackResponse.trace);
      extraction = safeParseJson<AiExtractionV4>(fallbackResponse.text) || extraction;
    } catch (error) {
      throw new AiPipelineStageError(runId, error as StageFailure);
    }
  }

  if (!extractionHasData(extraction) && looksGenealogicalIntent(params.text)) {
    extraction = heuristicExtractionFromText(params.text, usedContext);
    const warning = "Extraccion IA insuficiente; se aplico parser local heuristico.";
    warnings.push(warning);
    deterministicWarnings.push(warning);
  }

  const extractionConsistencyIssues = consistencyCheckExtraction(extraction);
  if (extractionConsistencyIssues.length > 0) {
    const issueText = `Extraccion inconsistente: ${extractionConsistencyIssues.join(" | ")}`;
    warnings.push(issueText);
    deterministicWarnings.push(issueText);
  }

  params.onProgress?.("Resolviendo identidades y acciones con motor local...");
  const resolution = resolveExtractionToResolution(params.document, extraction, usedContext, extractionConsistencyIssues);

  const sortedActions = sortActionsDeterministically(resolution.actions);
  const safety = normalizeActionsWithSafety(params.document, sortedActions);
  warnings.push(...safety.warnings);

  const enrichedActions = safety.actions.map((action) => {
    if (action.kind === "update_person" && action.personId) {
      const person = params.document.persons[action.personId];
      if (person) {
        const conflicts: AiAttributeConflict[] = [];
        const patch = action.patch;
        const normalized = action.normalizedPlaces || {};

        const checkField = (field: keyof AiPersonInput, gedcomValue: string | undefined, suggested: string | undefined, label: string) => {
          if (suggested && suggested !== gedcomValue) {
            conflicts.push({
              attribute: label,
              currentValue: gedcomValue || "(vacio)",
              suggestedValue: suggested,
              isNormalized: Boolean(normalized[field as keyof typeof normalized]),
              accepted: gedcomValue === undefined
            });
          }
        };

        checkField("birthDate", person.birthDate, patch.birthDate, "Fecha de nacimiento");
        checkField("birthPlace", person.birthPlace, patch.birthPlace, "Lugar de nacimiento");
        checkField("deathDate", person.deathDate, patch.deathDate, "Fecha de defuncion");
        checkField("deathPlace", person.deathPlace, patch.deathPlace, "Lugar de defuncion");
        checkField("residence", person.residence, patch.residence, "Lugar de residencia");

        return {
          ...action,
          originalValues: {
            birthDate: person.birthDate,
            birthPlace: person.birthPlace,
            deathDate: person.deathDate,
            deathPlace: person.deathPlace,
            residence: person.residence
          },
          isConflict: conflicts.length > 0,
          attributeConflicts: conflicts
        } as typeof action;
      }
    }
    return action;
  });

  const reviewItems = buildReviewItems(params.document, enrichedActions, usedContext.kind, safety.annotations);

  const finalItems = reviewItems.map((item) => {
    let stepIndex = 3;
    if (item.kind === "update_person" && !item.attributeConflicts?.length) stepIndex = 0;
    if (item.kind === "create_person") stepIndex = 1;
    if (item.attributeConflicts && item.attributeConflicts.length > 0) stepIndex = 2;
    if (item.kind === "create_relation" && item.action.kind === "create_relation" && item.action.createRelatedIfMissing) {
      stepIndex = 1;
    }
    return { ...item, stepIndex };
  });

  const draft: AiReviewDraft = {
    runId,
    context: usedContext,
    executionMode: params.settings.executionMode,
    informantName: resolution.informantName || "No identificado",
    extraction,
    resolution: { ...resolution, actions: enrichedActions },
    items: finalItems,
    warnings,
    deterministicProfile: "det_v1",
    deterministicWarnings,
    userMessage: resolution.userMessage || extraction.userMessage,
    usedModels: {
      extraction: extractionModel,
      resolution: "code_engine_v5"
    },
    providerTrace,
    createdAt: new Date().toISOString()
  };

  await applyLocalPlaceNormalization(draft);
  params.onProgress?.("Borrador listo para revision.");

  return draft;
}

export async function runAiGlobalFocusDetection(params: Omit<RunParams, "context">): Promise<AiGlobalFocusDetection> {
  const runId = `airun_focus_${Date.now()}`;
  const extractionPref = params.settings.useCaseModels?.extraction;
  const extractionProvider = stageProvider(params.settings.executionMode, "extraction");
  const extractionModel = extractionPref?.model ?? params.settings.providerModels[extractionProvider];
  const prompts = buildExtractionPromptsGlobalFocusOnly(params.text);

  let result: StageResult;
  try {
    result = await invokeWithFailover(
      params.settings,
      "extraction",
      extractionProvider,
      prompts.system,
      prompts.user,
      runId,
      { kind: "global" },
      params.text.length
    );
  } catch (error) {
    throw new AiPipelineStageError(runId, error as StageFailure);
  }

  const parsed = safeParseJson<{
    focusName?: string | null;
    confidence?: number;
    alternatives?: string[];
    notes?: string[];
  }>(result.text);

  const extractedFocusName = parsed?.focusName?.trim() || null;
  const candidates = extractedFocusName
    ? rankFocusCandidatesByName(extractedFocusName, params.document)
    : [];

  return {
    extractedFocusName,
    confidence: clamp01(parsed?.confidence ?? (extractedFocusName ? 0.8 : 0.2)),
    candidates,
    topCandidateId: candidates[0]?.id,
    requiresConfirmation: true,
    notes: [
      ...(parsed?.notes || []),
      `Modelo deteccion foco: ${extractionModel}`
    ]
  };
}
