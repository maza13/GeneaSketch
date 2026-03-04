import type { GeneaDocument } from "@/types/domain";
import type { InferenceResult } from "@/core/inference/types";
import { estimatePersonBirthYearV2 } from "@/core/inference/birthRangeLocalV2";

export function estimatePersonBirthYear(personId: string, doc: GeneaDocument): InferenceResult | null {
  try {
    return estimatePersonBirthYearV2(personId, doc);
  } catch {
    return null;
  }
}
