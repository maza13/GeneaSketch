import type { DataDiff } from "@/core/edit/diff";
import type { MergeReviewSession, MergeReviewStep } from "@/types/merge-review";

export type MergeContextFingerprint = {
  contextId: string;
  baseFingerprint: string;
  incomingFingerprint: string;
};

export type MergeDraftSnapshot = {
  schemaVersion?: number;
  contextId: string;
  step: MergeReviewStep;
  session: MergeReviewSession;
  workingDiff: DataDiff | null;
  updatedAt: string;
};
