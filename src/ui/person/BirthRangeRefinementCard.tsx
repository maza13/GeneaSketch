import { useMemo, useState } from "react";
import { estimatePersonBirthYear } from "@/core/inference/dateInference";
import type { InferenceEvidence, InferenceResult } from "@/core/inference/types";
import { refineBirthRangeWithAi } from "@/core/inference/aiBirthRefinement";
import {
  describeFusion,
  fuseBirthRanges,
  toGedcomBetween,
  type BirthRangeFusionStrategy,
  type YearRange
} from "@/core/inference/birthRangeFusion";
import type { AiBirthRangeRefinementResult, AiSettings } from "@/types/ai";
import type { GeneaDocument } from "@/types/domain";

type Props = {
  document: GeneaDocument;
  personId: string;
  aiSettings: AiSettings;
  disabled?: boolean;
  onApplyBirthGedcom: (gedcom: string) => void;
  onAppendNote?: (note: string) => void;
};

type WeightedEvidence = InferenceEvidence & { weight: number };

function toLocalRange(inference: InferenceResult | null): YearRange | null {
  if (!inference) return null;
  if (inference.suggestedRange) return inference.suggestedRange;
  if (inference.suggestedYear !== undefined) return [inference.suggestedYear, inference.suggestedYear];
  return null;
}

function baseWeightByType(type: InferenceEvidence["type"]): number {
  if (type === "strict_limit") return 100;
  if (type === "contextual") return 60;
  return 20;
}

function rangeTightnessScore(evidence: InferenceEvidence): number {
  if (evidence.minLimit !== undefined && evidence.maxLimit !== undefined) {
    const width = Math.abs(evidence.maxLimit - evidence.minLimit);
    return Math.max(0, 40 - Math.min(40, width / 4));
  }
  if (evidence.suggestedRange) {
    const width = Math.abs(evidence.suggestedRange[1] - evidence.suggestedRange[0]);
    return Math.max(0, 30 - Math.min(30, width / 5));
  }
  return 0;
}

function weightEvidence(evidence: InferenceEvidence[]): WeightedEvidence[] {
  return evidence
    .map((item) => ({
      ...item,
      weight: baseWeightByType(item.type) + rangeTightnessScore(item)
    }))
    .sort((a, b) => b.weight - a.weight);
}

function buildLocalNote(appliedRange: YearRange, topEvidence: WeightedEvidence[]): string {
  const stamp = new Date().toISOString();
  const topSummary = topEvidence
    .slice(0, 3)
    .map((item, index) => `${index + 1}) ${item.message}`)
    .join(" | ");
  return [
    "[Birth Range - Local Algorithm]",
    `author=GeneaSketch.birth_estimator_v1`,
    `timestamp=${stamp}`,
    `range=${toGedcomBetween(appliedRange)}`,
    `high_impact=${topSummary || "Sin evidencia priorizada"}`
  ].join(" ");
}

function buildAiNote(result: AiBirthRangeRefinementResult, appliedRange: YearRange): string {
  const stamp = new Date().toISOString();
  return [
    "[Birth Range - AI Refinement]",
    `author=${result.provider}:${result.model}`,
    `timestamp=${stamp}`,
    `range=${toGedcomBetween(appliedRange)}`,
    `confidence=${result.confidence.toFixed(2)}`,
    `verdict=\"${result.verdict}\"`
  ].join(" ");
}

function buildFusionNote(
  localRange: YearRange,
  aiRange: YearRange,
  finalRange: YearRange,
  strategy: BirthRangeFusionStrategy,
  aiResult: AiBirthRangeRefinementResult,
  topEvidence: WeightedEvidence[]
): string {
  const stamp = new Date().toISOString();
  const localSnippet = topEvidence
    .slice(0, 2)
    .map((item) => item.message)
    .join(" | ");
  const fusionSummary = describeFusion(localRange, aiRange, finalRange, strategy);

  return [
    "[Birth Range - Fusion]",
    `author=GeneaSketch.birth_fusion_v1+${aiResult.provider}:${aiResult.model}`,
    `timestamp=${stamp}`,
    `local=${toGedcomBetween(localRange)}`,
    `ia=${toGedcomBetween(aiRange)}`,
    `strategy=${strategy === "narrow" ? "acortar" : "ampliar"}`,
    `final=${toGedcomBetween(finalRange)}`,
    `comment=\"Este rango (${finalRange[0]}-${finalRange[1]}) es la fusión de ambos cálculos. ${fusionSummary}\"`,
    `local_high_impact=\"${localSnippet || "Sin evidencia"}\"`,
    `ia_verdict=\"${aiResult.verdict}\"`
  ].join(" ");
}

export function BirthRangeRefinementCard({
  document,
  personId,
  aiSettings,
  disabled = false,
  onApplyBirthGedcom,
  onAppendNote
}: Props) {
  const [isActivated, setIsActivated] = useState(false);
  const [localInference, setLocalInference] = useState<InferenceResult | null>(null);
  const [aiResult, setAiResult] = useState<AiBirthRangeRefinementResult | null>(null);
  const [refineBusy, setRefineBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [fusionStrategy, setFusionStrategy] = useState<BirthRangeFusionStrategy>("narrow");
  const [saveNote, setSaveNote] = useState(true);
  const [showAllEvidence, setShowAllEvidence] = useState(false);

  const localRange = toLocalRange(localInference);
  const weightedEvidence = useMemo(() => weightEvidence(localInference?.evidences || []), [localInference]);
  const topEvidence = weightedEvidence.slice(0, 3);

  const canFuse = Boolean(localRange && aiResult && !aiResult.usedFallbackLocal);
  const fusedRange = canFuse && localRange && aiResult
    ? fuseBirthRanges(localRange, [aiResult.minYear, aiResult.maxYear], fusionStrategy)
    : null;

  const applyRange = (range: YearRange, source: "local" | "ia" | "fusion") => {
    onApplyBirthGedcom(toGedcomBetween(range));

    if (!saveNote || !onAppendNote) return;

    if (source === "local") {
      onAppendNote(buildLocalNote(range, topEvidence));
      return;
    }

    if (!aiResult) return;

    if (source === "ia") {
      onAppendNote(buildAiNote(aiResult, range));
      return;
    }

    if (source === "fusion" && localRange) {
      onAppendNote(
        buildFusionNote(
          localRange,
          [aiResult.minYear, aiResult.maxYear],
          range,
          fusionStrategy,
          aiResult,
          topEvidence
        )
      );
    }
  };

  const handleCalculate = () => {
    const nextInference = estimatePersonBirthYear(personId, document);
    setLocalInference(nextInference);
    setAiResult(null);
    setMessage("");
    setIsActivated(true);
  };

  return (
    <div className="birth-range-card">
      <div className="birth-range-top-actions">
        <button
          type="button"
          className="secondary-ghost"
          onClick={handleCalculate}
          disabled={disabled || refineBusy}
        >
          {isActivated ? "Recalcular" : "Calcular rango"}
        </button>
        {isActivated ? (
          <label className="birth-save-note-toggle">
            <input
              type="checkbox"
              checked={saveNote}
              onChange={(event) => setSaveNote(event.target.checked)}
              disabled={disabled || refineBusy}
            />
            Guardar nota
          </label>
        ) : null}
      </div>

      {!isActivated ? (
        <div className="person-meta">Pulsa “Calcular rango” para activar el análisis local/IA y la fusión manual.</div>
      ) : (
        <div className="birth-range-grid">
          <section className="birth-range-block">
            <h5>Rango local (algoritmo)</h5>
            {localRange ? (
              <>
                <div className="birth-range-value">{localRange[0]} - {localRange[1]}</div>
                {(localInference?.minYear !== undefined || localInference?.maxYear !== undefined) ? (
                  <div className="person-meta">
                    Límites duros: {localInference?.minYear ?? "..."} - {localInference?.maxYear ?? "..."}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="secondary-ghost"
                  disabled={disabled || refineBusy}
                  onClick={() => {
                    applyRange(localRange, "local");
                    setMessage("Rango local aplicado.");
                  }}
                >
                  Usar rango local
                </button>
              </>
            ) : (
              <div className="person-meta">No hay suficiente evidencia para rango local.</div>
            )}

            {weightedEvidence.length > 0 ? (
              <div className="birth-evidence-list">
                {(showAllEvidence ? weightedEvidence : topEvidence).map((item, index) => (
                  <div key={`${item.sourceId}-${index}`} className="birth-evidence-item">
                    {index < 3 ? <span className="birth-evidence-badge">Alto impacto</span> : null}
                    <span>{item.message}</span>
                  </div>
                ))}
                {weightedEvidence.length > 3 ? (
                  <button
                    type="button"
                    className="secondary-ghost"
                    onClick={() => setShowAllEvidence((prev) => !prev)}
                  >
                    {showAllEvidence ? "Ver menos" : "Ver todas las evidencias"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="birth-range-block">
            <h5>Rango IA (refinamiento)</h5>
            {aiResult && !aiResult.usedFallbackLocal ? (
              <>
                <div className="birth-range-value">{aiResult.minYear} - {aiResult.maxYear}</div>
                <div className="person-meta">Confianza: {Math.round(aiResult.confidence * 100)}%</div>
                <div className="person-meta">{aiResult.verdict}</div>
                <button
                  type="button"
                  className="secondary-ghost"
                  disabled={disabled || refineBusy}
                  onClick={() => {
                    const finalRange: YearRange = [aiResult.minYear, aiResult.maxYear];
                    applyRange(finalRange, "ia");
                    setMessage(`Rango IA aplicado (confianza ${Math.round(aiResult.confidence * 100)}%).`);
                  }}
                >
                  Usar rango IA
                </button>
              </>
            ) : (
              <div className="person-meta">{aiResult?.verdict || "Aún no se ejecuta refinamiento IA."}</div>
            )}

            <button
              type="button"
              className="secondary-ghost"
              disabled={disabled || refineBusy || !localRange}
              onClick={() => {
                setRefineBusy(true);
                setMessage("");
                void refineBirthRangeWithAi({ document, personId, settings: aiSettings })
                  .then((result) => {
                    setAiResult(result);
                    if (result.usedFallbackLocal) {
                      setMessage(result.notes[0] || "No se pudo refinar con IA; se mantiene rango local.");
                    } else {
                      setMessage(`Rango IA calculado (confianza ${Math.round(result.confidence * 100)}%).`);
                    }
                  })
                  .catch(() => setMessage("No se pudo refinar con IA; se mantiene rango local."))
                  .finally(() => setRefineBusy(false));
              }}
            >
              {refineBusy ? "Refinando..." : "Refinar con IA"}
            </button>

            {aiSettings.developerBirthRefinementDebug && aiResult ? (
              <details className="birth-range-debug">
                <summary>Debug IA</summary>
                {aiResult.parseError ? <div className="person-meta">Parse error: {aiResult.parseError}</div> : null}
                {aiResult.debugTrace ? (
                  <div className="person-meta">
                    facts={aiResult.debugTrace.inputFactsUsed}/{aiResult.debugTrace.inputFactsCount} | budget={aiResult.debugTrace.tokenBudget} | retries={aiResult.debugTrace.retryCount} | model={aiResult.debugTrace.provider}:{aiResult.debugTrace.model} | api={aiResult.debugTrace.apiUsed || "n/a"} | parsed={aiResult.debugTrace.parsed ? "sí" : "no"} | elapsed={aiResult.debugTrace.elapsedMs}ms
                  </div>
                ) : null}
                {aiResult.debugTrace?.finishReason ? (
                  <div className="person-meta">finishReason: {aiResult.debugTrace.finishReason}</div>
                ) : null}
                {aiResult.debugTrace?.retryReason ? (
                  <div className="person-meta">retryReason: {aiResult.debugTrace.retryReason}</div>
                ) : null}
                <div className="person-meta">Salida literal del modelo / proveedor:</div>
                {aiResult.rawResponseText ? (
                  <>
                    <pre>{aiResult.rawResponseText}</pre>
                    <button
                      type="button"
                      className="secondary-ghost"
                      onClick={() => navigator.clipboard.writeText(aiResult.rawResponseText || "")}
                    >
                      Copiar salida literal
                    </button>
                  </>
                ) : (
                  <div className="person-meta">[no raw response captured]</div>
                )}
              </details>
            ) : null}
          </section>

          <section className="birth-range-block">
            <h5>Fusión manual</h5>
            <label className="birth-fusion-control">
              Estrategia
              <select
                value={fusionStrategy}
                onChange={(event) => setFusionStrategy(event.target.value as BirthRangeFusionStrategy)}
                disabled={!canFuse || disabled || refineBusy}
              >
                <option value="narrow">Acortar (fechas más cercanas)</option>
                <option value="widen">Ampliar (fechas más lejanas)</option>
              </select>
            </label>
            <div className="person-meta">
              {fusedRange ? `Vista previa: ${fusedRange[0]} - ${fusedRange[1]}` : "Requiere rango local e IA válido."}
            </div>
            <button
              type="button"
              className="secondary-ghost"
              disabled={!fusedRange || disabled || refineBusy || !aiResult}
              onClick={() => {
                if (!fusedRange) return;
                applyRange(fusedRange, "fusion");
                setMessage(`Rango fusionado aplicado (${fusionStrategy === "narrow" ? "acotar" : "ampliar"}).`);
              }}
            >
              Fusionar y usar
            </button>
          </section>
        </div>
      )}

      {aiResult?.notes?.length ? (
        <ul className="birth-range-notes">
          {aiResult.notes.map((note, index) => (
            <li key={`${note}-${index}`}>{note}</li>
          ))}
        </ul>
      ) : null}
      {message ? <div className="person-meta">{message}</div> : null}
    </div>
  );
}
