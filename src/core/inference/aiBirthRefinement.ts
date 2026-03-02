import { buildBirthRangeRefinementCompactPrompt, buildBirthRangeRefinementPrompt } from "@/core/ai/prompts";
import { safeParseJson } from "@/core/ai/parsing";
import { aiInvokeProvider } from "@/services/aiRuntime";
import { aiUsageService } from "@/services/aiUsageService";
import { estimatePersonBirthYear } from "@/core/inference/dateInference";
import { planBirthAiContext } from "@/core/inference/aiBirthContextPlanner";
import { recommendBirthRefinementLevel } from "@/core/inference/intelligenceAdvisor";
import type {
  AiBirthRefinementLevel,
  AiBirthRefinementNotesScope,
  AiBirthRangeRefinementFact,
  AiBirthRefinementDebugTrace,
  AiBirthRangeRefinementFactsRequest,
  AiBirthRangeRefinementResult,
  AiSettings
} from "@/types/ai";
import type { GeneaDocument } from "@/types/domain";

export type RefineBirthRangeWithAiParams = {
  document: GeneaDocument;
  personId: string;
  settings: AiSettings;
  levelOverride?: AiBirthRefinementLevel;
  includeNotesOverride?: boolean;
};

type RefinementResponse = {
  minYear?: number;
  maxYear?: number;
  confidence?: number;
  verdict?: string;
  notes?: string[];
};

type LooseTextExtraction = {
  range?: [number, number];
  verdict?: string;
};

type RetryReason = "length" | "empty_output" | "parse_failure" | "invalid_format" | "invalid_year_domain" | "inverted_range";

type RefinementBudget = {
  attempts: Array<{ tokenBudget: number; compactPrompt: boolean; factsLimit: number }>;
};

function isGpt5Nano(model: string): boolean {
  return model.trim().toLowerCase().startsWith("gpt-5-nano");
}

function isGpt5Mini(model: string): boolean {
  return model.trim().toLowerCase().startsWith("gpt-5-mini");
}

function truncateForDebug(value: string, max = 1200): string {
  const normalized = value.trim();
  if (normalized.length === 0) return "[empty model output]";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}…`;
}

function safeParseLooseJson<T>(raw: string): { parsed: T | null; parseError?: string } {
  const strict = safeParseJson<T>(raw);
  if (strict) return { parsed: strict };

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    const parsedFence = safeParseJson<T>(fenced[1]);
    if (parsedFence) return { parsed: parsedFence };
  }

  const objectStart = raw.indexOf("{");
  const objectEnd = raw.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    const candidate = raw.slice(objectStart, objectEnd + 1);
    const parsedObject = safeParseJson<T>(candidate);
    if (parsedObject) return { parsed: parsedObject };
  }

  return { parsed: null, parseError: "No se pudo parsear JSON válido desde la respuesta del modelo." };
}

function extractLooseRangeAndVerdict(raw: string): LooseTextExtraction {
  const text = raw.trim();
  if (!text) return {};

  const betweenMatch = text.match(/\bBET\s+(\d{3,4})\s+AND\s+(\d{3,4})\b/i);
  if (betweenMatch) {
    const a = Number(betweenMatch[1]);
    const b = Number(betweenMatch[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return {
        range: [a, b],
        verdict: text.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim()
      };
    }
  }

  const spanMatch = text.match(/\b(\d{3,4})\s*(?:-|–|—|to|a|hasta|and)\s*(\d{3,4})\b/i);
  if (spanMatch) {
    const a = Number(spanMatch[1]);
    const b = Number(spanMatch[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return {
        range: [a, b],
        verdict: text.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim()
      };
    }
  }

  const verdictCandidate = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!verdictCandidate) return {};
  const verdict = verdictCandidate.slice(0, 2500);
  return { verdict };
}

export class BirthRefinementDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BirthRefinementDomainError";
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function toInt(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.round(value);
}

function isRestrictedTemperatureModel(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  return normalized.startsWith("gpt-5") || normalized.startsWith("o");
}

function isUnsupportedTemperatureError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("temperature") && message.includes("unsupported_value");
}

function extractRawFromError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const providerBody = message.match(/(?:OpenAI|Gemini)\s+error:\s*([\s\S]+)/i);
  if (providerBody?.[1]?.trim()) return providerBody[1].trim();
  return message.trim();
}

function formatSignedVerdict(verdict: string, provider: "chatgpt" | "gemini", model: string): string {
  const trimmed = verdict.trim().replace(/^veredicto:\s*/i, "");
  const base = trimmed.length > 0
    ? trimmed
    : "Rango propuesto por consistencia cronológica y contexto familiar disponible.";
  return `Veredicto: ${base} (Modelo: ${provider}:${model})`;
}

function validateRangeReason(minYear: number | undefined, maxYear: number | undefined): RetryReason | null {
  if (minYear === undefined || maxYear === undefined || !Number.isFinite(minYear) || !Number.isFinite(maxYear)) {
    return "invalid_format";
  }
  if (minYear > maxYear) return "inverted_range";
  const maxAllowed = new Date().getFullYear() + 2;
  if (minYear < 1200 || maxYear > maxAllowed) return "invalid_year_domain";
  return null;
}

function scoreFactForBirth(fact: AiBirthRangeRefinementFact): number {
  const rel = fact.relationToFocus;
  const event = fact.eventType;
  if (rel === "parent" && (event === "BIRT" || event === "DEAT")) return 100;
  if (rel === "focus" && event === "BIRT") return 95;
  if (event === "MARR" && (rel === "focus" || rel === "spouse")) return 90;
  if (rel === "child" && event === "BIRT") return 80;
  if (rel === "spouse" && (event === "BIRT" || event === "DEAT")) return 70;
  if (rel === "sibling" && (event === "BIRT" || event === "DEAT")) return 40;
  if (event === "NOTE") return 10;
  const base = 20;
  const layerFactor = fact.layer === 1 ? 1 : fact.layer === 2 ? 0.7 : 0.45;
  return Math.round(base * layerFactor);
}

export function rankBirthRefinementFacts(facts: AiBirthRangeRefinementFact[]): AiBirthRangeRefinementFact[] {
  return [...facts].sort((a, b) => {
    const scoreDelta = scoreFactForBirth(b) - scoreFactForBirth(a);
    if (scoreDelta !== 0) return scoreDelta;
    return a.reference.localeCompare(b.reference);
  });
}

function getRefinementBudget(level: AiBirthRefinementLevel, model: string): RefinementBudget {
  const nano = isGpt5Nano(model);
  const mini = isGpt5Mini(model);
  if (level === "simple") {
    return {
      attempts: nano
        ? [
          { tokenBudget: 5200, compactPrompt: false, factsLimit: 220 },
          { tokenBudget: 7200, compactPrompt: true, factsLimit: 160 },
          { tokenBudget: 9000, compactPrompt: true, factsLimit: 120 }
        ]
        : mini
          ? [
            { tokenBudget: 3600, compactPrompt: false, factsLimit: 220 },
            { tokenBudget: 5200, compactPrompt: true, factsLimit: 160 },
            { tokenBudget: 7200, compactPrompt: true, factsLimit: 120 }
          ]
        : [
          { tokenBudget: 600, compactPrompt: true, factsLimit: 90 },
          { tokenBudget: 900, compactPrompt: true, factsLimit: 80 },
          { tokenBudget: 1200, compactPrompt: true, factsLimit: 70 }
        ]
    };
  }
  if (level === "complex") {
    return {
      attempts: nano
        ? [
          { tokenBudget: 7200, compactPrompt: false, factsLimit: 260 },
          { tokenBudget: 9000, compactPrompt: true, factsLimit: 180 },
          { tokenBudget: 11000, compactPrompt: true, factsLimit: 140 }
        ]
        : mini
          ? [
            { tokenBudget: 5200, compactPrompt: false, factsLimit: 260 },
            { tokenBudget: 7200, compactPrompt: true, factsLimit: 180 },
            { tokenBudget: 9000, compactPrompt: true, factsLimit: 140 }
          ]
        : [
          { tokenBudget: 1200, compactPrompt: false, factsLimit: 240 },
          { tokenBudget: 1800, compactPrompt: true, factsLimit: 170 },
          { tokenBudget: 2400, compactPrompt: true, factsLimit: 130 }
        ]
    };
  }
  return {
    attempts: nano
      ? [
        { tokenBudget: 5200, compactPrompt: false, factsLimit: 220 },
        { tokenBudget: 7200, compactPrompt: true, factsLimit: 160 },
        { tokenBudget: 9000, compactPrompt: true, factsLimit: 120 }
      ]
      : mini
        ? [
          { tokenBudget: 3600, compactPrompt: false, factsLimit: 220 },
          { tokenBudget: 5200, compactPrompt: true, factsLimit: 160 },
          { tokenBudget: 7200, compactPrompt: true, factsLimit: 120 }
        ]
      : [
        { tokenBudget: 900, compactPrompt: false, factsLimit: 180 },
        { tokenBudget: 1300, compactPrompt: true, factsLimit: 140 },
        { tokenBudget: 1700, compactPrompt: true, factsLimit: 110 }
      ]
  };
}

function buildFallbackResult(
  minYear: number,
  maxYear: number,
  provider: "chatgpt" | "gemini",
  model: string,
  note: string,
  extras?: {
    verdict?: string;
    rawResponseText?: string;
    parseError?: string;
    extraNotes?: string[];
    debugTrace?: AiBirthRefinementDebugTrace;
  }
): AiBirthRangeRefinementResult {
  const extraNotes = extras?.extraNotes || [];
  return {
    minYear,
    maxYear,
    confidence: 0,
    verdict: formatSignedVerdict(extras?.verdict || "Se mantiene el rango local.", provider, model),
    notes: [note, ...extraNotes],
    rangeValidity: "invalid",
    rawResponseText: extras?.rawResponseText,
    parseError: extras?.parseError,
    model,
    provider,
    usedFallbackLocal: true,
    debugTrace: extras?.debugTrace
  };
}

function chooseBirthRefinementModel(settings: AiSettings, level: AiBirthRefinementLevel): { provider: "chatgpt" | "gemini"; model: string } {
  const byLevel = settings.birthRefinementLevelModels?.[level];
  if (byLevel?.provider && byLevel?.model) {
    return { provider: byLevel.provider, model: byLevel.model };
  }
  const legacy = settings.useCaseModels.birth_refinement;
  return { provider: legacy.provider, model: legacy.model };
}

function resolveNotesPolicy(
  settings: AiSettings,
  level: AiBirthRefinementLevel,
  includeNotesOverride?: boolean
): { includeNotes: boolean; scope: AiBirthRefinementNotesScope } {
  const defaultInclude = level === "simple" ? false : true;
  const includeNotes = includeNotesOverride ?? settings.birthRefinementIncludeNotesByLevel?.[level] ?? defaultInclude;
  if (!includeNotes || level === "simple") return { includeNotes: false, scope: "none" };
  const defaultScope: AiBirthRefinementNotesScope = level === "complex" ? "focus_parents_children" : "focus_only";
  return {
    includeNotes,
    scope: settings.birthRefinementNotesScopeByLevel?.[level] ?? defaultScope
  };
}

async function invokeRefinement(
  params: {
    provider: "chatgpt" | "gemini";
    model: string;
    systemPrompt: string;
    userPrompt: string;
    preferredApi?: "auto" | "responses" | "chat_completions";
    tokenBudget: number;
  },
  allowTemperature: boolean
) {
  return aiInvokeProvider({
    provider: params.provider,
    model: params.model,
    systemPrompt: params.systemPrompt,
    userPrompt: params.userPrompt,
    maxOutputTokens: params.tokenBudget,
    ...(allowTemperature ? { temperature: 0 } : {}),
    ...(params.provider === "chatgpt" ? { preferredApi: params.preferredApi || "auto" } : {})
  });
}

function buildRetryCorrectionUserPrompt(baseUserPrompt: string, reason: RetryReason): string {
  const guidance =
    reason === "invalid_year_domain"
      ? "La salida anterior tuvo años fuera de dominio válido (1200..año_actual+2). Corrige y devuelve JSON válido."
      : reason === "inverted_range"
        ? "La salida anterior tenía minYear > maxYear. Corrige y devuelve JSON válido."
        : reason === "invalid_format" || reason === "parse_failure"
          ? "La salida anterior no respetó el JSON esperado. Corrige y devuelve exactamente el esquema."
          : reason === "empty_output"
            ? "La salida anterior quedó vacía. Devuelve JSON válido con rango y justificación."
            : "Corrige formato y coherencia, devuelve JSON válido.";

  return `${baseUserPrompt}\n\n[CORRECCIÓN OBLIGATORIA]\n${guidance}`;
}

export async function refineBirthRangeWithAi(
  params: RefineBirthRangeWithAiParams
): Promise<AiBirthRangeRefinementResult> {
  const person = params.document.persons[params.personId];
  if (!person) {
    throw new BirthRefinementDomainError("Persona no encontrada para refinamiento.");
  }

  const local = estimatePersonBirthYear(params.personId, params.document, {
    estimatorVersion: params.settings.birthEstimatorVersion
  });
  if (!local) {
    throw new BirthRefinementDomainError("No hay inferencia local disponible.");
  }

  const localRange = local.suggestedRange
    ?? (local.suggestedYear !== undefined ? [local.suggestedYear, local.suggestedYear] as [number, number] : null);
  if (!localRange) {
    throw new BirthRefinementDomainError("No hay rango local utilizable para refinar.");
  }

  const recommendation = recommendBirthRefinementLevel(local);
  const selectedLevel: AiBirthRefinementLevel = params.levelOverride || params.settings.birthRefinementLevel || recommendation.recommendedLevel;
  const notesPolicy = resolveNotesPolicy(params.settings, selectedLevel, params.includeNotesOverride);
  const planned = planBirthAiContext({
    document: params.document,
    focusPersonId: person.id,
    level: selectedLevel,
    includeNotes: notesPolicy.includeNotes,
    notesScope: notesPolicy.scope,
    minimumSimpleDates: 3
  });
  const factualRequest: AiBirthRangeRefinementFactsRequest = {
    focusPersonId: person.id,
    focusPersonLabel: `${person.name}${person.surname ? ` ${person.surname}` : ""}`.trim() || person.id,
    focusSex: person.sex || "U",
    facts: planned.facts,
    contextStats: planned.contextStats
  };

  const selection = chooseBirthRefinementModel(params.settings, selectedLevel);
  const provider = selection.provider;
  const model = selection.model;
  const budget = getRefinementBudget(selectedLevel, model);
  const rankedFacts = rankBirthRefinementFacts(factualRequest.facts);
  const startedAtIso = new Date().toISOString();
  const startedAtMs = Date.now();

  try {
    let retryCount = 0;
    let retryReason: RetryReason | undefined;
    let lastRawDebug = "";
    let lastParseError: string | undefined;
    let lastResponseMeta: { apiUsed?: "responses" | "chat_completions" | "gemini_generate_content"; finishReason?: string; tokenBudget: number; inputFactsUsed: number } | null = null;
    let lastVerdict: string | undefined;

    const tryWithTemperature = !isRestrictedTemperatureModel(model);

    for (let attemptIndex = 0; attemptIndex < budget.attempts.length; attemptIndex += 1) {
      const attempt = budget.attempts[attemptIndex];
      const selectedFacts = rankedFacts.slice(0, attempt.factsLimit);
      const attemptRequest: AiBirthRangeRefinementFactsRequest = { ...factualRequest, facts: selectedFacts };
      const basePrompts = attempt.compactPrompt
        ? buildBirthRangeRefinementCompactPrompt(attemptRequest)
        : buildBirthRangeRefinementPrompt(attemptRequest);
      const userPrompt =
        attemptIndex > 0 && retryReason
          ? buildRetryCorrectionUserPrompt(basePrompts.user, retryReason)
          : basePrompts.user;

      let response;
      try {
        response = await invokeRefinement(
          {
            provider,
            model,
            systemPrompt: basePrompts.system,
            userPrompt,
            preferredApi: params.settings.openAiPreferredApi || "auto",
            tokenBudget: attempt.tokenBudget
          },
          tryWithTemperature
        );
      } catch (error) {
        if (tryWithTemperature && isUnsupportedTemperatureError(error)) {
          response = await invokeRefinement(
            {
              provider,
              model,
              systemPrompt: basePrompts.system,
              userPrompt,
              preferredApi: params.settings.openAiPreferredApi || "auto",
              tokenBudget: attempt.tokenBudget
            },
            false
          );
        } else {
          throw error;
        }
      }

      if (response.usage) {
        aiUsageService.saveRecord({
          provider,
          model,
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          useCase: "birth_refinement"
        }, params.settings);
      }

      const textForParse = response.text || "";
      const rawSource = textForParse.trim().length > 0 ? textForParse : (response.rawBody || textForParse);
      const rawDebug = params.settings.developerBirthRefinementShowRawUnfiltered
        ? (rawSource.trim().length > 0 ? rawSource : "[empty model output]")
        : truncateForDebug(rawSource);
      lastRawDebug = rawDebug;
      lastResponseMeta = {
        apiUsed: response.apiUsed,
        finishReason: response.finishReason,
        tokenBudget: attempt.tokenBudget,
        inputFactsUsed: selectedFacts.length
      };

      if (response.finishReason === "length") {
        retryReason = "length";
        retryCount += 1;
        continue;
      }
      if (textForParse.trim().length === 0) {
        retryReason = "empty_output";
        retryCount += 1;
        continue;
      }

      const parseAttempt = safeParseLooseJson<RefinementResponse>(textForParse);
      const parsed = parseAttempt.parsed;
      const loose = extractLooseRangeAndVerdict(rawSource);
      lastParseError = parseAttempt.parseError;
      lastVerdict = loose.verdict ? formatSignedVerdict(loose.verdict, provider, model) : undefined;

      if (!parsed) {
        if (loose.range) {
          const [minYear, maxYear] = loose.range;
          const invalidReason = validateRangeReason(minYear, maxYear);
          if (invalidReason) {
            retryReason = invalidReason;
            retryCount += 1;
            continue;
          }
          const notes: string[] = ["Se recuperó un rango desde respuesta IA no estructurada."];
          const elapsedMs = Math.max(0, Date.now() - startedAtMs);
          return {
            minYear,
            maxYear,
            confidence: 0.35,
            verdict: formatSignedVerdict(
              loose.verdict || "Rango recuperado desde respuesta IA en texto libre.",
              provider,
              model
            ),
            notes,
            rangeValidity: "valid",
            rawResponseText: rawDebug,
            parseError: parseAttempt.parseError,
            model,
            provider,
            usedFallbackLocal: false,
            debugTrace: {
              requestFactsCount: factualRequest.facts.length,
              inputFactsCount: factualRequest.facts.length,
              inputFactsUsed: selectedFacts.length,
              provider,
              model,
              apiUsed: response.apiUsed,
              finishReason: response.finishReason,
              tokenBudget: attempt.tokenBudget,
              retryCount,
              retryReason,
              selectedLevel,
              recommendedLevel: recommendation.recommendedLevel,
              layersUsed: planned.layersUsed,
              contextPolicyVersion: "v2_level_context",
              selectionSummary: planned.selectionTrace,
              notesIncluded: notesPolicy.includeNotes,
              notesScopeApplied: notesPolicy.scope,
              rawResponseText: rawDebug,
              parsed: false,
              parseError: parseAttempt.parseError,
              startedAt: startedAtIso,
              elapsedMs
            }
          };
        }
        retryReason = "parse_failure";
        retryCount += 1;
        continue;
      }

      let minYear = toInt(parsed.minYear);
      let maxYear = toInt(parsed.maxYear);
      const verdictRaw = typeof parsed.verdict === "string" && parsed.verdict.trim().length > 0
        ? parsed.verdict.trim()
        : "Rango IA calculado a partir del contexto factual.";
      const verdict = formatSignedVerdict(verdictRaw, provider, model);
      const notes: string[] = Array.isArray(parsed.notes) ? parsed.notes.filter((n): n is string => typeof n === "string").slice(0, 3) : [];
      const invalidReason = validateRangeReason(minYear, maxYear);
      if (invalidReason) {
        retryReason = invalidReason;
        retryCount += 1;
        lastVerdict = verdict;
        continue;
      }

      const elapsedMs = Math.max(0, Date.now() - startedAtMs);
      return {
        minYear: minYear as number,
        maxYear: maxYear as number,
        confidence: clamp01(parsed.confidence ?? 0),
        verdict,
        notes,
        rangeValidity: "valid",
        rawResponseText: rawDebug,
        model,
        provider,
        usedFallbackLocal: false,
        debugTrace: {
          requestFactsCount: factualRequest.facts.length,
          inputFactsCount: factualRequest.facts.length,
          inputFactsUsed: selectedFacts.length,
          provider,
          model,
          apiUsed: response.apiUsed,
          finishReason: response.finishReason,
          tokenBudget: attempt.tokenBudget,
          retryCount,
          retryReason,
          selectedLevel,
          recommendedLevel: recommendation.recommendedLevel,
          layersUsed: planned.layersUsed,
          contextPolicyVersion: "v2_level_context",
          selectionSummary: planned.selectionTrace,
          notesIncluded: notesPolicy.includeNotes,
          notesScopeApplied: notesPolicy.scope,
          rawResponseText: rawDebug,
          parsed: true,
          parseError: undefined,
          startedAt: startedAtIso,
          elapsedMs
        }
      };
    }

    const elapsedMs = Math.max(0, Date.now() - startedAtMs);
    return buildFallbackResult(
      localRange[0],
      localRange[1],
      provider,
      model,
      retryReason === "length"
        ? "La IA agotó tokens en razonamiento; se aplicó reintento adaptativo y se mantiene rango local."
        : retryReason === "empty_output"
          ? "No hubo salida textual utilizable; se mantiene rango local."
          : retryReason === "invalid_year_domain"
            ? "La IA devolvió años fuera de dominio válido; se conserva rango local."
            : retryReason === "inverted_range"
              ? "La IA devolvió un rango invertido; se conserva rango local."
              : retryReason === "invalid_format"
                ? "La IA no devolvió formato de rango válido; se conserva rango local."
                : "Salida IA inválida; se mantiene rango local.",
      {
        verdict: lastVerdict || "La IA no devolvió salida utilizable tras reintentos.",
        rawResponseText: lastRawDebug,
        parseError: lastParseError,
        debugTrace: {
          requestFactsCount: factualRequest.facts.length,
          inputFactsCount: factualRequest.facts.length,
          inputFactsUsed: lastResponseMeta?.inputFactsUsed || 0,
          provider,
          model,
          apiUsed: lastResponseMeta?.apiUsed,
          finishReason: lastResponseMeta?.finishReason,
          tokenBudget: lastResponseMeta?.tokenBudget || budget.attempts[0].tokenBudget,
          retryCount,
          retryReason,
          selectedLevel,
          recommendedLevel: recommendation.recommendedLevel,
          layersUsed: planned.layersUsed,
          contextPolicyVersion: "v2_level_context",
          selectionSummary: planned.selectionTrace,
          notesIncluded: notesPolicy.includeNotes,
          notesScopeApplied: notesPolicy.scope,
          rawResponseText: lastRawDebug || "[empty model output]",
          parsed: false,
          parseError: lastParseError,
          startedAt: startedAtIso,
          elapsedMs
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const rawFromError = extractRawFromError(error);
    const rawDebug = params.settings.developerBirthRefinementShowRawUnfiltered
      ? rawFromError
      : truncateForDebug(rawFromError);
    const elapsedMs = Math.max(0, Date.now() - startedAtMs);
    return buildFallbackResult(
      localRange[0],
      localRange[1],
      provider,
      model,
      `No se pudo refinar con IA (${message}). Se mantiene rango local.`,
      {
        verdict: "Error técnico al consultar IA.",
        rawResponseText: rawDebug,
        debugTrace: {
          requestFactsCount: factualRequest.facts.length,
          inputFactsCount: factualRequest.facts.length,
          inputFactsUsed: 0,
          provider,
          model,
          tokenBudget: getRefinementBudget(selectedLevel, model).attempts[0].tokenBudget,
          retryCount: 0,
          selectedLevel,
          recommendedLevel: recommendation.recommendedLevel,
          layersUsed: planned.layersUsed,
          contextPolicyVersion: "v2_level_context",
          selectionSummary: planned.selectionTrace,
          notesIncluded: notesPolicy.includeNotes,
          notesScopeApplied: notesPolicy.scope,
          rawResponseText: rawDebug,
          parsed: false,
          parseError: message,
          startedAt: startedAtIso,
          elapsedMs
        }
      }
    );
  }
}
