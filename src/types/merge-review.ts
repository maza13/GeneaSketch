import type { DataDiff } from "@/core/edit/diff";
import type { MergeStats } from "@/core/edit/merge";
import type { Confidence } from "@/core/edit/personMatcher";
import type { GeneaDocument, MergeAction, MergeExplain, MergeHypothesis, MergeRiskLevel } from "@/types/domain";

export type MergeReviewStep = "strategy" | "inbox" | "case_workbench" | "technical_conflicts" | "preview" | "apply";

export type MergeReviewCaseStatus = "pending" | "auto_applied" | "manual_applied";

export type MergeReviewActionSource = "auto-low" | "auto-medium" | "manual" | "batch-manual";

export type MergeReviewPreset = "strict" | "balanced" | "fast";

export type MergeReviewAutoRules = {
  lowAutoScoreMin: number;
  lowAutoCoverageMin: number;
  lowAutoDeltaMin: number;
  mediumAutoScoreMin: number;
  mediumAutoCoverageMin: number;
  mediumAutoDeltaMin: number;
};

export type MergeReviewSort = "risk_priority";

export type MergeReviewFilters = {
  search: string;
  sort: MergeReviewSort;
  showLowSection: boolean;
};

export type MergeReviewCandidateOption = {
  baseId?: string;
  score: number;
  confidence: Confidence;
  riskLevel: MergeRiskLevel;
  blockers: Array<{ code: string; severity: "criticalHardConflict" | "nonCriticalHardConflict" | "soft"; detail: string }>;
  signals: string[];
  qualityFlags: string[];
  hypothesesTopK: MergeHypothesis[];
  chosenHypothesis: MergeHypothesis;
  requiredActions: MergeAction[];
  explain: MergeExplain;
  source: "match-candidate" | "synthetic-create";
};

export type MergeReviewCase = {
  incomingId: string;
  baseId?: string;
  riskLevel: MergeRiskLevel;
  priority: number;
  status: MergeReviewCaseStatus;
  hypothesesTopK: MergeHypothesis[];
  selectedHypothesis: number;
  requiredActionsPlanned: MergeAction[];
  requiredActionsApplied: string[];
  needsTechnicalConflictReview: boolean;
  technicalConflictResolved: boolean;
  lockedReason?: string;
  selectedCandidate: number;
  candidates: MergeReviewCandidateOption[];
};

export type MergeReviewActionEntry = {
  actionId: string;
  incomingId: string;
  action: MergeAction;
  source: MergeReviewActionSource;
  appliedAt: string;
  revertedAt?: string;
  revertible: true;
};

export type MergeReviewDerivedStats = {
  totalCases: number;
  high: number;
  medium: number;
  low: number;
  pending: number;
  autoApplied: number;
  manualApplied: number;
  blockedPending: number;
  technicalPending: number;
  mediumSuggested: number;
  mediumAutoApplied: number;
  manualOverrides: number;
  networkConfirmed: number;
  criticalOverrides: number;
  autoDeepApplied: number;
};

export type MergeReviewSession = {
  mode: "auto_deep" | "expert_workbench";
  preset: MergeReviewPreset;
  autoRules: MergeReviewAutoRules;
  draft: {
    contextId?: string;
    updatedAt?: string;
  };
  cases: Record<string, MergeReviewCase>;
  orderedCaseIds: string[];
  selectedCaseId: string | null;
  actionJournal: MergeReviewActionEntry[];
  suggestedAutoMediumIds: string[];
  gates: { unresolvedBlocked: number; unresolvedTechnical: number };
  filters: MergeReviewFilters;
  derivedStats: MergeReviewDerivedStats;
};

export type MergeSessionPreview = {
  diff: DataDiff;
  merged: GeneaDocument;
  stats: MergeStats;
};
