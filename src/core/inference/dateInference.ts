import type { GeneaDocument } from "@/types/domain";
import type { BirthEstimatorVersion } from "@/core/inference/birthEstimatorConfig";
import type { InferenceResult } from "@/core/inference/types";
import { estimatePersonBirthYearV2 } from "@/core/inference/birthRangeLocalV2";
import { estimatePersonBirthYearLegacy } from "@/core/inference/dateInferenceLegacy";

let birthEstimatorVersion: BirthEstimatorVersion = "v2";

export function setBirthEstimatorVersionForTests(version: BirthEstimatorVersion) {
  birthEstimatorVersion = version;
}

export function getBirthEstimatorVersion(): BirthEstimatorVersion {
  return birthEstimatorVersion;
}

type EstimateBirthOptions = {
  estimatorVersion?: BirthEstimatorVersion;
};

function isValidInference(result: InferenceResult | null): boolean {
  if (!result) return false;
  if (result.isImpossible) return false;
  if (result.suggestedRange && result.suggestedRange[0] <= result.suggestedRange[1]) return true;
  if (typeof result.suggestedYear === "number") return true;
  return (result.evidences || []).length > 0;
}

function appendFallbackDiagnostic(legacy: InferenceResult | null, reason: string): InferenceResult | null {
  if (!legacy) return null;
  const diagnostics = legacy.diagnostics ? [...legacy.diagnostics] : [];
  diagnostics.push(`fallback_to_legacy:${reason}`);
  return { ...legacy, diagnostics };
}

export function estimatePersonBirthYear(personId: string, doc: GeneaDocument, options?: EstimateBirthOptions): InferenceResult | null {
  const effectiveVersion = options?.estimatorVersion || birthEstimatorVersion;
  if (effectiveVersion === "legacy") {
    return estimatePersonBirthYearLegacy(personId, doc);
  }

  try {
    const v2 = estimatePersonBirthYearV2(personId, doc);
    if (isValidInference(v2)) return v2;
    return appendFallbackDiagnostic(estimatePersonBirthYearLegacy(personId, doc), "v2_invalid_result");
  } catch {
    return appendFallbackDiagnostic(estimatePersonBirthYearLegacy(personId, doc), "v2_exception");
  }
}
