import { calculateDiff, type DataDiff } from "@/core/edit/diff";
import { applyDiff } from "@/core/edit/merge";
import { scoreMatch, type MatchCandidate, type MatchResult } from "@/core/edit/personMatcher";
import type { MergeAction, MergeExplain, MergeHypothesis, MergeRiskLevel, Person } from "@/types/domain";
import type {
  MergeReviewActionEntry,
  MergeReviewAutoRules,
  MergeReviewActionSource,
  MergeReviewCandidateOption,
  MergeReviewCase,
  MergeReviewDerivedStats,
  MergeReviewPreset,
  MergeReviewSession,
  MergeSessionPreview
} from "@/types/merge-review";
import type { GraphDocument } from "@/types/domain";

type CaseStatus = MergeReviewCase["status"];

type DiffEvidenceCandidate = NonNullable<DataDiff["matchEvidence"]>[string]["candidates"][number];

const PRESET_AUTO_RULES: Record<MergeReviewPreset, MergeReviewAutoRules> = {
  strict: {
    lowAutoScoreMin: 92,
    lowAutoCoverageMin: 0.7,
    lowAutoDeltaMin: 14,
    mediumAutoScoreMin: 92,
    mediumAutoCoverageMin: 0.7,
    mediumAutoDeltaMin: 14
  },
  balanced: {
    lowAutoScoreMin: 86,
    lowAutoCoverageMin: 0.62,
    lowAutoDeltaMin: 12,
    mediumAutoScoreMin: 86,
    mediumAutoCoverageMin: 0.62,
    mediumAutoDeltaMin: 12
  },
  fast: {
    lowAutoScoreMin: 80,
    lowAutoCoverageMin: 0.52,
    lowAutoDeltaMin: 10,
    mediumAutoScoreMin: 80,
    mediumAutoCoverageMin: 0.52,
    mediumAutoDeltaMin: 10
  }
};

function buildAutoRules(preset: MergeReviewPreset): MergeReviewAutoRules {
  return { ...PRESET_AUTO_RULES[preset] };
}

function cloneAction(action: MergeAction): MergeAction {
  return structuredClone(action);
}

function cloneHypothesis(hypothesis: MergeHypothesis): MergeHypothesis {
  return structuredClone(hypothesis);
}

function cloneExplain(explain: MergeExplain): MergeExplain {
  return structuredClone(explain);
}

function normalizeConfidence(score: number): "high" | "medium" | "low" {
  if (score >= 85) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function riskRank(risk: MergeRiskLevel): number {
  if (risk === "high") return 3;
  if (risk === "medium") return 2;
  return 1;
}

function isMergeHypothesis(hypothesis: MergeHypothesis): boolean {
  return (
    hypothesis.hypothesisType === "SamePerson" ||
    hypothesis.hypothesisType === "SamePersonAdditionalUnion" ||
    hypothesis.hypothesisType === "SamePersonNetworkConfirmed" ||
    hypothesis.hypothesisType === "SamePersonCriticalOverride"
  );
}

function hypothesisNeedsTechnicalReview(hypothesis: MergeHypothesis): boolean {
  return isMergeHypothesis(hypothesis);
}

function hasHardBlocker(candidate: MergeReviewCandidateOption): boolean {
  return candidate.blockers.some((blocker) => blocker.severity !== "soft");
}

function hasCriticalBlocker(candidate: MergeReviewCandidateOption): boolean {
  return candidate.blockers.some((blocker) => blocker.severity === "criticalHardConflict");
}

function selectedHypothesisDelta(candidate: MergeReviewCandidateOption): number {
  const first = candidate.hypothesesTopK[0];
  const second = candidate.hypothesesTopK[1];
  if (!first || !second) return 100;
  return first.scoreFinal - second.scoreFinal;
}

function isLowAutoEligible(reviewCase: MergeReviewCase, candidate: MergeReviewCandidateOption, preset: MergeReviewPreset, autoRules: MergeReviewAutoRules): boolean {
  const selectedHypothesis = reviewCase.hypothesesTopK[reviewCase.selectedHypothesis] || reviewCase.hypothesesTopK[0];
  if (!selectedHypothesis || !isMergeHypothesis(selectedHypothesis)) return false;
  if (reviewCase.riskLevel !== "low") return false;
  if (candidate.score < autoRules.lowAutoScoreMin) return false;
  if (selectedHypothesis.explain.coverage.coverageRatio < autoRules.lowAutoCoverageMin) return false;
  if (selectedHypothesisDelta(candidate) < autoRules.lowAutoDeltaMin) return false;
  if (preset === "fast") return !hasCriticalBlocker(candidate);
  return !hasHardBlocker(candidate);
}

function isMediumAutoSuggested(reviewCase: MergeReviewCase, candidate: MergeReviewCandidateOption, preset: MergeReviewPreset, autoRules: MergeReviewAutoRules): boolean {
  if (preset === "strict") return false;
  const selectedHypothesis = reviewCase.hypothesesTopK[reviewCase.selectedHypothesis] || reviewCase.hypothesesTopK[0];
  if (!selectedHypothesis || !isMergeHypothesis(selectedHypothesis)) return false;
  if (reviewCase.riskLevel !== "medium") return false;
  if (candidate.score < autoRules.mediumAutoScoreMin) return false;
  if (selectedHypothesis.explain.coverage.coverageRatio < autoRules.mediumAutoCoverageMin) return false;
  if (selectedHypothesisDelta(candidate) < autoRules.mediumAutoDeltaMin) return false;
  if (preset === "fast") return !hasCriticalBlocker(candidate);
  return !hasHardBlocker(candidate);
}

function findSelectedHypothesis(reviewCase: MergeReviewCase): MergeHypothesis {
  const hypothesis = reviewCase.hypothesesTopK[reviewCase.selectedHypothesis];
  if (hypothesis) return hypothesis;
  if (reviewCase.hypothesesTopK[0]) return reviewCase.hypothesesTopK[0];
  console.warn("MERGE_CASE_INVARIANT", { reason: "missing_selected_hypothesis", incomingId: reviewCase.incomingId });
  return createSyntheticCreateCandidate(reviewCase.incomingId).hypothesesTopK[0];
}

function createSyntheticCreateCandidate(incomingId: string): MergeReviewCandidateOption {
  const explain: MergeExplain = {
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
    decisionReason: "Sin evidencia suficiente de merge. Crear persona nueva.",
    requiredActions: [{ kind: "create_person", incomingId, preferredId: incomingId }]
  };
  const hypothesis: MergeHypothesis = {
    hypothesisType: "CreateNewPerson",
    scoreFinal: 62,
    riskLevel: "medium",
    explain
  };
  return {
    baseId: incomingId,
    score: hypothesis.scoreFinal,
    confidence: "low",
    riskLevel: hypothesis.riskLevel,
    blockers: [],
    signals: ["Fallback: create new person"],
    qualityFlags: ["synthetic-create"],
    hypothesesTopK: [cloneHypothesis(hypothesis)],
    chosenHypothesis: cloneHypothesis(hypothesis),
    requiredActions: hypothesis.explain.requiredActions.map((action) => cloneAction(action)),
    explain: cloneExplain(hypothesis.explain),
    source: "synthetic-create"
  };
}

function clampIndex(index: number, size: number): number {
  if (size <= 0) return 0;
  return Math.max(0, Math.min(index, size - 1));
}

function ensureCandidateIntegrity(candidate: MergeReviewCandidateOption | undefined, incomingId: string): MergeReviewCandidateOption {
  if (!candidate) {
    console.warn("MERGE_CASE_INVARIANT", { reason: "missing_candidate", incomingId });
    return createSyntheticCreateCandidate(incomingId);
  }
  const fallback = createSyntheticCreateCandidate(incomingId);
  const hypothesesTopK = Array.isArray(candidate.hypothesesTopK) && candidate.hypothesesTopK.length > 0
    ? candidate.hypothesesTopK.map((hypothesis) => cloneHypothesis(hypothesis))
    : fallback.hypothesesTopK.map((hypothesis) => cloneHypothesis(hypothesis));
  if (!Array.isArray(candidate.hypothesesTopK) || candidate.hypothesesTopK.length === 0) {
    console.warn("MERGE_CASE_INVARIANT", { reason: "candidate_without_hypotheses", incomingId });
  }
  const chosenHypothesis = candidate.chosenHypothesis ? cloneHypothesis(candidate.chosenHypothesis) : cloneHypothesis(hypothesesTopK[0]);
  const explain = candidate.explain ? cloneExplain(candidate.explain) : cloneExplain(chosenHypothesis.explain);
  const requiredActions = Array.isArray(candidate.requiredActions) && candidate.requiredActions.length > 0
    ? candidate.requiredActions.map((action) => cloneAction(action))
    : chosenHypothesis.explain.requiredActions.map((action) => cloneAction(action));
  return {
    ...fallback,
    ...candidate,
    blockers: Array.isArray(candidate.blockers) ? candidate.blockers.map((blocker) => ({ ...blocker })) : [],
    signals: Array.isArray(candidate.signals) ? [...candidate.signals] : [],
    qualityFlags: Array.isArray(candidate.qualityFlags) ? [...candidate.qualityFlags] : [],
    hypothesesTopK,
    chosenHypothesis,
    requiredActions,
    explain
  };
}

function ensureCaseIntegrity(reviewCase: MergeReviewCase, fallbackIncomingId: string): MergeReviewCase {
  const incomingId = reviewCase?.incomingId || fallbackIncomingId;
  const candidatesRaw = Array.isArray(reviewCase?.candidates) ? reviewCase.candidates : [];
  const candidates = candidatesRaw.length > 0
    ? candidatesRaw.map((candidate) => ensureCandidateIntegrity(candidate, incomingId))
    : [createSyntheticCreateCandidate(incomingId)];
  if (!Array.isArray(reviewCase?.candidates) || reviewCase.candidates.length === 0) {
    console.warn("MERGE_CASE_INVARIANT", { reason: "case_without_candidates", incomingId });
  }
  const selectedCandidate = clampIndex(reviewCase?.selectedCandidate ?? 0, candidates.length);
  const selectedCandidateRef = candidates[selectedCandidate];
  const hypothesesTopK = Array.isArray(reviewCase?.hypothesesTopK) && reviewCase.hypothesesTopK.length > 0
    ? reviewCase.hypothesesTopK.map((hypothesis) => cloneHypothesis(hypothesis))
    : selectedCandidateRef.hypothesesTopK.map((hypothesis) => cloneHypothesis(hypothesis));
  if (!Array.isArray(reviewCase?.hypothesesTopK) || reviewCase.hypothesesTopK.length === 0) {
    console.warn("MERGE_CASE_INVARIANT", { reason: "case_without_hypotheses", incomingId });
  }
  const selectedHypothesis = clampIndex(reviewCase?.selectedHypothesis ?? 0, hypothesesTopK.length);
  const chosen = hypothesesTopK[selectedHypothesis] ?? hypothesesTopK[0];
  const requiredActionsPlanned = Array.isArray(reviewCase?.requiredActionsPlanned) && reviewCase.requiredActionsPlanned.length > 0
    ? reviewCase.requiredActionsPlanned.map((action) => cloneAction(action))
    : chosen.explain.requiredActions.map((action) => cloneAction(action));
  const requiredActionsApplied = Array.isArray(reviewCase?.requiredActionsApplied)
    ? reviewCase.requiredActionsApplied.filter((actionId): actionId is string => typeof actionId === "string")
    : [];
  const status: CaseStatus = reviewCase?.status === "auto_applied" || reviewCase?.status === "manual_applied" || reviewCase?.status === "pending"
    ? reviewCase.status
    : "pending";

  return {
    ...reviewCase,
    incomingId,
    baseId: selectedCandidateRef.baseId,
    riskLevel: chosen.riskLevel,
    priority: Number.isFinite(reviewCase?.priority) ? reviewCase.priority : 0,
    status,
    hypothesesTopK,
    selectedHypothesis,
    requiredActionsPlanned,
    requiredActionsApplied,
    needsTechnicalConflictReview:
      typeof reviewCase?.needsTechnicalConflictReview === "boolean"
        ? reviewCase.needsTechnicalConflictReview
        : hypothesisNeedsTechnicalReview(chosen),
    technicalConflictResolved:
      typeof reviewCase?.technicalConflictResolved === "boolean"
        ? reviewCase.technicalConflictResolved
        : !hypothesisNeedsTechnicalReview(chosen),
    lockedReason: typeof reviewCase?.lockedReason === "string" ? reviewCase.lockedReason : undefined,
    selectedCandidate,
    candidates
  };
}

function candidateFromMatchCandidate(candidate: MatchCandidate): MergeReviewCandidateOption {
  return {
    baseId: candidate.baseId,
    score: candidate.score,
    confidence: candidate.confidence,
    riskLevel: candidate.riskLevel,
    blockers: candidate.blockers.map((blocker) => ({ ...blocker })),
    signals: [...candidate.signals],
    qualityFlags: [...candidate.qualityFlags],
    hypothesesTopK: candidate.hypothesesTopK.map((hypothesis) => cloneHypothesis(hypothesis)),
    chosenHypothesis: cloneHypothesis(candidate.chosenHypothesis),
    requiredActions: candidate.requiredActions.map((action) => cloneAction(action)),
    explain: cloneExplain(candidate.explain),
    source: "match-candidate"
  };
}

function candidateFromAutoMatch(
  incomingPerson: Person,
  basePerson: Person,
  incomingDoc: GraphDocument,
  baseDoc: GraphDocument
): MergeReviewCandidateOption {
  const scored = scoreMatch(incomingPerson, basePerson, incomingDoc, baseDoc);
  return {
    baseId: basePerson.id,
    score: scored.score,
    confidence: scored.confidence,
    riskLevel: scored.riskLevel,
    blockers: scored.blockers.map((blocker) => ({ ...blocker })),
    signals: [...scored.signals],
    qualityFlags: [...scored.qualityFlags],
    hypothesesTopK: scored.hypothesesTopK.map((hypothesis) => cloneHypothesis(hypothesis)),
    chosenHypothesis: cloneHypothesis(scored.chosenHypothesis),
    requiredActions: scored.requiredActions.map((action) => cloneAction(action)),
    explain: cloneExplain(scored.explain),
    source: "match-candidate"
  };
}

function uniqueCandidates(candidates: MergeReviewCandidateOption[]): MergeReviewCandidateOption[] {
  const used = new Set<string>();
  const out: MergeReviewCandidateOption[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.baseId || ""}:${candidate.hypothesesTopK[0]?.hypothesisType || "CreateNewPerson"}`;
    if (used.has(key)) continue;
    used.add(key);
    out.push(candidate);
  }
  return out;
}

function chooseInitialCandidateIndex(candidates: MergeReviewCandidateOption[], preferredBaseId?: string): number {
  if (!preferredBaseId) return 0;
  const idx = candidates.findIndex((candidate) => candidate.baseId === preferredBaseId);
  return idx >= 0 ? idx : 0;
}

function createCaseFromSelection(
  incomingId: string,
  priority: number,
  candidateIndex: number,
  candidates: MergeReviewCandidateOption[]
): MergeReviewCase {
  const safeCandidates =
    candidates.length > 0
      ? candidates.map((candidate) => ensureCandidateIntegrity(candidate, incomingId))
      : [createSyntheticCreateCandidate(incomingId)];
  const selected = safeCandidates[clampIndex(candidateIndex, safeCandidates.length)];
  const selectedHypothesis = selected.hypothesesTopK[0];
  return ensureCaseIntegrity({
    incomingId,
    baseId: selected.baseId,
    riskLevel: selectedHypothesis.riskLevel,
    priority,
    status: "pending",
    hypothesesTopK: selected.hypothesesTopK.map((hypothesis) => cloneHypothesis(hypothesis)),
    selectedHypothesis: 0,
    requiredActionsPlanned: selectedHypothesis.explain.requiredActions.map((action) => cloneAction(action)),
    requiredActionsApplied: [],
    needsTechnicalConflictReview: hypothesisNeedsTechnicalReview(selectedHypothesis),
    technicalConflictResolved: !hypothesisNeedsTechnicalReview(selectedHypothesis),
    lockedReason: selectedHypothesis.riskLevel === "high" ? "Caso de alto riesgo requiere decision manual." : undefined,
    selectedCandidate: clampIndex(candidateIndex, safeCandidates.length),
    candidates: safeCandidates
  }, incomingId);
}

function updateDerivedStats(session: MergeReviewSession): MergeReviewSession {
  const normalizedCases = Object.fromEntries(
    Object.entries(session.cases).map(([incomingId, reviewCase]) => [incomingId, ensureCaseIntegrity(reviewCase, incomingId)])
  ) as Record<string, MergeReviewCase>;
  const normalizedSession: MergeReviewSession = {
    ...session,
    cases: normalizedCases
  };
  const suggestedAutoMediumIds = session.orderedCaseIds.filter((incomingId) => {
    const reviewCase = normalizedSession.cases[incomingId];
    if (!reviewCase || reviewCase.status !== "pending") return false;
    const selectedCandidate = reviewCase.candidates[reviewCase.selectedCandidate];
    if (!selectedCandidate) return false;
    return isMediumAutoSuggested(reviewCase, selectedCandidate, normalizedSession.preset, normalizedSession.autoRules);
  });

  const cases = Object.values(normalizedSession.cases);
  const mediumAutoApplied = normalizedSession.actionJournal.filter((entry) => entry.source === "auto-medium" && !entry.revertedAt).length;
  const autoLowApplied = normalizedSession.actionJournal.filter((entry) => entry.source === "auto-low" && !entry.revertedAt).length;
  const manualOverrides = normalizedSession.actionJournal.filter(
    (entry) => (entry.source === "manual" || entry.source === "batch-manual") && !entry.revertedAt
  ).length;
  const networkConfirmed = cases.filter((item) => {
    const hypothesis = item.hypothesesTopK[item.selectedHypothesis] || item.hypothesesTopK[0];
    return hypothesis?.hypothesisType === "SamePersonNetworkConfirmed";
  }).length;
  const criticalOverrides = cases.filter((item) => {
    const hypothesis = item.hypothesesTopK[item.selectedHypothesis] || item.hypothesesTopK[0];
    return hypothesis?.hypothesisType === "SamePersonCriticalOverride";
  }).length;
  const stats: MergeReviewDerivedStats = {
    totalCases: cases.length,
    high: cases.filter((item) => item.riskLevel === "high").length,
    medium: cases.filter((item) => item.riskLevel === "medium").length,
    low: cases.filter((item) => item.riskLevel === "low").length,
    pending: cases.filter((item) => item.status === "pending").length,
    autoApplied: cases.filter((item) => item.status === "auto_applied").length,
    manualApplied: cases.filter((item) => item.status === "manual_applied").length,
    blockedPending: cases.filter((item) => item.riskLevel === "high" && item.status === "pending").length,
    technicalPending: cases.filter(
      (item) => item.needsTechnicalConflictReview && !item.technicalConflictResolved && item.status !== "pending"
    ).length,
    mediumSuggested: suggestedAutoMediumIds.length,
    mediumAutoApplied,
    manualOverrides,
    networkConfirmed,
    criticalOverrides,
    autoDeepApplied: autoLowApplied + mediumAutoApplied
  };

  return {
    ...session,
    draft: {
      ...normalizedSession.draft,
      updatedAt: new Date().toISOString()
    },
    suggestedAutoMediumIds,
    derivedStats: stats,
    cases: normalizedCases,
    gates: {
      unresolvedBlocked: stats.blockedPending,
      unresolvedTechnical: stats.technicalPending
    }
  };
}

function sortCaseIds(cases: Record<string, MergeReviewCase>): string[] {
  return Object.values(cases)
    .sort((left, right) => {
      const riskDelta = riskRank(right.riskLevel) - riskRank(left.riskLevel);
      if (riskDelta !== 0) return riskDelta;
      if (left.priority !== right.priority) return right.priority - left.priority;
      return left.incomingId.localeCompare(right.incomingId);
    })
    .map((item) => item.incomingId);
}

function clearActiveCaseActions(
  session: MergeReviewSession,
  incomingId: string,
  nowIso: string
): { session: MergeReviewSession; hadActive: boolean } {
  const reviewCase = session.cases[incomingId];
  if (!reviewCase) return { session, hadActive: false };
  const activeIds = new Set(reviewCase.requiredActionsApplied);
  if (activeIds.size === 0) return { session, hadActive: false };

  const actionJournal = session.actionJournal.map((entry) =>
    activeIds.has(entry.actionId) && !entry.revertedAt
      ? {
          ...entry,
          revertedAt: nowIso
        }
      : entry
  );

  const nextCase: MergeReviewCase = {
    ...reviewCase,
    status: "pending",
    requiredActionsApplied: [],
    lockedReason: reviewCase.riskLevel === "high" ? "Caso de alto riesgo requiere decision manual." : undefined
  };

  return {
    session: {
      ...session,
      cases: {
        ...session.cases,
        [incomingId]: nextCase
      },
      actionJournal
    },
    hadActive: true
  };
}

function buildPriorityMap(matchResult: MatchResult): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of matchResult.reviewQueue) {
    map.set(item.incomingId, item.priority);
  }
  return map;
}

function createCaseCandidates(
  incomingId: string,
  baseDoc: GraphDocument,
  incomingDoc: GraphDocument,
  matchResult: MatchResult
): { candidates: MergeReviewCandidateOption[]; preferredBaseId?: string } {
  const out: MergeReviewCandidateOption[] = [];
  const ambiguous = matchResult.ambiguousMatches.get(incomingId) ?? [];
  for (const candidate of ambiguous) {
    out.push(candidateFromMatchCandidate(candidate));
  }

  const autoBaseId = matchResult.autoMatches.get(incomingId);
  if (autoBaseId && incomingDoc.persons[incomingId] && baseDoc.persons[autoBaseId]) {
    out.push(candidateFromAutoMatch(incomingDoc.persons[incomingId], baseDoc.persons[autoBaseId], incomingDoc, baseDoc));
  }

  out.push(createSyntheticCreateCandidate(incomingId));
  return {
    candidates: uniqueCandidates(out),
    preferredBaseId: autoBaseId
  };
}

function updateCaseSelection(
  reviewCase: MergeReviewCase,
  selectedCandidate: number,
  selectedHypothesis: number
): MergeReviewCase {
  const normalizedCase = ensureCaseIntegrity(reviewCase, reviewCase.incomingId);
  const candidate = normalizedCase.candidates[clampIndex(selectedCandidate, normalizedCase.candidates.length)];
  const hypothesesTopK = candidate.hypothesesTopK.map((hypothesis) => cloneHypothesis(hypothesis));
  const nextHypothesisIdx = clampIndex(selectedHypothesis, hypothesesTopK.length);
  const chosen = hypothesesTopK[nextHypothesisIdx] ?? hypothesesTopK[0];
  return ensureCaseIntegrity({
    ...normalizedCase,
    baseId: candidate.baseId,
    riskLevel: chosen.riskLevel,
    hypothesesTopK,
    selectedHypothesis: nextHypothesisIdx,
    requiredActionsPlanned: chosen.explain.requiredActions.map((action) => cloneAction(action)),
    needsTechnicalConflictReview: hypothesisNeedsTechnicalReview(chosen),
    technicalConflictResolved: !hypothesisNeedsTechnicalReview(chosen),
    lockedReason: chosen.riskLevel === "high" ? "Caso de alto riesgo requiere decision manual." : undefined,
    selectedCandidate: clampIndex(selectedCandidate, normalizedCase.candidates.length)
  }, normalizedCase.incomingId);
}

function withSessionPatch(session: MergeReviewSession, patch: Partial<MergeReviewSession>): MergeReviewSession {
  return updateDerivedStats({
    ...session,
    ...patch
  });
}

export function buildInitialReviewSession(
  baseDoc: GraphDocument,
  incomingDoc: GraphDocument,
  matchResult: MatchResult,
  preset: MergeReviewPreset = "balanced",
  contextId?: string,
  mode: "auto_deep" | "expert_workbench" = "expert_workbench"
): MergeReviewSession {
  const autoRules = buildAutoRules(preset);
  const priorityMap = buildPriorityMap(matchResult);
  const caseMap: Record<string, MergeReviewCase> = {};
  const incomingIds = Object.keys(incomingDoc.persons).sort((a, b) => a.localeCompare(b));

  for (const incomingId of incomingIds) {
    const { candidates, preferredBaseId } = createCaseCandidates(incomingId, baseDoc, incomingDoc, matchResult);
    const selectedCandidate = chooseInitialCandidateIndex(candidates, preferredBaseId);
    const selected = ensureCandidateIntegrity(candidates[selectedCandidate], incomingId);
    const priority = priorityMap.get(incomingId) ?? Math.max(10, riskRank(selected.riskLevel) * 30);
    caseMap[incomingId] = createCaseFromSelection(incomingId, priority, selectedCandidate, candidates);
    caseMap[incomingId] = ensureCaseIntegrity(caseMap[incomingId], incomingId);
  }

  const orderedCaseIds = sortCaseIds(caseMap);
  let session: MergeReviewSession = updateDerivedStats({
    mode,
    preset,
    autoRules,
    draft: {
      contextId,
      updatedAt: new Date().toISOString()
    },
    cases: caseMap,
    orderedCaseIds,
    selectedCaseId: orderedCaseIds[0] ?? null,
    actionJournal: [],
    suggestedAutoMediumIds: [],
    gates: { unresolvedBlocked: 0, unresolvedTechnical: 0 },
    filters: {
      search: "",
      sort: "risk_priority",
      showLowSection: false
    },
    derivedStats: {
      totalCases: 0,
      high: 0,
      medium: 0,
      low: 0,
      pending: 0,
      autoApplied: 0,
      manualApplied: 0,
      blockedPending: 0,
      technicalPending: 0,
      mediumSuggested: 0,
      mediumAutoApplied: 0,
      manualOverrides: 0,
      networkConfirmed: 0,
      criticalOverrides: 0,
      autoDeepApplied: 0
    }
  });

  for (const incomingId of session.orderedCaseIds) {
    const reviewCase = session.cases[incomingId];
    if (!reviewCase) continue;
    const selectedCandidate = reviewCase.candidates[reviewCase.selectedCandidate];
    if (!selectedCandidate) {
      console.warn("MERGE_CASE_INVARIANT", { reason: "missing_selected_candidate_during_auto", incomingId });
      continue;
    }
    if (isLowAutoEligible(reviewCase, selectedCandidate, preset, autoRules)) {
      session = applyCaseDecision(session, incomingId, "auto-low");
      continue;
    }
    if ((mode === "auto_deep" || preset === "fast") && isMediumAutoSuggested(reviewCase, selectedCandidate, preset, autoRules)) {
      session = applyCaseDecision(session, incomingId, "auto-medium");
    }
  }

  return updateDerivedStats(session);
}

export function setSelectedCase(session: MergeReviewSession, incomingId: string): MergeReviewSession {
  if (!session.cases[incomingId]) return session;
  return withSessionPatch(session, { selectedCaseId: incomingId });
}

export function setReviewSearch(session: MergeReviewSession, search: string): MergeReviewSession {
  return withSessionPatch(session, {
    filters: {
      ...session.filters,
      search
    }
  });
}

export function setLowSectionVisibility(session: MergeReviewSession, visible: boolean): MergeReviewSession {
  return withSessionPatch(session, {
    filters: {
      ...session.filters,
      showLowSection: visible
    }
  });
}

export function setReviewPreset(session: MergeReviewSession, preset: MergeReviewPreset): MergeReviewSession {
  return withSessionPatch(session, {
    preset,
    autoRules: buildAutoRules(preset)
  });
}

export function autoApplySuggestedMedium(session: MergeReviewSession): MergeReviewSession {
  let next = session;
  const targetIds = [...session.suggestedAutoMediumIds];
  for (const incomingId of targetIds) {
    const reviewCase = next.cases[incomingId];
    if (!reviewCase || reviewCase.status !== "pending") continue;
    next = applyCaseDecision(next, incomingId, "auto-medium");
  }
  return updateDerivedStats(next);
}

export function revertAutoAppliedMedium(session: MergeReviewSession): MergeReviewSession {
  let next = session;
  const actionIds = session.actionJournal
    .filter((entry) => entry.source === "auto-medium" && !entry.revertedAt)
    .map((entry) => entry.actionId);
  for (const actionId of actionIds) {
    next = revertAction(next, actionId);
  }
  return updateDerivedStats(next);
}

export function applySuggestedMediumAsManual(session: MergeReviewSession): MergeReviewSession {
  let next = session;
  const targetIds = [...session.suggestedAutoMediumIds];
  for (const incomingId of targetIds) {
    const reviewCase = next.cases[incomingId];
    if (!reviewCase || reviewCase.status !== "pending") continue;
    next = applyCaseDecision(next, incomingId, "batch-manual");
  }
  return updateDerivedStats(next);
}

export function selectCaseCandidate(session: MergeReviewSession, incomingId: string, candidateIndex: number): MergeReviewSession {
  const existing = session.cases[incomingId];
  if (!existing) return session;
  const nowIso = new Date().toISOString();
  const cleared = clearActiveCaseActions(session, incomingId, nowIso).session;
  const baseCase = cleared.cases[incomingId];
  const nextCase = updateCaseSelection(baseCase, candidateIndex, 0);
  const nextCases = {
    ...cleared.cases,
    [incomingId]: {
      ...nextCase,
      status: "pending" as CaseStatus,
      requiredActionsApplied: []
    }
  };
  return updateDerivedStats({
    ...cleared,
    cases: nextCases,
    selectedCaseId: incomingId
  });
}

export function selectCaseHypothesis(session: MergeReviewSession, incomingId: string, hypothesisIndex: number): MergeReviewSession {
  const existing = session.cases[incomingId];
  if (!existing) return session;
  const nowIso = new Date().toISOString();
  const cleared = clearActiveCaseActions(session, incomingId, nowIso).session;
  const baseCase = cleared.cases[incomingId];
  const nextCase = updateCaseSelection(baseCase, baseCase.selectedCandidate, hypothesisIndex);
  const nextCases = {
    ...cleared.cases,
    [incomingId]: {
      ...nextCase,
      status: "pending" as CaseStatus,
      requiredActionsApplied: []
    }
  };
  return updateDerivedStats({
    ...cleared,
    cases: nextCases,
    selectedCaseId: incomingId
  });
}

export function applyCaseDecision(
  session: MergeReviewSession,
  incomingId: string,
  source: MergeReviewActionSource = "manual"
): MergeReviewSession {
  const reviewCase = session.cases[incomingId];
  if (!reviewCase) return session;
  const nowIso = new Date().toISOString();
  const clearedResult = clearActiveCaseActions(session, incomingId, nowIso);
  let next = clearedResult.session;
  const caseAfterClear = next.cases[incomingId];
  const planned = caseAfterClear.requiredActionsPlanned.map((action) => cloneAction(action));

  let actionJournal = [...next.actionJournal];
  const appliedIds: string[] = [];
  for (const action of planned) {
    const actionId = `mra_${String(actionJournal.length + 1).padStart(6, "0")}`;
    const entry: MergeReviewActionEntry = {
      actionId,
      incomingId,
      action,
      source,
      appliedAt: nowIso,
      revertible: true
    };
    actionJournal.push(entry);
    appliedIds.push(actionId);
  }

  const nextCase: MergeReviewCase = {
    ...caseAfterClear,
    status: source === "auto-low" || source === "auto-medium" ? "auto_applied" : "manual_applied",
    requiredActionsApplied: appliedIds,
    technicalConflictResolved: !caseAfterClear.needsTechnicalConflictReview,
    lockedReason: undefined
  };

  next = {
    ...next,
    actionJournal,
    cases: {
      ...next.cases,
      [incomingId]: nextCase
    },
    selectedCaseId: incomingId
  };
  return updateDerivedStats(next);
}

export function moveCaseSelection(session: MergeReviewSession, direction: -1 | 1): MergeReviewSession {
  if (!session.selectedCaseId || session.orderedCaseIds.length === 0) return session;
  const idx = session.orderedCaseIds.indexOf(session.selectedCaseId);
  if (idx < 0) return session;
  const nextIdx = Math.max(0, Math.min(session.orderedCaseIds.length - 1, idx + direction));
  return withSessionPatch(session, {
    selectedCaseId: session.orderedCaseIds[nextIdx]
  });
}

export function revertAction(session: MergeReviewSession, actionId: string): MergeReviewSession {
  const target = session.actionJournal.find((entry) => entry.actionId === actionId);
  if (!target || target.revertedAt) return session;
  const nowIso = new Date().toISOString();
  const actionJournal = session.actionJournal.map((entry) =>
    entry.actionId === actionId
      ? {
          ...entry,
          revertedAt: nowIso
        }
      : entry
  );

  const reviewCase = session.cases[target.incomingId];
  if (!reviewCase) {
    return updateDerivedStats({
      ...session,
      actionJournal
    });
  }
  const remainingApplied = reviewCase.requiredActionsApplied.filter((id) => id !== actionId);
  const nextCase: MergeReviewCase = {
    ...reviewCase,
    requiredActionsApplied: remainingApplied,
    status: remainingApplied.length > 0 ? reviewCase.status : "pending",
    lockedReason: remainingApplied.length === 0 && reviewCase.riskLevel === "high"
      ? "Caso de alto riesgo requiere decision manual."
      : reviewCase.lockedReason
  };

  return updateDerivedStats({
    ...session,
    actionJournal,
    cases: {
      ...session.cases,
      [target.incomingId]: nextCase
    }
  });
}

function activeActionsForCase(session: MergeReviewSession, incomingId: string): MergeAction[] {
  const reviewCase = session.cases[incomingId];
  if (!reviewCase) return [];
  const activeSet = new Set(reviewCase.requiredActionsApplied);
  return session.actionJournal
    .filter((entry) => activeSet.has(entry.actionId) && !entry.revertedAt)
    .map((entry) => cloneAction(entry.action));
}

function buildResolvedMatches(session: MergeReviewSession): Map<string, string> {
  const resolved = new Map<string, string>();
  for (const reviewCase of Object.values(session.cases)) {
    if (reviewCase.status === "pending") continue;
    if (!reviewCase.baseId) continue;
    const selectedHypothesis = findSelectedHypothesis(reviewCase);
    if (!isMergeHypothesis(selectedHypothesis)) continue;
    if (reviewCase.requiredActionsApplied.length === 0) continue;
    resolved.set(reviewCase.incomingId, reviewCase.baseId);
  }
  return resolved;
}

function toDiffEvidenceCandidate(
  reviewCase: MergeReviewCase,
  candidate: MergeReviewCandidateOption,
  isSelectedCandidate: boolean,
  activeActions: MergeAction[]
): DiffEvidenceCandidate {
  if (!isSelectedCandidate) {
    return {
      baseId: candidate.baseId || reviewCase.incomingId,
      score: candidate.score,
      confidence: candidate.confidence,
      blockers: candidate.blockers.map((blocker) => `${blocker.severity}:${blocker.code}`),
      signals: [...candidate.signals],
      qualityFlags: [...candidate.qualityFlags],
      riskLevel: candidate.riskLevel,
      chosenHypothesisType: candidate.chosenHypothesis.hypothesisType,
      requiredActions: candidate.requiredActions.map((action) => cloneAction(action)),
      explain: cloneExplain(candidate.explain),
      chosenHypothesis: cloneHypothesis(candidate.chosenHypothesis),
      hypothesesTopK: candidate.hypothesesTopK.map((hypothesis) => cloneHypothesis(hypothesis))
    };
  }

  const selectedHypothesis = findSelectedHypothesis(reviewCase);
  return {
    baseId: reviewCase.baseId || reviewCase.incomingId,
    score: selectedHypothesis.scoreFinal,
    confidence: normalizeConfidence(selectedHypothesis.scoreFinal),
    blockers: selectedHypothesis.explain.blockers.map((blocker) => `${blocker.severity}:${blocker.code}`),
    signals: [...candidate.signals],
    qualityFlags: [...candidate.qualityFlags],
    riskLevel: selectedHypothesis.riskLevel,
    chosenHypothesisType: selectedHypothesis.hypothesisType,
    requiredActions: activeActions.map((action) => cloneAction(action)),
    explain: {
      ...cloneExplain(selectedHypothesis.explain),
      requiredActions: activeActions.map((action) => cloneAction(action))
    },
    chosenHypothesis: {
      ...cloneHypothesis(selectedHypothesis),
      explain: {
        ...cloneExplain(selectedHypothesis.explain),
        requiredActions: activeActions.map((action) => cloneAction(action))
      }
    },
    hypothesesTopK: reviewCase.hypothesesTopK.map((hypothesis) => cloneHypothesis(hypothesis))
  };
}

export function computeSessionPreview(
  baseDoc: GraphDocument,
  incomingDoc: GraphDocument,
  session: MergeReviewSession,
  matchResult?: MatchResult
): MergeSessionPreview {
  const resolvedMatches = buildResolvedMatches(session);
  const diff = calculateDiff(
    baseDoc,
    incomingDoc,
    resolvedMatches,
    {
      matchedHigh: resolvedMatches.size,
      ambiguous: session.derivedStats.medium + session.derivedStats.high,
      unmatched: session.derivedStats.low
    },
    matchResult
  );

  for (const incomingId of Object.keys(session.cases)) {
    const reviewCase = session.cases[incomingId];
    const selectedCandidateIndex = Math.max(0, Math.min(reviewCase.selectedCandidate, reviewCase.candidates.length - 1));
    const activeActions = activeActionsForCase(session, incomingId);
    const candidates = reviewCase.candidates.map((candidate, index) =>
      toDiffEvidenceCandidate(reviewCase, candidate, index === selectedCandidateIndex, activeActions)
    );
    diff.matchEvidence = diff.matchEvidence || {};
    diff.matchEvidence[incomingId] = { candidates };
  }

  const revertedActions = session.actionJournal.filter((entry) => Boolean(entry.revertedAt)).length;
  diff.reviewConfig = {
    version: "v4",
    preset: session.preset,
    thresholds: {
      autoScoreMin: session.autoRules.lowAutoScoreMin,
      minDeltaVsSecond: session.autoRules.lowAutoDeltaMin,
      minCoverage: session.autoRules.lowAutoCoverageMin,
      mediumAutoScoreMin: session.autoRules.mediumAutoScoreMin,
      mediumAutoCoverageMin: session.autoRules.mediumAutoCoverageMin,
      mediumAutoDeltaMin: session.autoRules.mediumAutoDeltaMin,
      globalScoreMin: 88,
      globalSupportMin: 0.45,
      criticalOverrideScoreMin: 94,
      criticalOverrideSupportMin: 0.93,
      criticalOverrideAnchorMin: 5
    },
    stats: {
      autoAppliedMedium: session.derivedStats.mediumAutoApplied,
      revertedActions,
      networkConfirmed: session.derivedStats.networkConfirmed,
      criticalOverrides: session.derivedStats.criticalOverrides,
      globalIterations: matchResult?.stats.globalIterations ?? 0
    }
  };

  const applied = applyDiff(baseDoc, diff);
  return {
    diff,
    merged: applied.merged,
    stats: applied.stats
  };
}

export function refreshTechnicalReviewFlags(session: MergeReviewSession, diff: DataDiff): MergeReviewSession {
  const nextCases: Record<string, MergeReviewCase> = { ...session.cases };

  const personPendingByIncoming = new Set<string>();
  for (const person of Object.values(diff.persons)) {
    if (person.status !== "modified") continue;
    const hasPendingField = Object.values(person.conflicts).some((conflict) => conflict && conflict.resolution === "pending");
    const hasPendingEvents = person.eventConflicts.some((eventConflict) => eventConflict.resolution === "pending");
    if (hasPendingField || hasPendingEvents) personPendingByIncoming.add(person.incomingId);
  }

  const familyPendingByIncoming = new Set<string>();
  for (const family of Object.values(diff.families)) {
    if (family.status !== "modified") continue;
    const hasPendingSpouse = family.conflicts.husbandId?.resolution === "pending" || family.conflicts.wifeId?.resolution === "pending";
    const hasPendingChildren = family.conflicts.childrenConflicts.some((conflict) => conflict.resolution === "pending");
    const hasPendingEvents = family.conflicts.eventConflicts.some((eventConflict) => eventConflict.resolution === "pending");
    if (hasPendingSpouse || hasPendingChildren || hasPendingEvents) familyPendingByIncoming.add(family.incomingId);
  }

  for (const incomingId of Object.keys(nextCases)) {
    const reviewCase = nextCases[incomingId];
    if (!reviewCase.needsTechnicalConflictReview || reviewCase.status === "pending") continue;
    const stillPending = personPendingByIncoming.has(incomingId) || familyPendingByIncoming.has(incomingId);
    nextCases[incomingId] = {
      ...reviewCase,
      technicalConflictResolved: !stillPending
    };
  }

  return updateDerivedStats({
    ...session,
    cases: nextCases
  });
}

export function caseMatchesSearch(reviewCase: MergeReviewCase, incomingPerson: Person | undefined, search: string): boolean {
  if (!search.trim()) return true;
  const token = search.trim().toLowerCase();
  const text = `${reviewCase.incomingId} ${incomingPerson?.name || ""} ${incomingPerson?.surname || ""}`.toLowerCase();
  return text.includes(token);
}

