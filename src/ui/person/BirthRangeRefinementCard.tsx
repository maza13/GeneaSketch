import { useMemo, useRef, useState } from "react";
import { estimatePersonBirthYear } from "@/core/inference/dateInference";
import type { InferenceEvidence, InferenceResult } from "@/core/inference/types";
import { refineBirthRangeWithAi } from "@/core/inference/aiBirthRefinement";
import {
  fuseBirthRanges,
  toGedcomBetween,
  type BirthRangeFusionStrategy,
  type YearRange
} from "@/core/inference/birthRangeFusion";
import { recommendBirthRefinementLevel } from "@/core/inference/intelligenceAdvisor";
import type { AiBirthRefinementLevel, AiBirthRangeRefinementResult, AiSettings } from "@/types/ai";
import type { GraphDocument } from "@/types/domain";
import { BirthRangeApplyConfirmPanel } from "@/ui/person/BirthRangeApplyConfirmPanel";

type Props = {
  document: GraphDocument;
  personId: string;
  aiSettings: AiSettings;
  disabled?: boolean;
  onApplyBirthGedcom: (gedcom: string) => void;
  onAppendNote?: (note: string) => void;
};

type WeightedEvidence = InferenceEvidence & { weight: number };
type BirthRangeSource = "local" | "ia" | "fusion";

export type BirthRangeApplyDraft = {
  source: BirthRangeSource;
  range: YearRange;
  gedcomDate: string;
  defaultNote: string;
  defaultIncludeVerdict: boolean;
  meta?: {
    confidence?: number;
    model?: string;
    strategy?: BirthRangeFusionStrategy;
  };
};

function toLocalRange(inference: InferenceResult | null): YearRange | null {
  if (!inference) return null;
  if (inference.suggestedRange) return inference.suggestedRange;
  if (inference.suggestedYear !== undefined) return [inference.suggestedYear, inference.suggestedYear];
  return null;
}

function notesEnabledForLevel(settings: AiSettings, level: AiBirthRefinementLevel): boolean {
  if (level === "simple") return false;
  return settings.birthRefinementIncludeNotesByLevel?.[level] ?? true;
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
    "author=GeneaSketch.birth_estimator_v1",
    `timestamp=${stamp}`,
    `range=${toGedcomBetween(appliedRange)}`,
    `high_impact=${topSummary || "Sin evidencia priorizada"}`
  ].join(" ");
}

function buildAiNote(result: AiBirthRangeRefinementResult, appliedRange: YearRange, includeVerdict: boolean): string {
  const stamp = new Date().toISOString();
  const parts = [
    "[Birth Range - AI Refinement]",
    `author=${result.provider}:${result.model}`,
    `timestamp=${stamp}`,
    `range=${toGedcomBetween(appliedRange)}`,
    `confidence=${result.confidence.toFixed(2)}`
  ];
  if (includeVerdict) {
    parts.push(`verdict=\"${result.verdict}\"`);
  }
  return parts.join(" ");
}

function buildFusionNote(
  localRange: YearRange,
  aiRange: YearRange,
  finalRange: YearRange,
  strategy: BirthRangeFusionStrategy,
  aiResult: AiBirthRangeRefinementResult,
  topEvidence: WeightedEvidence[],
  includeVerdict: boolean
): string {
  const stamp = new Date().toISOString();
  const localSnippet = topEvidence
    .slice(0, 2)
    .map((item) => item.message)
    .join(" | ");

  const parts = [
    "[Birth Range - Fusion]",
    `author=GeneaSketch.birth_fusion_v1+${aiResult.provider}:${aiResult.model}`,
    `timestamp=${stamp}`,
    `local=${toGedcomBetween(localRange)}`,
    `ia=${toGedcomBetween(aiRange)}`,
    `strategy=${strategy === "narrow" ? "acortar" : "ampliar"}`,
    `final=${toGedcomBetween(finalRange)}`,
    `comment=\"Este rango (${finalRange[0]}-${finalRange[1]}) es la fusion de ambos calculos.\"`,
    `local_high_impact=\"${localSnippet || "Sin evidencia"}\"`
  ];

  if (includeVerdict) {
    parts.push(`ia_verdict=\"${aiResult.verdict}\"`);
  }

  return parts.join(" ");
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
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<AiBirthRefinementLevel>(aiSettings.birthRefinementLevel || "balanced");
  const [includeNotes, setIncludeNotes] = useState<boolean>(notesEnabledForLevel(aiSettings, aiSettings.birthRefinementLevel || "balanced"));
  const [pendingDraft, setPendingDraft] = useState<BirthRangeApplyDraft | null>(null);
  const [confirmNoteText, setConfirmNoteText] = useState("");
  const [confirmIncludeVerdict, setConfirmIncludeVerdict] = useState(false);

  const requestSeqRef = useRef(0);

  const localRange = toLocalRange(localInference);
  const weightedEvidence = useMemo(() => weightEvidence(localInference?.evidences || []), [localInference]);
  const topEvidence = weightedEvidence.slice(0, 3);
  const summaryEvidence = localInference?.evidenceSummary?.length ? localInference.evidenceSummary : topEvidence;
  const recommendedLevel = aiResult?.debugTrace?.recommendedLevel || recommendBirthRefinementLevel(localInference).recommendedLevel;
  const hasValidAiRange = Boolean(
    aiResult &&
    aiResult.usedFallbackLocal === false &&
    aiResult.rangeValidity !== "invalid"
  );

  const canFuse = Boolean(localRange && aiResult && hasValidAiRange);
  const fusedRange = canFuse && localRange && aiResult
    ? fuseBirthRanges(localRange, [aiResult.minYear, aiResult.maxYear], fusionStrategy)
    : null;
  const iaMessage = message.includes("IA") ? message : "";

  const localMidYear = localRange ? Math.round((localRange[0] + localRange[1]) / 2) : null;
  const aiMidYear = aiResult && hasValidAiRange
    ? Math.round((aiResult.minYear + aiResult.maxYear) / 2)
    : null;
  const fusedMidYear = fusedRange ? Math.round((fusedRange[0] + fusedRange[1]) / 2) : null;

  const handleCalculate = () => {
    const nextInference = estimatePersonBirthYear(personId, document);
    setLocalInference(nextInference);
    setAiResult(null);
    setMessage("");
    setShowAllEvidence(false);
    const nextLevel = recommendBirthRefinementLevel(nextInference).recommendedLevel;
    setSelectedLevel(nextLevel);
    setIncludeNotes(notesEnabledForLevel(aiSettings, nextLevel));
    setPendingDraft(null);
    setConfirmNoteText("");
    setConfirmIncludeVerdict(false);
    setIsActivated(true);
  };

  const openApplyDraft = (range: YearRange, source: BirthRangeSource) => {
    let defaultNote = "";
    let defaultIncludeVerdict = false;

    if (source === "local") {
      defaultNote = buildLocalNote(range, topEvidence);
    } else if (source === "ia" && aiResult) {
      defaultIncludeVerdict = true;
      defaultNote = buildAiNote(aiResult, range, true);
    } else if (source === "fusion" && aiResult && localRange) {
      defaultIncludeVerdict = true;
      defaultNote = buildFusionNote(
        localRange,
        [aiResult.minYear, aiResult.maxYear],
        range,
        fusionStrategy,
        aiResult,
        topEvidence,
        true
      );
    }

    setPendingDraft({
      source,
      range,
      gedcomDate: toGedcomBetween(range),
      defaultNote,
      defaultIncludeVerdict,
      meta: {
        confidence: source === "ia" && aiResult ? aiResult.confidence : undefined,
        model: source !== "local" && aiResult ? `${aiResult.provider}:${aiResult.model}` : undefined,
        strategy: source === "fusion" ? fusionStrategy : undefined
      }
    });
    setConfirmNoteText(defaultNote);
    setConfirmIncludeVerdict(defaultIncludeVerdict);
  };

  const handleConfirmApply = () => {
    if (!pendingDraft) return;

    onApplyBirthGedcom(pendingDraft.gedcomDate);

    if (onAppendNote) {
      let noteToPersist = confirmNoteText.trim();
      if (pendingDraft.source === "ia" && aiResult) {
        noteToPersist = buildAiNote(aiResult, pendingDraft.range, confirmIncludeVerdict);
      } else if (pendingDraft.source === "fusion" && aiResult && localRange) {
        noteToPersist = buildFusionNote(
          localRange,
          [aiResult.minYear, aiResult.maxYear],
          pendingDraft.range,
          fusionStrategy,
          aiResult,
          topEvidence,
          confirmIncludeVerdict
        );
      }
      if (noteToPersist.trim().length > 0) {
        onAppendNote(noteToPersist);
      }
    }

    const sourceLabel = pendingDraft.source === "local" ? "local" : pendingDraft.source === "ia" ? "IA" : "fusionado";
    setMessage(`Rango ${sourceLabel} aplicado.`);
    setPendingDraft(null);
    setConfirmNoteText("");
    setConfirmIncludeVerdict(false);
  };

  const handleCancelRangeModule = () => {
    requestSeqRef.current += 1;
    setRefineBusy(false);
    setAiResult(null);
    setMessage("");
    setShowAllEvidence(false);
    setPendingDraft(null);
    setConfirmNoteText("");
    setConfirmIncludeVerdict(false);
    setIsActivated(false);
  };

  const handleRefineAi = () => {
    const runId = ++requestSeqRef.current;
    setRefineBusy(true);
    setMessage("");

    void refineBirthRangeWithAi({
      document,
      personId,
      settings: aiSettings,
      levelOverride: selectedLevel,
      includeNotesOverride: selectedLevel === "simple" ? false : includeNotes
    })
      .then((result) => {
        if (runId !== requestSeqRef.current) return;
        setAiResult(result);
        if (result.usedFallbackLocal) {
          setMessage(result.notes[0] || "No se pudo refinar con IA; se mantiene rango local.");
        } else {
          setMessage(`Rango IA calculado (confianza ${Math.round(result.confidence * 100)}%).`);
        }
      })
      .catch(() => {
        if (runId !== requestSeqRef.current) return;
        setMessage("No se pudo refinar con IA; se mantiene rango local.");
      })
      .finally(() => {
        if (runId !== requestSeqRef.current) return;
        setRefineBusy(false);
      });
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
          <button
            type="button"
            className="secondary-ghost"
            onClick={handleCancelRangeModule}
            disabled={disabled}
          >
            Cancelar
          </button>
        ) : null}
      </div>

      {!isActivated ? (
        <div className="person-meta">Pulsa "Calcular rango" para activar el analisis local/IA y la fusion manual.</div>
      ) : (
        <div className="birth-range-grid">
          <section className="birth-range-block">
            <h5>Rango local (algoritmo)</h5>
            <div className="birth-range-block__summary">
              {localRange ? (
                <>
                  <div className="birth-range-value">{localRange[0]} - {localRange[1]}</div>
                  {localMidYear !== null ? (
                    <div className="person-meta">Ano medio (referencia): {localMidYear}</div>
                  ) : null}
                  {(localInference?.minYear !== undefined || localInference?.maxYear !== undefined) ? (
                    <div className="person-meta">
                      Limites duros: {localInference?.minYear ?? "..."} - {localInference?.maxYear ?? "..."}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="person-meta">No hay suficiente evidencia para rango local.</div>
              )}
            </div>
            <div className="birth-range-block__actions">
              <div className="birth-range-actions">
                <button
                  type="button"
                  className="secondary-ghost"
                  disabled={disabled || refineBusy || !localRange}
                  onClick={() => {
                    if (!localRange) return;
                    openApplyDraft(localRange, "local");
                  }}
                >
                  Usar rango local
                </button>
              </div>
            </div>
            <div className="birth-range-block__details">
              {summaryEvidence.length > 0 ? (
                <div className="birth-evidence-list">
                  {(showAllEvidence ? (localInference?.evidences || weightedEvidence) : summaryEvidence).map((item, index) => (
                    <div key={`${item.sourceId}-${index}`} className="birth-evidence-item">
                      {item.impact ? <span className="birth-evidence-badge">{item.impact === "high" ? "Alto impacto" : item.impact === "medium" ? "Impacto medio" : "Impacto bajo"}</span> : null}
                      <span>{item.message}</span>
                      <span className="person-meta">Capa {item.layer || 1}</span>
                    </div>
                  ))}
                  {(localInference?.evidences?.length || weightedEvidence.length) > 5 ? (
                    <button
                      type="button"
                      className="secondary-ghost"
                      onClick={() => setShowAllEvidence((prev) => !prev)}
                    >
                      {showAllEvidence ? "Ver resumen" : "Ver detalle completo"}
                    </button>
                  ) : null}
                  {localInference?.evidenceGroups?.length ? (
                    <details className="birth-range-debug">
                      <summary>Detalle agrupado de evidencias</summary>
                      {localInference.evidenceGroups.map((group) => (
                        <div key={group.key} className="person-meta">
                          <strong>{group.label}</strong>: {group.items.length} evidencia(s)
                        </div>
                      ))}
                    </details>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="birth-range-block">
            <h5>Rango IA (refinamiento)</h5>
            <div className="birth-range-block__summary">
              {aiResult && hasValidAiRange ? (
                <>
                  <div className="birth-range-value">{aiResult.minYear} - {aiResult.maxYear}</div>
                  {aiMidYear !== null ? (
                    <div className="person-meta">Ano medio (referencia): {aiMidYear}</div>
                  ) : null}
                  <div className="person-meta">Confianza: {Math.round(aiResult.confidence * 100)}%</div>
                </>
              ) : null}
            </div>
            <div className="birth-range-block__actions">
              <div className="birth-range-actions">
                <label className="birth-fusion-control">
                  Nivel de inteligencia IA
                  <select
                    value={selectedLevel}
                    onChange={(event) => {
                      const nextLevel = event.target.value as AiBirthRefinementLevel;
                      setSelectedLevel(nextLevel);
                      setIncludeNotes(notesEnabledForLevel(aiSettings, nextLevel));
                    }}
                    disabled={disabled || refineBusy}
                  >
                    <option value="simple">Simple {recommendedLevel === "simple" ? "(Recomendado)" : ""}</option>
                    <option value="balanced">Balanceado {recommendedLevel === "balanced" ? "(Recomendado)" : ""}</option>
                    <option value="complex">Complejo {recommendedLevel === "complex" ? "(Recomendado)" : ""}</option>
                  </select>
                </label>
                <div className="person-meta">Recomendado para este caso: {recommendedLevel}</div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={selectedLevel === "simple" ? false : includeNotes}
                    disabled={disabled || refineBusy || selectedLevel === "simple"}
                    onChange={(event) => setIncludeNotes(event.target.checked)}
                  />
                  {selectedLevel === "simple" ? "Notas desactivadas en modo simple" : "Incluir notas en este refinamiento"}
                </label>
                <button
                  type="button"
                  className="secondary-ghost"
                  disabled={disabled || refineBusy || !hasValidAiRange}
                  onClick={() => {
                    if (!aiResult || !hasValidAiRange) return;
                    openApplyDraft([aiResult.minYear, aiResult.maxYear], "ia");
                  }}
                >
                  Usar rango IA
                </button>
                <button
                  type="button"
                  className="secondary-ghost"
                  disabled={disabled || refineBusy || !localRange}
                  onClick={handleRefineAi}
                >
                  {refineBusy ? "Refinando..." : "Refinar con IA"}
                </button>
              </div>
            </div>
            <div className="birth-range-block__details">
              <div className="birth-range-text-scroll">
                <div className="person-meta">{aiResult?.verdict || "Aun no se ejecuta refinamiento IA."}</div>
                {aiResult?.notes?.length ? (
                  <ul className="birth-range-notes">
                    {aiResult.notes.map((note, index) => (
                      <li key={`${note}-${index}`}>{note}</li>
                    ))}
                  </ul>
                ) : null}
                {iaMessage ? <div className="person-meta">{iaMessage}</div> : null}
              </div>

              {aiSettings.developerBirthRefinementDebug && aiResult ? (
                <details className="birth-range-debug">
                  <summary>Debug IA</summary>
                  {aiResult.parseError ? <div className="person-meta">Parse error: {aiResult.parseError}</div> : null}
                  {aiResult.debugTrace ? (
                    <div className="person-meta">
                      facts={aiResult.debugTrace.inputFactsUsed}/{aiResult.debugTrace.inputFactsCount} | budget={aiResult.debugTrace.tokenBudget} | retries={aiResult.debugTrace.retryCount} | model={aiResult.debugTrace.provider}:{aiResult.debugTrace.model} | nivel={aiResult.debugTrace.selectedLevel || "n/a"} | recomendado={aiResult.debugTrace.recommendedLevel || "n/a"} | capas={(aiResult.debugTrace.layersUsed || []).join(",") || "n/a"} | api={aiResult.debugTrace.apiUsed || "n/a"} | parsed={aiResult.debugTrace.parsed ? "si" : "no"} | elapsed={aiResult.debugTrace.elapsedMs}ms
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
            </div>
          </section>

          <section className="birth-range-block">
            <h5>Fusion manual</h5>
            <div className="birth-range-block__summary">
              <label className="birth-fusion-control">
                Estrategia
                <select
                  value={fusionStrategy}
                  onChange={(event) => setFusionStrategy(event.target.value as BirthRangeFusionStrategy)}
                  disabled={!canFuse || disabled || refineBusy}
                >
                  <option value="narrow">Acortar (fechas mas cercanas)</option>
                  <option value="widen">Ampliar (fechas mas lejanas)</option>
                </select>
              </label>
            </div>
            <div className="birth-range-block__actions">
              <div className="birth-range-actions">
                <button
                  type="button"
                  className="secondary-ghost"
                  disabled={!fusedRange || disabled || refineBusy || !aiResult}
                  onClick={() => {
                    if (!fusedRange) return;
                    openApplyDraft(fusedRange, "fusion");
                  }}
                >
                  Fusionar y usar
                </button>
              </div>
            </div>
            <div className="birth-range-block__details">
              <div className="person-meta">
                {fusedRange ? `Vista previa: ${fusedRange[0]} - ${fusedRange[1]}` : "Requiere rango local e IA valido."}
              </div>
              {fusedMidYear !== null ? (
                <div className="person-meta">Ano medio (referencia): {fusedMidYear}</div>
              ) : null}
            </div>
          </section>
        </div>
      )}

      {message && !iaMessage ? <div className="person-meta">{message}</div> : null}

      <BirthRangeApplyConfirmPanel
        open={pendingDraft !== null}
        draft={pendingDraft}
        noteText={confirmNoteText}
        includeVerdict={confirmIncludeVerdict}
        onChangeNoteText={setConfirmNoteText}
        onChangeIncludeVerdict={setConfirmIncludeVerdict}
        onConfirm={handleConfirmApply}
        onCancel={() => {
          setPendingDraft(null);
          setConfirmNoteText("");
          setConfirmIncludeVerdict(false);
        }}
      />
    </div>
  );
}

