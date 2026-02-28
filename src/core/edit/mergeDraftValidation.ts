import type { MergeAction, MergeExplain, MergeHypothesis, MergeRiskLevel } from "@/types/domain";
import type {
  MergeReviewActionEntry,
  MergeReviewAutoRules,
  MergeReviewCase,
  MergeReviewCandidateOption,
  MergeReviewCaseStatus,
  MergeReviewPreset,
  MergeReviewSession,
  MergeReviewStep
} from "@/types/merge-review";
import type { MergeDraftSnapshot } from "@/types/merge-draft";

const VALID_STEPS: MergeReviewStep[] = ["strategy", "inbox", "case_workbench", "technical_conflicts", "preview", "apply"];
const VALID_PRESETS: MergeReviewPreset[] = ["strict", "balanced", "fast"];
const VALID_CASE_STATUSES: MergeReviewCaseStatus[] = ["pending", "auto_applied", "manual_applied"];
const VALID_RISKS: MergeRiskLevel[] = ["low", "medium", "high"];
const VALID_MODES: Array<MergeReviewSession["mode"]> = ["auto_deep", "expert_workbench"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
}

function isMergeReviewStep(value: unknown): value is MergeReviewStep {
  return typeof value === "string" && VALID_STEPS.includes(value as MergeReviewStep);
}

function isMergeReviewPreset(value: unknown): value is MergeReviewPreset {
  return typeof value === "string" && VALID_PRESETS.includes(value as MergeReviewPreset);
}

function isMergeCaseStatus(value: unknown): value is MergeReviewCaseStatus {
  return typeof value === "string" && VALID_CASE_STATUSES.includes(value as MergeReviewCaseStatus);
}

function isRisk(value: unknown): value is MergeRiskLevel {
  return typeof value === "string" && VALID_RISKS.includes(value as MergeRiskLevel);
}

function isReviewMode(value: unknown): value is MergeReviewSession["mode"] {
  return typeof value === "string" && VALID_MODES.includes(value as MergeReviewSession["mode"]);
}

function buildFallbackExplain(incomingId: string): MergeExplain {
  return {
    categoryPoints: {
      identity: 0,
      temporal: 0,
      geography: 0,
      familyNetwork: 0,
      documentStructure: 0
    },
    subCategoryPoints: {
      familyParents: 0,
      familyUnions: 0,
      familyChildren: 0,
      familySiblings: 0,
      familyGrandparents: 0
    },
    penalties: [],
    coverage: {
      comparableSignals: 0,
      availableSignals: 1,
      coverageRatio: 0,
      coveragePenalty: 18
    },
    capsApplied: [],
    blockers: [],
    decisionReason: "Sesion restaurada con informacion parcial. Se recomienda revisar manualmente.",
    requiredActions: [{ kind: "create_person", incomingId, preferredId: incomingId }]
  };
}

function buildFallbackHypothesis(incomingId: string): MergeHypothesis {
  return {
    hypothesisType: "CreateNewPerson",
    scoreFinal: 62,
    riskLevel: "medium",
    explain: buildFallbackExplain(incomingId)
  };
}

function sanitizeActions(value: unknown): MergeAction[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is MergeAction => isRecord(item) && typeof item.kind === "string");
}

function sanitizeHypothesis(value: unknown, incomingId: string): MergeHypothesis | null {
  if (!isRecord(value) || typeof value.hypothesisType !== "string") return null;
  const fallback = buildFallbackHypothesis(incomingId);
  const explainRaw = isRecord(value.explain) ? value.explain : null;
  const explain: MergeExplain = {
    categoryPoints: {
      identity: toFiniteNumber(explainRaw?.categoryPoints && (explainRaw.categoryPoints as Record<string, unknown>).identity, 0),
      temporal: toFiniteNumber(explainRaw?.categoryPoints && (explainRaw.categoryPoints as Record<string, unknown>).temporal, 0),
      geography: toFiniteNumber(explainRaw?.categoryPoints && (explainRaw.categoryPoints as Record<string, unknown>).geography, 0),
      familyNetwork: toFiniteNumber(explainRaw?.categoryPoints && (explainRaw.categoryPoints as Record<string, unknown>).familyNetwork, 0),
      documentStructure: toFiniteNumber(explainRaw?.categoryPoints && (explainRaw.categoryPoints as Record<string, unknown>).documentStructure, 0)
    },
    subCategoryPoints: {
      familyParents: toFiniteNumber(explainRaw?.subCategoryPoints && (explainRaw.subCategoryPoints as Record<string, unknown>).familyParents, 0),
      familyUnions: toFiniteNumber(explainRaw?.subCategoryPoints && (explainRaw.subCategoryPoints as Record<string, unknown>).familyUnions, 0),
      familyChildren: toFiniteNumber(explainRaw?.subCategoryPoints && (explainRaw.subCategoryPoints as Record<string, unknown>).familyChildren, 0),
      familySiblings: toFiniteNumber(explainRaw?.subCategoryPoints && (explainRaw.subCategoryPoints as Record<string, unknown>).familySiblings, 0),
      familyGrandparents: toFiniteNumber(explainRaw?.subCategoryPoints && (explainRaw.subCategoryPoints as Record<string, unknown>).familyGrandparents, 0)
    },
    penalties: Array.isArray(explainRaw?.penalties)
      ? explainRaw.penalties.filter((item): item is { code: string; points: number; detail: string } => isRecord(item) && typeof item.code === "string")
      : [],
    coverage: {
      comparableSignals: toFiniteNumber(explainRaw?.coverage && (explainRaw.coverage as Record<string, unknown>).comparableSignals, 0),
      availableSignals: toFiniteNumber(explainRaw?.coverage && (explainRaw.coverage as Record<string, unknown>).availableSignals, 1),
      coverageRatio: toFiniteNumber(explainRaw?.coverage && (explainRaw.coverage as Record<string, unknown>).coverageRatio, 0),
      coveragePenalty: toFiniteNumber(explainRaw?.coverage && (explainRaw.coverage as Record<string, unknown>).coveragePenalty, 0)
    },
    capsApplied: toStringArray(explainRaw?.capsApplied),
    blockers: Array.isArray(explainRaw?.blockers)
      ? explainRaw.blockers.filter(
        (item): item is { code: string; severity: "criticalHardConflict" | "nonCriticalHardConflict" | "soft"; detail: string } =>
          isRecord(item) && typeof item.code === "string" && typeof item.severity === "string"
      )
      : [],
    decisionReason: typeof explainRaw?.decisionReason === "string" ? explainRaw.decisionReason : fallback.explain.decisionReason,
    requiredActions: (() => {
      const actions = sanitizeActions(explainRaw?.requiredActions);
      return actions.length > 0 ? actions : fallback.explain.requiredActions;
    })()
  };

  return {
    hypothesisType: value.hypothesisType as MergeHypothesis["hypothesisType"],
    baseId: typeof value.baseId === "string" ? value.baseId : undefined,
    scoreFinal: Math.max(0, Math.min(100, Math.round(toFiniteNumber(value.scoreFinal, fallback.scoreFinal)))),
    riskLevel: isRisk(value.riskLevel) ? value.riskLevel : fallback.riskLevel,
    explain
  };
}

function sanitizeCandidate(value: unknown, incomingId: string): MergeReviewCandidateOption | null {
  if (!isRecord(value)) return null;
  const fallbackHypothesis = buildFallbackHypothesis(incomingId);
  const hypothesesTopKRaw = Array.isArray(value.hypothesesTopK) ? value.hypothesesTopK : [];
  const hypothesesTopK = hypothesesTopKRaw
    .map((item) => sanitizeHypothesis(item, incomingId))
    .filter((item): item is MergeHypothesis => Boolean(item));
  if (hypothesesTopK.length === 0) hypothesesTopK.push(fallbackHypothesis);
  const chosenHypothesis =
    sanitizeHypothesis(value.chosenHypothesis, incomingId) ||
    hypothesesTopK[0];

  const explain = sanitizeHypothesis({ hypothesisType: chosenHypothesis.hypothesisType, explain: value.explain }, incomingId)?.explain || chosenHypothesis.explain;
  const requiredActions = (() => {
    const actions = sanitizeActions(value.requiredActions);
    return actions.length > 0 ? actions : chosenHypothesis.explain.requiredActions;
  })();

  return {
    baseId: typeof value.baseId === "string" ? value.baseId : undefined,
    score: toFiniteNumber(value.score, chosenHypothesis.scoreFinal),
    confidence: value.confidence === "high" || value.confidence === "medium" || value.confidence === "low" ? value.confidence : "low",
    riskLevel: isRisk(value.riskLevel) ? value.riskLevel : chosenHypothesis.riskLevel,
    blockers: Array.isArray(value.blockers)
      ? value.blockers.filter(
        (item): item is { code: string; severity: "criticalHardConflict" | "nonCriticalHardConflict" | "soft"; detail: string } =>
          isRecord(item) && typeof item.code === "string" && typeof item.severity === "string"
      )
      : [],
    signals: toStringArray(value.signals),
    qualityFlags: toStringArray(value.qualityFlags),
    hypothesesTopK,
    chosenHypothesis,
    requiredActions,
    explain,
    source: value.source === "synthetic-create" ? "synthetic-create" : "match-candidate"
  };
}

function sanitizeCase(incomingId: string, value: unknown): MergeReviewCase | null {
  if (!isRecord(value)) return null;
  const caseIncomingId = typeof value.incomingId === "string" ? value.incomingId : incomingId;
  const candidates = (Array.isArray(value.candidates) ? value.candidates : [])
    .map((item) => sanitizeCandidate(item, caseIncomingId))
    .filter((item): item is MergeReviewCandidateOption => Boolean(item));
  if (candidates.length === 0) {
    candidates.push({
      baseId: caseIncomingId,
      score: 62,
      confidence: "low",
      riskLevel: "medium",
      blockers: [],
      signals: ["fallback:candidate-repair"],
      qualityFlags: ["synthetic-create"],
      hypothesesTopK: [buildFallbackHypothesis(caseIncomingId)],
      chosenHypothesis: buildFallbackHypothesis(caseIncomingId),
      requiredActions: [{ kind: "create_person", incomingId: caseIncomingId, preferredId: caseIncomingId }],
      explain: buildFallbackExplain(caseIncomingId),
      source: "synthetic-create"
    });
  }
  const selectedCandidate = clampIndex(toFiniteNumber(value.selectedCandidate, 0), candidates.length);
  const selectedCandidateRef = candidates[selectedCandidate];
  const hypothesesTopK = (Array.isArray(value.hypothesesTopK) ? value.hypothesesTopK : [])
    .map((item) => sanitizeHypothesis(item, caseIncomingId))
    .filter((item): item is MergeHypothesis => Boolean(item));
  const stableHypotheses = hypothesesTopK.length > 0 ? hypothesesTopK : selectedCandidateRef.hypothesesTopK;
  const selectedHypothesis = clampIndex(toFiniteNumber(value.selectedHypothesis, 0), stableHypotheses.length);
  const selectedHypothesisRef = stableHypotheses[selectedHypothesis] || stableHypotheses[0] || buildFallbackHypothesis(caseIncomingId);

  return {
    incomingId: caseIncomingId,
    baseId: typeof value.baseId === "string" ? value.baseId : selectedCandidateRef.baseId,
    riskLevel: isRisk(value.riskLevel) ? value.riskLevel : selectedHypothesisRef.riskLevel,
    priority: toFiniteNumber(value.priority, 0),
    status: isMergeCaseStatus(value.status) ? value.status : "pending",
    hypothesesTopK: stableHypotheses,
    selectedHypothesis,
    requiredActionsPlanned: (() => {
      const actions = sanitizeActions(value.requiredActionsPlanned);
      return actions.length > 0 ? actions : selectedHypothesisRef.explain.requiredActions;
    })(),
    requiredActionsApplied: isStringArray(value.requiredActionsApplied) ? value.requiredActionsApplied : [],
    needsTechnicalConflictReview:
      typeof value.needsTechnicalConflictReview === "boolean"
        ? value.needsTechnicalConflictReview
        : selectedHypothesisRef.hypothesisType === "SamePerson" ||
          selectedHypothesisRef.hypothesisType === "SamePersonAdditionalUnion" ||
          selectedHypothesisRef.hypothesisType === "SamePersonNetworkConfirmed" ||
          selectedHypothesisRef.hypothesisType === "SamePersonCriticalOverride",
    technicalConflictResolved: typeof value.technicalConflictResolved === "boolean" ? value.technicalConflictResolved : false,
    lockedReason: typeof value.lockedReason === "string" ? value.lockedReason : undefined,
    selectedCandidate,
    candidates
  };
}

function defaultAutoRules(preset: MergeReviewPreset): MergeReviewAutoRules {
  if (preset === "strict") {
    return {
      lowAutoScoreMin: 92,
      lowAutoCoverageMin: 0.7,
      lowAutoDeltaMin: 14,
      mediumAutoScoreMin: 92,
      mediumAutoCoverageMin: 0.7,
      mediumAutoDeltaMin: 14
    };
  }
  if (preset === "fast") {
    return {
      lowAutoScoreMin: 80,
      lowAutoCoverageMin: 0.52,
      lowAutoDeltaMin: 10,
      mediumAutoScoreMin: 80,
      mediumAutoCoverageMin: 0.52,
      mediumAutoDeltaMin: 10
    };
  }
  return {
    lowAutoScoreMin: 86,
    lowAutoCoverageMin: 0.62,
    lowAutoDeltaMin: 12,
    mediumAutoScoreMin: 86,
    mediumAutoCoverageMin: 0.62,
    mediumAutoDeltaMin: 12
  };
}

function sanitizeActionJournal(value: unknown): MergeReviewActionEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MergeReviewActionEntry =>
      isRecord(item) &&
      typeof item.actionId === "string" &&
      typeof item.incomingId === "string" &&
      isRecord(item.action) &&
      typeof item.appliedAt === "string" &&
      typeof item.source === "string"
  );
}

function sanitizeSession(value: unknown): MergeReviewSession | null {
  if (!isRecord(value) || !isRecord(value.cases)) return null;
  const preset = isMergeReviewPreset(value.preset) ? value.preset : "balanced";
  const autoRulesFallback = defaultAutoRules(preset);
  const autoRulesRaw = isRecord(value.autoRules) ? value.autoRules : {};

  const casesEntries = Object.entries(value.cases)
    .map(([incomingId, reviewCase]) => [incomingId, sanitizeCase(incomingId, reviewCase)] as const)
    .filter((entry): entry is readonly [string, MergeReviewCase] => Boolean(entry[1]));
  if (casesEntries.length === 0) return null;

  const cases = Object.fromEntries(casesEntries);
  const orderedCaseIdsFromDraft = isStringArray(value.orderedCaseIds) ? value.orderedCaseIds : [];
  const orderedCaseIds = orderedCaseIdsFromDraft.filter((incomingId) => Boolean(cases[incomingId]));
  for (const incomingId of Object.keys(cases)) {
    if (!orderedCaseIds.includes(incomingId)) orderedCaseIds.push(incomingId);
  }

  const selectedCaseIdRaw = typeof value.selectedCaseId === "string" ? value.selectedCaseId : null;
  const selectedCaseId = selectedCaseIdRaw && cases[selectedCaseIdRaw] ? selectedCaseIdRaw : orderedCaseIds[0] ?? null;
  const actionJournal = sanitizeActionJournal(value.actionJournal);

  const byRisk = Object.values(cases).reduce(
    (acc, reviewCase) => {
      acc.total += 1;
      if (reviewCase.riskLevel === "high") acc.high += 1;
      else if (reviewCase.riskLevel === "medium") acc.medium += 1;
      else acc.low += 1;
      if (reviewCase.status === "pending") acc.pending += 1;
      if (reviewCase.status === "auto_applied") acc.autoApplied += 1;
      if (reviewCase.status === "manual_applied") acc.manualApplied += 1;
      return acc;
    },
    { total: 0, high: 0, medium: 0, low: 0, pending: 0, autoApplied: 0, manualApplied: 0 }
  );

  return {
    mode: isReviewMode(value.mode) ? value.mode : "auto_deep",
    preset,
    autoRules: {
      lowAutoScoreMin: toFiniteNumber(autoRulesRaw.lowAutoScoreMin, autoRulesFallback.lowAutoScoreMin),
      lowAutoCoverageMin: toFiniteNumber(autoRulesRaw.lowAutoCoverageMin, autoRulesFallback.lowAutoCoverageMin),
      lowAutoDeltaMin: toFiniteNumber(autoRulesRaw.lowAutoDeltaMin, autoRulesFallback.lowAutoDeltaMin),
      mediumAutoScoreMin: toFiniteNumber(autoRulesRaw.mediumAutoScoreMin, autoRulesFallback.mediumAutoScoreMin),
      mediumAutoCoverageMin: toFiniteNumber(autoRulesRaw.mediumAutoCoverageMin, autoRulesFallback.mediumAutoCoverageMin),
      mediumAutoDeltaMin: toFiniteNumber(autoRulesRaw.mediumAutoDeltaMin, autoRulesFallback.mediumAutoDeltaMin)
    },
    draft: {
      contextId: isRecord(value.draft) && typeof value.draft.contextId === "string" ? value.draft.contextId : undefined,
      updatedAt: isRecord(value.draft) && typeof value.draft.updatedAt === "string" ? value.draft.updatedAt : undefined
    },
    cases,
    orderedCaseIds,
    selectedCaseId,
    actionJournal,
    suggestedAutoMediumIds: toStringArray(value.suggestedAutoMediumIds).filter((incomingId) => Boolean(cases[incomingId])),
    gates: {
      unresolvedBlocked: toFiniteNumber(isRecord(value.gates) ? value.gates.unresolvedBlocked : 0, 0),
      unresolvedTechnical: toFiniteNumber(isRecord(value.gates) ? value.gates.unresolvedTechnical : 0, 0)
    },
    filters: {
      search: isRecord(value.filters) && typeof value.filters.search === "string" ? value.filters.search : "",
      sort: "risk_priority",
      showLowSection: isRecord(value.filters) && typeof value.filters.showLowSection === "boolean" ? value.filters.showLowSection : false
    },
    derivedStats: {
      totalCases: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.totalCases : byRisk.total, byRisk.total),
      high: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.high : byRisk.high, byRisk.high),
      medium: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.medium : byRisk.medium, byRisk.medium),
      low: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.low : byRisk.low, byRisk.low),
      pending: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.pending : byRisk.pending, byRisk.pending),
      autoApplied: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.autoApplied : byRisk.autoApplied, byRisk.autoApplied),
      manualApplied: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.manualApplied : byRisk.manualApplied, byRisk.manualApplied),
      blockedPending: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.blockedPending : 0, 0),
      technicalPending: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.technicalPending : 0, 0),
      mediumSuggested: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.mediumSuggested : 0, 0),
      mediumAutoApplied: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.mediumAutoApplied : 0, 0),
      manualOverrides: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.manualOverrides : 0, 0),
      networkConfirmed: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.networkConfirmed : 0, 0),
      criticalOverrides: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.criticalOverrides : 0, 0),
      autoDeepApplied: toFiniteNumber(isRecord(value.derivedStats) ? value.derivedStats.autoDeepApplied : 0, 0)
    }
  };
}

export function sanitizeMergeDraftSnapshot(draft: unknown): MergeDraftSnapshot | null {
  if (!isRecord(draft)) return null;
  if (typeof draft.contextId !== "string" || !draft.contextId.trim()) return null;
  if (draft.schemaVersion !== undefined && draft.schemaVersion !== 1) return null;

  const session = sanitizeSession(draft.session);
  if (!session) return null;
  if (!isMergeReviewStep(draft.step) && typeof draft.step !== "string") return null;

  return {
    schemaVersion: draft.schemaVersion === 1 ? 1 : undefined,
    contextId: draft.contextId,
    step: isMergeReviewStep(draft.step) ? draft.step : "strategy",
    session,
    workingDiff: isRecord(draft.workingDiff) || draft.workingDiff === null ? (draft.workingDiff as MergeDraftSnapshot["workingDiff"]) : null,
    updatedAt: typeof draft.updatedAt === "string" ? draft.updatedAt : new Date().toISOString()
  };
}

export function validateMergeDraftSnapshot(draft: unknown): draft is MergeDraftSnapshot {
  return sanitizeMergeDraftSnapshot(draft) !== null;
}

export function isValidMergeReviewStep(value: unknown): value is MergeReviewStep {
  return isMergeReviewStep(value);
}
