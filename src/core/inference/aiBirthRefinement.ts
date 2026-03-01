import { buildBirthRangeRefinementCompactPrompt, buildBirthRangeRefinementPrompt } from "@/core/ai/prompts";
import { safeParseJson } from "@/core/ai/parsing";
import { aiInvokeProvider } from "@/services/aiRuntime";
import { estimatePersonBirthYear } from "@/core/inference/dateInference";
import type {
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

type RetryReason = "length" | "empty_output" | "parse_failure";

type RefinementBudget = {
  attempts: Array<{ tokenBudget: number; compactPrompt: boolean; factsLimit: number }>;
};

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
        range: a <= b ? [a, b] : [b, a],
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
        range: a <= b ? [a, b] : [b, a],
        verdict: text.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim()
      };
    }
  }

  const verdictCandidate = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!verdictCandidate) return {};
  const verdict = verdictCandidate.slice(0, 260);
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

function personLabel(document: GeneaDocument, personId: string | undefined): string {
  if (!personId) return "Sin persona";
  const person = document.persons[personId];
  if (!person) return personId;
  return `${person.name}${person.surname ? ` ${person.surname}` : ""}`.trim() || person.id;
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
  const spanish = normalizeVerdictToSpanish(trimmed);
  const base = spanish.length > 0
    ? spanish
    : trimmed.length > 0
    ? trimmed
    : "Rango propuesto por consistencia cronológica y contexto familiar disponible.";
  return `Veredicto: ${base} (Modelo: ${provider}:${model})`;
}

function normalizeVerdictToSpanish(text: string): string {
  const lower = text.toLowerCase();
  const looksEnglish = /\b(range|based on|assuming|born|parents|siblings|children|years old|likely|plausible)\b/i.test(lower);
  if (!looksEnglish) return text;
  return "Rango estimado por consistencia cronológica de familiares, con supuestos demográficos plausibles para la época.";
}

function widenRangeIfLowEvidence(
  range: [number, number],
  factsUsed: number,
  confidence: number | undefined,
  minHard?: number,
  maxHard?: number
): [number, number] {
  const conf = typeof confidence === "number" ? confidence : 0.5;
  if (factsUsed >= 10 && conf >= 0.6) return range;

  const widenBy = factsUsed <= 4 || conf < 0.45 ? 8 : 5;
  let min = range[0] - widenBy;
  let max = range[1] + widenBy;

  if (minHard !== undefined && min < minHard) min = minHard;
  if (maxHard !== undefined && max > maxHard) max = maxHard;
  if (min > max) return range;
  return [min, max];
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
  return 20;
}

export function rankBirthRefinementFacts(facts: AiBirthRangeRefinementFact[]): AiBirthRangeRefinementFact[] {
  return [...facts].sort((a, b) => {
    const scoreDelta = scoreFactForBirth(b) - scoreFactForBirth(a);
    if (scoreDelta !== 0) return scoreDelta;
    return a.reference.localeCompare(b.reference);
  });
}

function getRefinementBudget(profile: AiSettings["birthRefinementProfile"] | undefined): RefinementBudget {
  if (profile === "max_reliability") {
    return {
      attempts: [
        { tokenBudget: 800, compactPrompt: false, factsLimit: 36 },
        { tokenBudget: 1100, compactPrompt: true, factsLimit: 24 },
        { tokenBudget: 1300, compactPrompt: true, factsLimit: 16 }
      ]
    };
  }
  if (profile === "low_cost") {
    return {
      attempts: [{ tokenBudget: 450, compactPrompt: true, factsLimit: 14 }]
    };
  }
  return {
    attempts: [
      { tokenBudget: 600, compactPrompt: false, factsLimit: 24 },
      { tokenBudget: 900, compactPrompt: true, factsLimit: 16 }
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
    rawResponseText: extras?.rawResponseText,
    parseError: extras?.parseError,
    model,
    provider,
    usedFallbackLocal: true,
    debugTrace: extras?.debugTrace
  };
}

function buildBirthRefinementFactsFromTree(document: GeneaDocument, focusPersonId: string): AiBirthRangeRefinementFact[] {
  const focus = document.persons[focusPersonId];
  if (!focus) return [];

  const facts: AiBirthRangeRefinementFact[] = [];
  const pushFact = (fact: AiBirthRangeRefinementFact) => {
    facts.push(fact);
  };

  const pushPersonEvents = (
    personId: string,
    relationToFocus: AiBirthRangeRefinementFact["relationToFocus"],
    referencePrefix: string
  ) => {
    const person = document.persons[personId];
    if (!person) return;
    for (const event of person.events || []) {
      if (event.type !== "BIRT" && event.type !== "DEAT") continue;
      if (relationToFocus === "focus" && event.type === "BIRT") continue;
      pushFact({
        personId,
        personLabel: personLabel(document, personId),
        relationToFocus,
        eventType: event.type,
        date: event.date,
        place: event.place,
        reference: `${referencePrefix}:${personId}:${event.type}`
      });
    }
    if (person.residence) {
      pushFact({
        personId,
        personLabel: personLabel(document, personId),
        relationToFocus,
        eventType: "NOTE",
        place: person.residence,
        reference: `${referencePrefix}:${personId}:RESI`
      });
    }
  };

  pushPersonEvents(focusPersonId, "focus", "focus");

  for (const familyId of focus.famc) {
    const family = document.families[familyId];
    if (!family) continue;

    if (family.husbandId) pushPersonEvents(family.husbandId, "parent", `famc:${familyId}:parent`);
    if (family.wifeId) pushPersonEvents(family.wifeId, "parent", `famc:${familyId}:parent`);

    for (const siblingId of family.childrenIds) {
      if (siblingId === focusPersonId) continue;
      pushPersonEvents(siblingId, "sibling", `famc:${familyId}:sibling`);
    }
  }

  for (const familyId of focus.fams) {
    const family = document.families[familyId];
    if (!family) continue;

    const spouseId = family.husbandId === focusPersonId ? family.wifeId : family.husbandId;
    if (spouseId) pushPersonEvents(spouseId, "spouse", `fams:${familyId}:spouse`);

    for (const childId of family.childrenIds) {
      pushPersonEvents(childId, "child", `fams:${familyId}:child`);
    }

    for (const event of family.events || []) {
      if (event.type !== "MARR" && event.type !== "DIV") continue;
      pushFact({
        personId: spouseId || focusPersonId,
        personLabel: spouseId ? personLabel(document, spouseId) : personLabel(document, focusPersonId),
        relationToFocus: spouseId ? "spouse" : "focus",
        eventType: event.type,
        date: event.date,
        place: event.place,
        reference: `family:${familyId}:${event.type}`
      });
    }
  }

  const unique = new Map<string, AiBirthRangeRefinementFact>();
  for (const fact of facts) {
    const key = `${fact.reference}|${fact.personId}|${fact.eventType}|${fact.date || ""}|${fact.place || ""}`;
    if (!unique.has(key)) unique.set(key, fact);
  }
  return Array.from(unique.values());
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

export async function refineBirthRangeWithAi(
  params: RefineBirthRangeWithAiParams
): Promise<AiBirthRangeRefinementResult> {
  const person = params.document.persons[params.personId];
  if (!person) {
    throw new BirthRefinementDomainError("Persona no encontrada para refinamiento.");
  }

  const local = estimatePersonBirthYear(params.personId, params.document);
  if (!local) {
    throw new BirthRefinementDomainError("No hay inferencia local disponible.");
  }

  const localRange = local.suggestedRange
    ?? (local.suggestedYear !== undefined ? [local.suggestedYear, local.suggestedYear] as [number, number] : null);
  if (!localRange) {
    throw new BirthRefinementDomainError("No hay rango local utilizable para refinar.");
  }

  const minHard = local.minYear;
  const maxHard = local.maxYear;

  const factualRequest: AiBirthRangeRefinementFactsRequest = {
    focusPersonId: person.id,
    focusPersonLabel: `${person.name}${person.surname ? ` ${person.surname}` : ""}`.trim() || person.id,
    focusSex: person.sex || "U",
    focusBirthDateCurrent: undefined,
    facts: buildBirthRefinementFactsFromTree(params.document, person.id)
  };

  const useCase = params.settings.useCaseModels.birth_refinement;
  const provider = useCase.provider;
  const model = useCase.model;
  const budget = getRefinementBudget(params.settings.birthRefinementProfile);
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
      const prompts = attempt.compactPrompt
        ? buildBirthRangeRefinementCompactPrompt(attemptRequest)
        : buildBirthRangeRefinementPrompt(attemptRequest);

      let response;
      try {
        response = await invokeRefinement(
          {
            provider,
            model,
            systemPrompt: prompts.system,
            userPrompt: prompts.user,
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
              systemPrompt: prompts.system,
              userPrompt: prompts.user,
              preferredApi: params.settings.openAiPreferredApi || "auto",
              tokenBudget: attempt.tokenBudget
            },
            false
          );
        } else {
          throw error;
        }
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
          let [minYear, maxYear] = loose.range;
          const notes: string[] = ["Se recuperó un rango desde respuesta IA no estructurada."];
          if (minHard !== undefined && minYear < minHard) {
            minYear = minHard;
            notes.push("Rango IA ajustado al límite mínimo biológico local.");
          }
          if (maxHard !== undefined && maxYear > maxHard) {
            maxYear = maxHard;
            notes.push("Rango IA ajustado al límite máximo biológico local.");
          }
          if (minYear <= maxYear) {
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
                rawResponseText: rawDebug,
                parsed: false,
                parseError: parseAttempt.parseError,
                startedAt: startedAtIso,
                elapsedMs
              }
            };
          }
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

      if (minYear === undefined || maxYear === undefined) {
        retryReason = "parse_failure";
        retryCount += 1;
        lastVerdict = verdict;
        continue;
      }

      if (minYear > maxYear) {
        const tmp = minYear;
        minYear = maxYear;
        maxYear = tmp;
        notes.push("Rango IA venía invertido y fue normalizado.");
      }

      if (minHard !== undefined && minYear < minHard) {
        minYear = minHard;
        notes.push("Rango ajustado al límite mínimo biológico local.");
      }
      if (maxHard !== undefined && maxYear > maxHard) {
        maxYear = maxHard;
        notes.push("Rango ajustado al límite máximo biológico local.");
      }

      if (minYear > maxYear) {
        retryReason = "parse_failure";
        retryCount += 1;
        lastVerdict = verdict;
        continue;
      }

      [minYear, maxYear] = widenRangeIfLowEvidence(
        [minYear, maxYear],
        selectedFacts.length,
        parsed.confidence,
        minHard,
        maxHard
      );

      const elapsedMs = Math.max(0, Date.now() - startedAtMs);
      return {
        minYear,
        maxYear,
        confidence: clamp01(parsed.confidence ?? 0),
        verdict,
        notes,
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
          tokenBudget: getRefinementBudget(params.settings.birthRefinementProfile).attempts[0].tokenBudget,
          retryCount: 0,
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

