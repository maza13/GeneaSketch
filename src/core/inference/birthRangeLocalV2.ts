import { DEFAULT_BIRTH_ESTIMATOR_CONFIG, type BirthEstimatorConfig } from "@/core/inference/birthEstimatorConfig";
import { solveBirthRange } from "@/core/inference/constraintSolver";
import { buildBirthEvidence, computeTreeDemographicStats } from "@/core/inference/evidenceBuilder";
import { presentInferenceEvidence } from "@/core/inference/evidencePresenter";
import { collectBirthEstimationFacts } from "@/core/inference/factCollector";
import type { InferenceEvidence, InferenceResult } from "@/core/inference/types";
import type { GeneaDocument } from "@/types/domain";

function toUiEvidence(resultEvidence: Array<{
  kind: "hard" | "soft" | "info";
  reference: string;
  label: string;
  hardSpan?: [number, number];
  bestSpan?: [number, number];
  layer?: 1 | 2 | 3;
  impact?: "high" | "medium" | "low";
  relationClass?: string;
  ruleId?: string;
}>): InferenceEvidence[] {
  return resultEvidence.map((item) => ({
    type: item.kind === "hard" ? "strict_limit" : item.kind === "soft" ? "contextual" : "info",
    sourceId: item.reference,
    message: item.label,
    suggestedRange: item.bestSpan || item.hardSpan,
    minLimit: item.hardSpan?.[0],
    maxLimit: item.hardSpan?.[1],
    layer: item.layer,
    impact: item.impact,
    relationClass: item.relationClass,
    ruleId: item.ruleId
  }));
}

export function estimatePersonBirthYearV2(
  personId: string,
  doc: GeneaDocument,
  config: BirthEstimatorConfig = DEFAULT_BIRTH_ESTIMATOR_CONFIG
): InferenceResult | null {
  const person = doc.persons[personId];
  if (!person) return null;

  const facts = collectBirthEstimationFacts(doc, personId);
  if (facts.length === 0) {
    return {
      evidences: [],
      isImpossible: false,
      diagnostics: ["Sin hechos suficientes para estimar nacimiento."]
    };
  }

  const treeStats = computeTreeDemographicStats(doc, personId);
  const evidence = buildBirthEvidence(facts, treeStats, config);
  const solved = solveBirthRange(evidence, config);

  const suggestedRange: [number, number] = [solved.finalRange[0], solved.finalRange[1]];
  const uiEvidenceRaw = toUiEvidence(solved.usedEvidence);
  const presented = presentInferenceEvidence(uiEvidenceRaw, { finalRange: suggestedRange });
  const suggestedYear = Math.round((suggestedRange[0] + suggestedRange[1]) / 2);

  return {
    minYear: solved.feasibleSpan[0],
    maxYear: solved.feasibleSpan[1],
    suggestedRange,
    suggestedYear,
    evidences: presented.deduped,
    evidenceSummary: presented.summary,
    evidenceGroups: presented.grouped,
    isImpossible: solved.feasibleSpan[0] > solved.feasibleSpan[1],
    diagnostics: solved.diagnostics,
    droppedEvidenceRefs: solved.droppedEvidence.map((item) => item.reference)
  };
}
