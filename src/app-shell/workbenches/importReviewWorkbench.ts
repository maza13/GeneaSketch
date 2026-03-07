import type { MergeDraftSnapshot } from "@/types/merge-draft";
import type { GraphDocument } from "@/types/domain";
import type { ImportReviewViewModel } from "@/app-shell/facade/types";

export function buildImportReviewViewModel(
  baseDocument: GraphDocument | null,
  incomingDocument: GraphDocument | null,
  initialDraft: MergeDraftSnapshot | null,
): ImportReviewViewModel {
  return {
    baseDocument,
    incomingDocument,
    initialDraft,
  };
}
