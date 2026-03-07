import { useEffect, useMemo, useState } from "react";
import { applyApprovedAiReview } from "@/core/ai/apply";
import { AiPipelineStageError, runAiGlobalFocusDetection, runAiPipeline } from "@/core/ai/orchestrator";
import { rankFocusCandidatesByName } from "@/core/ai/matching";
import { updateAiReviewItemCandidate, updateAiReviewItemSelection, updateAiReviewItemStatus } from "@/core/ai/reviewState";
import { aiAppendDiagnosticLog, aiReadDiagnosticLog } from "@/services/aiRuntime";
import { downloadBlob } from "@/utils/download";
import type { AiDiagnosticEntry, AiGlobalFocusDetection, AiInputContext, AiReviewDraft, AiReviewItemStatus } from "@/types/ai";
import type { AiAssistantDocumentView, AiAssistantViewModel } from "@/app-shell/facade/types";


type Props = {
  viewModel: AiAssistantViewModel;
  onClose: () => void;
  onStatus: (message: string) => void;
  onApplyBatch: (nextDoc: AiAssistantDocumentView, summary: string) => void;
  onOpenSettings: () => void;
};

type ReviewStep = 1 | 2 | 3 | 4 | 5;

function contextLabel(context: AiInputContext | null, document?: AiAssistantDocumentView | null): string {
  if (!context) return "Sin contexto";
  const kind = context.kind === "local" ? "Enfoque Local" : "Contexto Global";
  if (context.kind === "local" && document) {
    const p = document.persons[context.anchorPersonId];
    if (p) return `${kind} | ${p.name || ""} ${p.surname || ""}`.trim();
  }
  return kind;
}

function summarizePipelineError(message: string): string {
  if (!message.includes("AI_STAGE_")) return message;
  const detailsMarker = ". details:";
  const markerIdx = message.indexOf(detailsMarker);
  if (markerIdx > 0) {
    return message.slice(0, markerIdx);
  }
  return message;
}

function diagnosticsToText(
  entries: AiDiagnosticEntry[],
  runId: string | null,
  technicalError: string | null,
  logPath: string | null
): string {
  const lines = [
    "GeneaSketch AI Diagnostics Report",
    `GeneratedAt: ${new Date().toISOString()}`,
    `RunId: ${runId || "n/a"}`,
    `LogPath: ${logPath || "n/a"}`,
    "",
    `TechnicalError: ${technicalError || "n/a"}`,
    "",
    "Attempts:"
  ];

  if (entries.length === 0) {
    lines.push("- none");
  } else {
    for (const entry of entries) {
      lines.push(
        `- ${entry.timestamp} stage=${entry.stage} provider=${entry.provider} model=${entry.model} status=${entry.statusCode ?? "n/a"} reason=${entry.reasonShort ?? "n/a"} retryCount=${entry.retryCount}`
      );
      lines.push(`  message: ${entry.messageRedacted}`);
      lines.push(`  technical: ${entry.technicalDetailRedacted}`);
    }
  }

  return lines.join("\n");
}

function stepTitle(step: ReviewStep): string {
  if (step === 1) return "1) Extraccion";
  if (step === 2) return "2) Identidad";
  if (step === 3) return "3) Creacion";
  if (step === 4) return "4) Cambios";
  return "5) Relaciones";
}

export function AiAssistantModal({ viewModel, onClose, onStatus, onApplyBatch, onOpenSettings }: Props) {
  const { open, context, documentView: document, settings } = viewModel;
  const [inputText, setInputText] = useState("");
  const [running, setRunning] = useState(false);
  const [review, setReview] = useState<AiReviewDraft | null>(null);
  const [reviewStep, setReviewStep] = useState<ReviewStep>(1);
  const [error, setError] = useState<string | null>(null);
  const [technicalError, setTechnicalError] = useState<string | null>(null);
  const [errorRunId, setErrorRunId] = useState<string | null>(null);
  const [errorDiagnostics, setErrorDiagnostics] = useState<AiDiagnosticEntry[]>([]);
  const [diagnosticLogPath, setDiagnosticLogPath] = useState<string | null>(null);
  const [deleteConfirmMap, setDeleteConfirmMap] = useState<Record<string, boolean>>({});
  const [progressMessage, setProgressMessage] = useState<string>("Preparando ejecucion...");
  const [progressStartedAt, setProgressStartedAt] = useState<number | null>(null);
  const [progressElapsedSeconds, setProgressElapsedSeconds] = useState(0);
  const [globalFocus, setGlobalFocus] = useState<AiGlobalFocusDetection | null>(null);
  const [selectedGlobalFocusId, setSelectedGlobalFocusId] = useState("");
  const [focusSearchText, setFocusSearchText] = useState("");

  useEffect(() => {
    if (!open) return;
    setInputText("");
    setReview(null);
    setReviewStep(1);
    setError(null);
    setTechnicalError(null);
    setErrorRunId(null);
    setErrorDiagnostics([]);
    setDiagnosticLogPath(null);
    setDeleteConfirmMap({});
    setProgressMessage("Preparando ejecucion...");
    setProgressStartedAt(null);
    setProgressElapsedSeconds(0);
    setGlobalFocus(null);
    setSelectedGlobalFocusId("");
    setFocusSearchText("");
  }, [open, context]);

  useEffect(() => {
    if (!running || !progressStartedAt) return;
    const timer = setInterval(() => {
      setProgressElapsedSeconds(Math.floor((Date.now() - progressStartedAt) / 1000));
    }, 500);
    return () => clearInterval(timer);
  }, [running, progressStartedAt]);

  const approvedCount = useMemo(
    () => review?.items.filter((item) => item.status === "approved").length ?? 0,
    [review]
  );

  const pendingDecisionCount = useMemo(
    () => review?.items.filter((item) => item.requiresDecision && item.status !== "rejected").length ?? 0,
    [review]
  );

  const focusCandidates = useMemo(() => {
    if (!document) return [];
    if (globalFocus?.candidates?.length) return globalFocus.candidates;
    if (!focusSearchText.trim()) return [];
    return rankFocusCandidatesByName(focusSearchText, document, 8);
  }, [document, globalFocus, focusSearchText]);

  if (!open) return null;

  async function handleRun() {
    if (!document || !context) return;
    const trimmed = inputText.trim();
    if (!trimmed) {
      setError("Escribe un texto para analizar.");
      return;
    }
    if (context.kind === "global" && !selectedGlobalFocusId) {
      setError("Confirma la persona foco antes de analizar.");
      return;
    }
    setRunning(true);
    setProgressStartedAt(Date.now());
    setProgressElapsedSeconds(0);
    setProgressMessage("Iniciando pipeline IA...");
    setError(null);
    setTechnicalError(null);
    setErrorRunId(null);
    setErrorDiagnostics([]);
    setDiagnosticLogPath(null);

    try {
      let effectiveContext: AiInputContext = context;
      if (context.kind === "global") {
        effectiveContext = { kind: "local", anchorPersonId: selectedGlobalFocusId };
      }

      const draft = await runAiPipeline({
        document,
        settings,
        context: effectiveContext,
        text: trimmed,
        onProgress: (message) => setProgressMessage(message)
      });
      setReview(draft);
      setReviewStep(2);
      onStatus(`Borrador IA generado: ${draft.items.length} acciones propuestas.`);
    } catch (runError) {
      let technicalMessage = "Error desconocido";
      if (runError instanceof Error) {
        technicalMessage = runError.message;
      } else if (typeof runError === "object" && runError !== null) {
        technicalMessage = (runError as any).details || (runError as any).summary || JSON.stringify(runError);
      } else {
        technicalMessage = String(runError);
      }

      if (runError instanceof AiPipelineStageError) {
        setErrorRunId(runError.runId);
        setErrorDiagnostics(runError.diagnostics);
        for (const entry of runError.diagnostics) {
          try {
            await aiAppendDiagnosticLog({ entry });
          } catch {
            // Ignore logging failures in UI flow
          }
        }
        try {
          const logInfo = await aiReadDiagnosticLog();
          setDiagnosticLogPath(logInfo.path);
        } catch {
          setDiagnosticLogPath(null);
        }
      }

      setError(summarizePipelineError(technicalMessage));
      setTechnicalError(technicalMessage);
      onStatus(`Error en pipeline IA: ${technicalMessage}`);
    } finally {
      setRunning(false);
      setProgressStartedAt(null);
    }
  }

  async function handleDetectFocus() {
    if (!document || !context || context.kind !== "global") return;
    const trimmed = inputText.trim();
    if (!trimmed) {
      setError("Escribe un texto para detectar la persona foco.");
      return;
    }

    setRunning(true);
    setError(null);
    try {
      const detection = await runAiGlobalFocusDetection({
        document,
        settings,
        text: trimmed
      });
      setGlobalFocus(detection);
      setSelectedGlobalFocusId(detection.topCandidateId || "");
      onStatus(`Foco detectado: ${detection.extractedFocusName || "sin nombre claro"}.`);
    } catch (runError) {
      const technicalMessage = runError instanceof Error ? runError.message : String(runError);
      setError(summarizePipelineError(technicalMessage));
      onStatus(`Error en deteccion de foco: ${technicalMessage}`);
    } finally {
      setRunning(false);
    }
  }

  function updateStatus(itemId: string, status: AiReviewItemStatus) {
    setReview((prev) => (prev ? updateAiReviewItemStatus(prev, itemId, status) : prev));
  }

  function updateCandidate(itemId: string, candidateId: string) {
    setReview((prev) => (prev ? updateAiReviewItemCandidate(prev, itemId, candidateId) : prev));
  }

  function updateSelection(
    itemId: string,
    patch: {
      anchorPersonId?: string;
      relatedPersonId?: string;
      targetFamilyId?: string;
      createNewRelatedPerson?: boolean;
    }
  ) {
    setReview((prev) => (prev ? updateAiReviewItemSelection(prev, itemId, patch) : prev));
  }

  function handleApplyBatch() {
    if (!review || !document) return;
    const unresolvedBlocked = review.items.find((item) => item.status === "approved" && item.blocked && item.requiresDecision);
    if (unresolvedBlocked) {
      setError(`Resuelve decisiones pendientes antes de aplicar (${unresolvedBlocked.id}).`);
      return;
    }

    const unconfirmedDelete = review.items.find(
      (item) => item.status === "approved" && item.requiresDeleteConfirmation && !deleteConfirmMap[item.id]
    );
    if (unconfirmedDelete) {
      setError(`Confirma deletes de alto riesgo antes de aplicar (${unconfirmedDelete.id}).`);
      return;
    }

    try {
      const result = applyApprovedAiReview(document, review);
      const summary = `Lote IA aplicado: ${result.appliedItemIds.length} acciones.`;
      onApplyBatch(result.nextDoc, summary + (result.warnings.length ? ` Advertencias: ${result.warnings.length}.` : ""));
      setReview(null);
      setInputText("");
      setDeleteConfirmMap({});
      setReviewStep(1);
      onStatus(`${summary} Cambios detallados: ${result.appliedChanges.length}.`);
    } catch (applyError) {
      const message = applyError instanceof Error ? applyError.message : String(applyError);
      setError(`Fallo aplicacion de lote: ${message}`);
      onStatus(`Fallo lote IA: ${message}`);
    }
  }

  const visibleItems = review
    ? review.items.filter((item) => {
      if (reviewStep === 2) return item.stepIndex === 0;
      if (reviewStep === 3) return item.stepIndex === 1;
      if (reviewStep === 4) return item.stepIndex === 2;
      if (reviewStep === 5) return item.stepIndex === 3;
      return true;
    })
    : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel ai-assistant-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header" style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-color-dim)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--gs-accent-gold)" }}>Asistente IA</h3>
            <span style={{ color: "var(--border-color)", fontWeight: 300 }}>|</span>
            <span style={{ fontSize: "0.95rem", color: "var(--gs-ink-secondary)", fontWeight: 500 }}>{contextLabel(context?.kind === "global" && selectedGlobalFocusId ? { kind: "local", anchorPersonId: selectedGlobalFocusId } : context, document)}</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="secondary-ghost icon-btn" onClick={onOpenSettings} title="Configuracion IA">
              Config
            </button>
            <button onClick={onClose}>Cerrar</button>
          </div>
        </div>

        {error ? <div className="modal-line error" style={{ margin: "16px 24px 0" }}>{error}</div> : null}

        {running ? (
          <div className="modal-line warning" style={{ margin: "16px 24px 0", borderRadius: 8, padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="spinner-small" />
              <div style={{ flex: 1 }}>
                <strong style={{ display: "block", marginBottom: 2 }}>IA Procesando</strong>
                <span style={{ fontSize: 13, opacity: 0.9 }}>
                  {progressMessage.includes("...") ? progressMessage : `${progressMessage}...`}
                  <span style={{ marginLeft: 8, color: "var(--gs-accent-gold)" }}>({progressElapsedSeconds}s)</span>
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {technicalError ? (
          <div className="modal-line warning" style={{ margin: "10px 24px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <strong>Detalle tecnico</strong>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(technicalError);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Copiar
                </button>
                <button
                  onClick={() => {
                    const text = diagnosticsToText(errorDiagnostics, errorRunId, technicalError, diagnosticLogPath);
                    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `ai-diagnostics-${errorRunId || Date.now()}.txt`);
                  }}
                >
                  Exportar TXT
                </button>
              </div>
            </div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>{technicalError}</pre>
          </div>
        ) : null}

        {!review ? (
          <div className="builder" style={{ padding: "16px 24px" }}>
            <label>
              Texto libre
              <textarea
                className="ai-textarea"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="Ejemplo: Juan Jesus se caso con Johana Torres en 2019 y tuvieron un hijo en 2025 llamado Josa"
              />
            </label>
            {context?.kind === "global" ? (
              <div style={{ marginTop: 12, border: "1px solid var(--border-color-dim)", borderRadius: 8, padding: 12 }}>
                <strong style={{ display: "block", marginBottom: 8 }}>Paso 0: Confirmar persona foco</strong>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <button disabled={running} onClick={() => void handleDetectFocus()}>
                    Detectar foco
                  </button>
                  <input
                    type="text"
                    value={focusSearchText}
                    onChange={(event) => setFocusSearchText(event.target.value)}
                    placeholder="Buscar foco manual por nombre..."
                    style={{ flex: 1 }}
                  />
                </div>
                <div style={{ maxHeight: 160, overflow: "auto", border: "1px solid var(--border-color-dim)", borderRadius: 6, padding: 8 }}>
                  {focusCandidates.length === 0 ? (
                    <div style={{ opacity: 0.8 }}>Sin candidatos. Detecta foco o busca manualmente.</div>
                  ) : (
                    focusCandidates.map((candidate) => (
                      <label key={candidate.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <input
                          type="radio"
                          name="focus-candidate"
                          checked={selectedGlobalFocusId === candidate.id}
                          onChange={() => setSelectedGlobalFocusId(candidate.id)}
                        />
                        <span>{candidate.label}</span>
                        <span style={{ opacity: 0.7 }}>({Math.round(candidate.score * 100)}%)</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : null}
            <div className="ai-settings-actions">
              <button disabled={running || (context?.kind === "global" && !selectedGlobalFocusId)} onClick={() => void handleRun()}>
                {running ? "Procesando..." : "Analizar"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: "16px 24px" }}>
            <div className="ai-review-summary" style={{ marginBottom: 16, backgroundColor: "var(--bg-color-alt)", padding: "12px 16px", borderRadius: 8, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 8 }}>
                <span><strong style={{ color: "var(--gs-ink-muted)" }}>Informante:</strong> {review.informantName}</span>
                <span><strong style={{ color: "var(--gs-ink-muted)" }}>Modelos:</strong> {review.usedModels?.extraction} {" -> "} {review.usedModels?.resolution}</span>
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", opacity: 0.8 }}>
                <span>Acciones: {review.items.length}</span>
                <span>Aprobadas: {approvedCount}</span>
                <span>Pendientes: {pendingDecisionCount}</span>
              </div>
            </div>

            {review.userMessage ? (
              <div className="modal-line info" style={{ backgroundColor: "var(--accent-color-dim)", borderLeft: "4px solid var(--accent-color)", padding: "10px 12px", margin: "8px 0", borderRadius: 4 }}>
                <strong>Mensaje de la IA:</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: 13 }}>{review.userMessage}</p>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 6, margin: "8px 0", flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5].map((rawStep) => {
                const step = rawStep as ReviewStep;
                return (
                  <button key={step} className={reviewStep === step ? "primary" : ""} onClick={() => setReviewStep(step)}>
                    {stepTitle(step)}
                  </button>
                );
              })}
            </div>

            {review.warnings.length > 0 ? <div className="modal-line warning">{review.warnings.join(" | ")}</div> : null}

            <div className="ai-review-list">
              {visibleItems.map((item) => (
                <div key={item.id} className={`ai-review-item ai-risk-${item.risk}`}>
                  <div className="ai-review-head">
                    <strong>{item.title}</strong>
                    <span className={`merge-risk-badge ${item.risk === "high" ? "merge-risk-badge--high" : item.risk === "medium" ? "merge-risk-badge--medium" : "merge-risk-badge--low"}`}>
                      {item.risk.toUpperCase()}
                    </span>
                  </div>
                  <div className="ai-review-description">{item.description}</div>

                  {item.kind === "create_relation" && item.candidateGroups ? (
                    <div className="ai-review-issues" style={{ marginTop: 8 }}>
                      <strong>Resolver relacion</strong>
                      <label>
                        Persona ancla
                        <select
                          value={item.selection?.anchorPersonId || item.candidateGroups.anchor[0]?.id || ""}
                          onChange={(event) => updateSelection(item.id, { anchorPersonId: event.target.value })}
                        >
                          {item.candidateGroups.anchor.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.label} - score {Math.round(candidate.score * 100)}%
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Persona relacionada
                        <select
                          disabled={Boolean(item.selection?.createNewRelatedPerson)}
                          value={item.selection?.relatedPersonId || item.candidateGroups.related[0]?.id || ""}
                          onChange={(event) => updateSelection(item.id, { relatedPersonId: event.target.value, createNewRelatedPerson: false })}
                        >
                          <option value="">(sin seleccion)</option>
                          {item.candidateGroups.related.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.label} - score {Math.round(candidate.score * 100)}%
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Familia destino
                        <select
                          value={item.selection?.targetFamilyId || ""}
                          onChange={(event) => updateSelection(item.id, { targetFamilyId: event.target.value || undefined })}
                        >
                          <option value="">(sin seleccion)</option>
                          {(item.candidateGroups.families || []).map((family) => (
                            <option key={family.id} value={family.id}>{family.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(item.selection?.createNewRelatedPerson)}
                          onChange={(event) => updateSelection(item.id, { createNewRelatedPerson: event.target.checked })}
                        />
                        Crear persona nueva si no hay coincidencia exacta
                      </label>
                    </div>
                  ) : null}

                  {item.candidates.length > 0 ? (
                    <label>
                      Candidato objetivo
                      <select value={item.selectedCandidateId || ""} onChange={(event) => updateCandidate(item.id, event.target.value)}>
                        <option value="">(sin seleccion)</option>
                        {item.candidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.label} - score {Math.round(candidate.score * 100)}%
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {item.issues.length > 0 ? (
                    <div className="ai-review-issues" style={{ marginTop: 8 }}>
                      {item.issues.map((issue) => (
                        <div key={issue}>{issue}</div>
                      ))}
                    </div>
                  ) : null}

                  {item.attributeConflicts && item.attributeConflicts.length > 0 ? (
                    <div style={{ marginTop: 8, border: "1px solid var(--border-color-dim)", borderRadius: 6, padding: 8 }}>
                      <strong style={{ display: "block", marginBottom: 6 }}>Conflictos de atributos</strong>
                      {item.attributeConflicts.map((conflict, index) => (
                        <div key={`${item.id}-${index}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 6, alignItems: "center", marginBottom: 6 }}>
                          <span>{conflict.attribute}</span>
                          <span style={{ opacity: 0.7 }}>{conflict.currentValue}</span>
                          <span>{conflict.suggestedValue}</span>
                          <button
                            className={conflict.accepted ? "primary small" : "small"}
                            onClick={() => {
                              setReview((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  items: prev.items.map((candidate) => {
                                    if (candidate.id !== item.id || !candidate.attributeConflicts) return candidate;
                                    const nextConflicts = [...candidate.attributeConflicts];
                                    nextConflicts[index] = { ...nextConflicts[index], accepted: !nextConflicts[index].accepted };
                                    return { ...candidate, attributeConflicts: nextConflicts };
                                  })
                                };
                              });
                            }}
                          >
                            {conflict.accepted ? "Aceptar" : "Omitir"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <label>
                    Estado
                    <select value={item.status} onChange={(event) => updateStatus(item.id, event.target.value as AiReviewItemStatus)}>
                      <option value="proposed">Propuesto</option>
                      <option value="approved">Aprobar</option>
                      <option value="rejected">Rechazar</option>
                    </select>
                  </label>

                  {item.requiresDeleteConfirmation && item.status === "approved" ? (
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(deleteConfirmMap[item.id])}
                        onChange={(event) =>
                          setDeleteConfirmMap((prev) => ({
                            ...prev,
                            [item.id]: event.target.checked
                          }))
                        }
                      />
                      Confirmo operacion destructiva (soft delete)
                    </label>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="builder-actions">
              <button onClick={() => setReview(null)}>Ajustar texto</button>
              <button disabled={running} onClick={() => void handleRun()}>Analizar de nuevo</button>
              <button className="primary" disabled={approvedCount === 0} onClick={handleApplyBatch}>
                Aplicar {approvedCount} cambios
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}











