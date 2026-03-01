import type { PendingRelationType } from "@/types/domain";

export type AiExecutionMode = "hybrid" | "chatgpt_only" | "gemini_only";
export type AiProvider = "chatgpt" | "gemini";
export type OpenAiPreferredApi = "auto" | "responses" | "chat_completions";
export type BirthRefinementProfile = "balanced" | "max_reliability" | "low_cost";
export type AiContextPolicy = "adaptive" | "minimal" | "full";
export type AiStage = "extraction" | "resolution";
// "resolution" is deprecated in runtime v4 (kept for snapshot compatibility).
export type AiUseCase = "extraction" | "resolution" | "narration" | "birth_refinement";

export type AiUseCaseModel = {
  provider: AiProvider;
  model: string;
};

export type AiModelCatalogEntry = {
  id: string;
  label: string;
  recommended?: boolean;
  isPreview?: boolean;
  price?: string;
  priceOut?: string;
  intelligence?: number;
  isReasoning?: boolean;
};

export type AiTokenLimits = {
  extraction: number;
  resolution: number;
};

export type AiRetryPolicy = {
  maxRetries: number;
  baseDelayMs: number;
  retryOnStatuses: number[];
};

export type AiCostFlags = {
  showCostEstimate: boolean;
  warnOnLargeContext: boolean;
};

export type AiSettings = {
  executionMode: AiExecutionMode;
  fallbackEnabled: boolean;
  contextPolicy: AiContextPolicy; // Deprecated in deterministic v3, preserved for backward compatibility
  deterministicMode: boolean;
  developerBirthRefinementDebug: boolean;
  developerBirthRefinementShowRawUnfiltered: boolean;
  openAiPreferredApi?: OpenAiPreferredApi;
  birthRefinementProfile?: BirthRefinementProfile;
  geminiFreeTierMode?: boolean;
  providerModels: Record<AiProvider, string>; // Legacy model mapping by provider
  useCaseModels: Record<AiUseCase, AiUseCaseModel>; // New specific mapping
  modelCatalog: Record<AiProvider, AiModelCatalogEntry[]>;
  tokenLimits: AiTokenLimits;
  retryPolicy: AiRetryPolicy;
  costFlags: AiCostFlags;
};

export type AiBirthRangeRefinementFact = {
  personId: string;
  personLabel: string;
  relationToFocus: "focus" | "parent" | "child" | "spouse" | "sibling" | "other";
  eventType: "BIRT" | "DEAT" | "MARR" | "DIV" | "NOTE";
  date?: string;
  place?: string;
  reference: string;
};

export type AiBirthRangeRefinementFactsRequest = {
  focusPersonId: string;
  focusPersonLabel: string;
  focusSex: "M" | "F" | "U";
  focusBirthDateCurrent?: string;
  facts: AiBirthRangeRefinementFact[];
};

export type AiBirthRangeRefinementResult = {
  minYear: number;
  maxYear: number;
  confidence: number;
  verdict: string;
  notes: string[];
  rawResponseText?: string;
  parseError?: string;
  model: string;
  provider: AiProvider;
  usedFallbackLocal: boolean;
  debugTrace?: AiBirthRefinementDebugTrace;
};

export type AiBirthRefinementDebugTrace = {
  requestFactsCount: number;
  inputFactsCount: number;
  inputFactsUsed: number;
  provider: "chatgpt" | "gemini";
  model: string;
  apiUsed?: "responses" | "chat_completions" | "gemini_generate_content";
  finishReason?: string;
  tokenBudget: number;
  retryCount: number;
  retryReason?: "length" | "empty_output" | "parse_failure";
  rawResponseText: string;
  parsed: boolean;
  parseError?: string;
  startedAt: string;
  elapsedMs: number;
};

export type AiInputContext =
  | {
    kind: "local";
    anchorPersonId: string;
    anchorLabel?: string; // Full name and key data for the AI to use as primary reference
  }
  | {
    kind: "global";
  };

export type AiPersonInput = {
  name: string;
  surname?: string;
  sex?: "M" | "F" | "U";
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  residence?: string;
  lifeStatus?: "alive" | "deceased";
  normalizedPlaces?: {
    birthPlace?: string;
    deathPlace?: string;
    residence?: string;
  };
};

export type AiExtractionEntity = {
  id: string;
  name: string;
  role?: "ANCHOR" | "MENTION";
  confidence: number;
};

export type AiExtractionEventType = "BIRT" | "MARR" | "DEAT" | "RESI" | "NOTE";

export type AiExtractionEvent = {
  type: AiExtractionEventType;
  date?: string;
  place?: string;
  participants: string[];
  confidence?: number;
};

export type AiExtractionRelation = {
  type: "parent" | "child" | "spouse" | "sibling";
  from: string;
  to: string;
  confidence?: number;
};

export type AiExtractionIntent = {
  kind: "create" | "update" | "delete" | "note";
  target?: string;
  summary: string;
  confidence?: number;
};

export type AiExtractionCoreference = {
  mention: string;
  resolvesTo: string;
  rationale?: string;
  confidence?: number;
};

export type AiExtractionV2 = {
  informantName?: string;
  confidence: number;
  entities: AiExtractionEntity[];
  events: AiExtractionEvent[];
  relations: AiExtractionRelation[];
  intents: AiExtractionIntent[];
  coreference: AiExtractionCoreference[];
  evidenceSnippets?: string[];
  rawText: string;
  assumptions?: string[];
  userMessage?: string;
};

export type AiExtractionV4PersonRole = "focus" | "spouse" | "child" | "parent" | "sibling" | "other";

export type AiExtractionV4 = {
  focus: {
    name: string;
    idHint?: "ANCHOR" | string;
    confidence: number;
  };
  persons: Array<{
    tempId: string;
    name: string;
    surname?: string;
    role: AiExtractionV4PersonRole;
    confidence: number;
    attributes?: Partial<AiPersonInput>;
  }>;
  familyFacts: Array<{
    type: "MARR" | "DIV";
    date?: string;
    place?: string;
    spouses: [string, string];
    confidence?: number;
  }>;
  personFacts: Array<{
    type: "BIRT" | "DEAT" | "RESI" | "NOTE";
    person: string;
    date?: string;
    place?: string;
    value?: string;
    confidence?: number;
  }>;
  relations: Array<{
    type: "spouse" | "parent" | "child" | "sibling";
    from: string;
    to: string;
    confidence?: number;
  }>;
  rawText: string;
  confidence: number;
  assumptions?: string[];
  userMessage?: string;
};

export type AiResolvedAction =
  | {
    kind: "create_person";
    person: AiPersonInput;
    preferredId?: string;
  }
  | {
    kind: "update_person";
    personId?: string;
    matchQuery?: string;
    patch: Partial<AiPersonInput>;
    originalValues?: Partial<AiPersonInput>;
    isConflict?: boolean;
    normalizedPlaces?: {
      birthPlace?: string;
      deathPlace?: string;
      residence?: string;
    };
  }
  | {
    kind: "delete_person";
    personId?: string;
    matchQuery?: string;
    reason?: string;
  }
  | {
    kind: "create_relation";
    anchorPersonId?: string;
    anchorQuery?: string;
    relatedPersonId?: string;
    relatedQuery?: string;
    targetFamilyId?: string;
    relationType: PendingRelationType;
    createRelatedIfMissing?: boolean;
    relatedPerson?: AiPersonInput;
  }
  | {
    kind: "delete_relation";
    personId?: string;
    personQuery?: string;
    relatedPersonId?: string;
    relatedPersonQuery?: string;
    relationType: "parent" | "child" | "spouse" | "sibling";
  }
  | {
    kind: "delete_family";
    familyId?: string;
    familyQuery?: string;
    reason?: string;
  }
  | {
    kind: "update_family";
    familyId?: string;
    familyQuery?: string;
    patch: {
      events?: Array<{
        type: "MARR" | "DIV";
        date?: string;
        place?: string;
      }>;
    };
  };

export type AiResolutionV2 = {
  informantName: string;
  confidence: number;
  resolutionSource: "code_engine_v5";
  confidenceBreakdown?: {
    extraction: number;
    matching: number;
    ruleConsistency: number;
  };
  notes?: string[];
  actions: AiResolvedAction[];
  userMessage?: string;
};

export type AiReviewRisk = "low" | "medium" | "high";
export type AiReviewItemStatus = "proposed" | "approved" | "rejected";

export type AiReviewCandidate = {
  id: string;
  label: string;
  score: number;
  reason: string;
};

export type AiReviewSelection = {
  anchorPersonId?: string;
  relatedPersonId?: string;
  targetFamilyId?: string;
  createNewRelatedPerson?: boolean;
};

export type AiAttributeConflict = {
  attribute: string;
  currentValue: string;
  suggestedValue: string;
  isNormalized?: boolean;
  accepted?: boolean;
};

export type AiReviewItem = {
  id: string;
  kind: AiResolvedAction["kind"];
  title: string;
  description: string;
  risk: AiReviewRisk;
  status: AiReviewItemStatus;
  issues: string[];
  action: AiResolvedAction;
  candidates: AiReviewCandidate[];
  candidateGroups?: {
    anchor: AiReviewCandidate[];
    related: AiReviewCandidate[];
    families: Array<{ id: string; label: string }>;
  };
  selection?: AiReviewSelection;
  selectedCandidateId?: string;
  requiresDeleteConfirmation: boolean;
  blocked?: boolean;
  blockReason?: string;
  requiresDecision?: boolean;
  attributeConflicts?: AiAttributeConflict[];
  stepIndex?: number; // 0: Identity, 1: Creation, 2: Attributes/Conflicts, 3: Relations
};

export type AiProviderErrorLog = {
  provider: AiProvider;
  stage: AiStage;
  statusCode?: number;
  reasonShort?: string;
  quotaScope?: "model_minute" | "model_day" | "project_minute" | "unknown";
  quotaLimitZero?: boolean;
  retryDelayMsHint?: number;
  isTimeout?: boolean;
  elapsedMs?: number;
  attempt?: number;
  message: string;
};

export type AiProviderTrace = {
  stage: AiStage;
  provider: AiProvider;
  model: string;
  fallbackFrom?: AiProvider;
  retries: number;
  autoSwitchAttempted?: boolean;
  modelAutoSwitchedFrom?: string;
  modelAutoSwitchedTo?: string;
  errors: AiProviderErrorLog[];
};

export type AiAppliedChange = {
  operation:
  | "create_person"
  | "update_person"
  | "delete_person"
  | "create_relation"
  | "delete_relation"
  | "create_family"
  | "update_family"
  | "delete_family";
  entityType: "person" | "family" | "relation";
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason: string;
  risk: AiReviewRisk;
  status: "applied" | "skipped" | "blocked";
  warnings?: string[];
};

export type AiReviewDraft = {
  runId: string;
  context: AiInputContext;
  executionMode: AiExecutionMode;
  informantName: string;
  extraction: AiExtractionV4 | null;
  resolution: AiResolutionV2 | null;
  items: AiReviewItem[];
  warnings: string[];
  deterministicProfile: "det_v1";
  deterministicWarnings: string[];
  providerTrace: AiProviderTrace[];
  createdAt: string;
  userMessage?: string;
  usedModels?: {
    extraction?: string;
    resolution?: string;
  };
};

export type AiGlobalFocusDetection = {
  extractedFocusName: string | null;
  candidates: AiReviewCandidate[];
  topCandidateId?: string;
  confidence: number;
  requiresConfirmation: boolean;
  notes?: string[];
};

export type AiAuditTrailEntry = {
  runId: string;
  createdAt: string;
  contextKind: AiInputContext["kind"];
  anchorPersonId?: string;
  informantName: string;
  executionMode: AiExecutionMode;
  providerTrace: AiProviderTrace[];
  appliedItems: Array<{
    itemId: string;
    kind: AiResolvedAction["kind"];
    status: AiReviewItemStatus;
    risk: AiReviewRisk;
  }>;
  warnings: string[];
};

export type RecycleBinEntry = {
  id: string;
  deletedAt: string;
  runId: string;
  entityType: "person" | "family";
  entityId: string;
  reason?: string;
  snapshot: unknown;
};

export type AiCredentialPayload = {
  openaiApiKey?: string;
  geminiApiKey?: string;
};

export type AiCredentialStatus = {
  hasOpenAiKey: boolean;
  hasGeminiKey: boolean;
  updatedAt?: string;
};

export type AiValidateRequest = {
  provider: AiProvider;
  model: string;
};

export type AiValidateResponse = {
  valid: boolean;
  message: string;
  statusCode?: number;
};

export type AiListModelsRequest = {
  provider: AiProvider;
};

export type AiListModelsResponse = {
  provider: AiProvider;
  models: AiModelCatalogEntry[];
  fetchedAt: string;
};

export type AiInvokeProviderRequest = {
  provider: AiProvider;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens: number;
  temperature?: number;
  preferredApi?: "auto" | "responses" | "chat_completions";
};

export type AiInvokeProviderResponse = {
  text: string;
  model: string;
  provider: AiProvider;
  rawBody?: string;
  apiUsed?: "responses" | "chat_completions" | "gemini_generate_content";
  finishReason?: string;
  providerWarnings?: string[];
};

export type AiDiagnosticEntry = {
  timestamp: string;
  runId: string;
  stage: AiStage;
  provider: AiProvider;
  model: string;
  statusCode?: number;
  reasonShort?: string;
  quotaScope?: "model_minute" | "model_day" | "project_minute" | "unknown";
  quotaLimitZero?: boolean;
  retryDelayMsHint?: number;
  isTimeout?: boolean;
  elapsedMs?: number;
  retryCount: number;
  fallbackFrom?: AiProvider;
  modelAutoSwitchedFrom?: string;
  modelAutoSwitchedTo?: string;
  autoSwitchAttempted?: boolean;
  contextKind: AiInputContext["kind"];
  textLength: number;
  messageRedacted: string;
  technicalDetailRedacted: string;
};

export type AiAppendDiagnosticLogRequest = {
  entry: AiDiagnosticEntry;
};

export type AiReadDiagnosticLogResponse = {
  path: string;
  contents: string;
};

