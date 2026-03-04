import type { GraphDocument, MergeHypothesis } from "@/types/domain";
import type { MergeReviewCase, MergeReviewSession } from "@/types/merge-review";
import { MERGE_STRINGS_ES } from "@/ui/merge-review/strings.es";

type Props = {
  session: MergeReviewSession;
  incomingDoc: GraphDocument;
  baseDoc: GraphDocument;
  onSelectCandidate: (incomingId: string, candidateIndex: number) => void;
  onSelectHypothesis: (incomingId: string, hypothesisIndex: number) => void;
  onApplyDecision: (incomingId: string) => void;
  onTreatAsNewPerson: (incomingId: string) => void;
  onOpenTechnical: (incomingId: string) => void;
};

function candidateLabel(reviewCase: MergeReviewCase, baseDoc: GraphDocument, index: number): string {
  const candidate = reviewCase.candidates[index];
  if (candidate.source === "synthetic-create") return "Crear persona nueva";
  if (!candidate.baseId) return "Candidato sin base";
  const base = baseDoc.persons[candidate.baseId];
  if (!base) return `Base ${candidate.baseId}`;
  return `${base.name || "(Sin nombre)"} ${base.surname || ""} (${candidate.baseId})`;
}

function riskTone(risk: MergeReviewCase["riskLevel"]): "accent" | "warn" | "normal" {
  if (risk === "high") return "warn";
  if (risk === "low") return "accent";
  return "normal";
}

function riskLabel(risk: MergeReviewCase["riskLevel"]): string {
  if (risk === "high") return "alto";
  if (risk === "medium") return "medio";
  return "bajo";
}

export function getSelectedHypothesisSafe(reviewCase: MergeReviewCase): MergeHypothesis | null {
  return reviewCase.hypothesesTopK[reviewCase.selectedHypothesis] || reviewCase.hypothesesTopK[0] || null;
}

export function MergeCaseDetailPane({
  session,
  incomingDoc,
  baseDoc,
  onSelectCandidate,
  onSelectHypothesis,
  onApplyDecision,
  onTreatAsNewPerson,
  onOpenTechnical
}: Props) {
  if (!session.selectedCaseId) {
    return <div className="merge-case-detail-pane merge-empty">No hay caso seleccionado.</div>;
  }
  const reviewCase = session.cases[session.selectedCaseId];
  if (!reviewCase) {
    return (
      <div className="merge-case-detail-pane merge-empty">
        El caso seleccionado no esta disponible. Vuelve a la bandeja para elegir otro caso.
      </div>
    );
  }
  const incoming = incomingDoc.persons[reviewCase.incomingId];
  const selectedHypothesis = getSelectedHypothesisSafe(reviewCase);
  const canApply = Boolean(selectedHypothesis);

  return (
    <div className="merge-case-detail-pane">
      <div className="merge-pane-header">
        <div className="merge-pane-title">
          Caso Activo: {incoming?.name || "(Sin nombre)"} {incoming?.surname || ""} ({reviewCase.incomingId})
        </div>
        <span className={`context-card__value context-card__value--${riskTone(reviewCase.riskLevel)}`}>
          Riesgo: {riskLabel(reviewCase.riskLevel)}
        </span>
      </div>

      <div className="merge-case-grid">
        <div className="merge-case-card">
          <div className="merge-case-card__title">Candidato base</div>
          <div className="merge-case-list">
            {reviewCase.candidates.map((candidate, index) => (
              <label key={`${reviewCase.incomingId}-cand-${index}`} className="merge-radio-row">
                <input
                  type="radio"
                  checked={reviewCase.selectedCandidate === index}
                  onChange={() => onSelectCandidate(reviewCase.incomingId, index)}
                />
                <span>{candidateLabel(reviewCase, baseDoc, index)}</span>
                <span className="merge-radio-row__meta">{candidate.score}% | {riskLabel(candidate.riskLevel)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="merge-case-card">
          <div className="merge-case-card__title">Top-3 Hipotesis</div>
          <div className="merge-case-list">
            {reviewCase.hypothesesTopK.map((hypothesis, index) => (
              <label key={`${reviewCase.incomingId}-hyp-${index}`} className="merge-radio-row">
                <input
                  type="radio"
                  checked={reviewCase.selectedHypothesis === index}
                  onChange={() => onSelectHypothesis(reviewCase.incomingId, index)}
                />
                <span>{hypothesis.hypothesisType}</span>
                <span className="merge-radio-row__meta">{hypothesis.scoreFinal}% | {hypothesis.riskLevel}</span>
              </label>
            ))}
          </div>
          {!selectedHypothesis && (
            <div className="merge-inbox-empty">No hay hipotesis valida para este caso. Revisa el candidato o usa "Tratar como persona nueva".</div>
          )}
          <div className="merge-case-explain">
            <div><strong>{MERGE_STRINGS_ES.detailLabels.reason}:</strong> {selectedHypothesis?.explain.decisionReason || "Sin razon"}</div>
            <div>
              <strong>{MERGE_STRINGS_ES.detailLabels.coverage}:</strong>{" "}
              {Math.round((selectedHypothesis?.explain.coverage.coverageRatio || 0) * 100)}%
            </div>
            <div>
              <strong>{MERGE_STRINGS_ES.detailLabels.caps}:</strong>{" "}
              {selectedHypothesis?.explain.capsApplied.length
                ? selectedHypothesis.explain.capsApplied.join(", ")
                : "Ninguno"}
            </div>
            <div>
              <strong>{MERGE_STRINGS_ES.detailLabels.blockers}:</strong>{" "}
              {selectedHypothesis?.explain.blockers.length
                ? selectedHypothesis.explain.blockers.map((blocker) => `${blocker.severity}:${blocker.code}`).join(" | ")
                : "Ninguno"}
            </div>
            <div>
              <strong>{MERGE_STRINGS_ES.detailLabels.requiredActions}:</strong>{" "}
              {reviewCase.requiredActionsPlanned.length
                ? reviewCase.requiredActionsPlanned.map((action) => action.kind).join(", ")
                : "Ninguna"}
            </div>
            {selectedHypothesis?.explain.networkEvidence && (
              <>
                <div>
                  <strong>{MERGE_STRINGS_ES.detailLabels.layer1}:</strong>{" "}
                  {selectedHypothesis.explain.networkEvidence.layerScores.l1Identity}
                </div>
                <div>
                  <strong>{MERGE_STRINGS_ES.detailLabels.layer2}:</strong>{" "}
                  {selectedHypothesis.explain.networkEvidence.layerScores.l2Nuclear}
                </div>
                <div>
                  <strong>{MERGE_STRINGS_ES.detailLabels.layer3}:</strong>{" "}
                  {selectedHypothesis.explain.networkEvidence.layerScores.l3Extended}
                </div>
                <div>
                  <strong>{MERGE_STRINGS_ES.detailLabels.layer4}:</strong>{" "}
                  {selectedHypothesis.explain.networkEvidence.layerScores.l4Global}
                </div>
                <div>
                  <strong>{MERGE_STRINGS_ES.detailLabels.propagation}:</strong>{" "}
                  {Math.round(selectedHypothesis.explain.networkEvidence.propagationSupport * 100)}%
                </div>
                <div>
                  <strong>{MERGE_STRINGS_ES.detailLabels.anchors}:</strong>{" "}
                  {selectedHypothesis.explain.networkEvidence.anchorHits} (
                  {selectedHypothesis.explain.networkEvidence.anchorKinds.join(", ") || "sin categorias"})
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="merge-case-actions">
        <button className="primary" onClick={() => onApplyDecision(reviewCase.incomingId)} disabled={!canApply}>
          Aplicar decision del caso
        </button>
        <button onClick={() => onTreatAsNewPerson(reviewCase.incomingId)}>Tratar como persona nueva</button>
        <button onClick={() => onOpenTechnical(reviewCase.incomingId)} disabled={!canApply}>Ver detalle tecnico</button>
      </div>
    </div>
  );
}

