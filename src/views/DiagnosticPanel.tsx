import { useMemo, useState } from "react";
import { GraphDocument } from "@/types/domain";
import { analyzeGeneaDocument } from "@/core/diagnostics/analyzer";
import { applyDiagnosticFixes } from "@/core/diagnostics/fixExecutor";
import {
  DiagnosticCategory,
  DiagnosticFixAction,
  DiagnosticFixExecutionResult,
  DiagnosticFixOption,
  DiagnosticIssue
} from "@/core/diagnostics/types";

type Props = {
  document: GraphDocument | null;
  parseErrors: string[];
  parseWarnings: string[];
  onClose: () => void;
  onSelectPerson: (id: string, name: string) => void;
  onSelectFamily: (id: string) => void;
  onApplyDocument: (nextDoc: GraphDocument) => void;
};

const CATEGORY_LABELS: Record<DiagnosticCategory, string> = {
  structural: "Estructural",
  chronological: "Cronologia",
  data_quality: "Calidad de datos",
  relationships: "Relaciones"
};

function summarize(actions: DiagnosticFixAction[]): string {
  if (actions.length === 1) return "Aplicar esta correccion requiere confirmacion. Deseas continuar?";
  return `Aplicar ${actions.length} correcciones requiere confirmacion. Deseas continuar?`;
}

function getDefaultFix(issue: DiagnosticIssue): DiagnosticFixOption | undefined {
  if (!issue.fixOptions || issue.fixOptions.length === 0) return undefined;
  return issue.fixOptions.find((opt) => opt.recommended) || issue.fixOptions[0];
}

export function DiagnosticPanel({
  document,
  parseErrors,
  parseWarnings,
  onClose,
  onSelectPerson,
  onSelectFamily,
  onApplyDocument
}: Props) {
  const [filterSeverity, setFilterSeverity] = useState<"all" | "error" | "warning" | "info">("all");
  const [filterCategory, setFilterCategory] = useState<DiagnosticCategory | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [selectedOptionByIssue, setSelectedOptionByIssue] = useState<Record<string, string>>({});
  const [lastExecution, setLastExecution] = useState<DiagnosticFixExecutionResult | null>(null);

  const report = useMemo(() => {
    if (!document) return null;
    return analyzeGeneaDocument(document);
  }, [document]);

  const filteredIssues = useMemo(() => {
    if (!report) return [];
    return report.issues.filter((issue) => {
      if (filterSeverity !== "all" && issue.severity !== filterSeverity) return false;
      if (filterCategory !== "all" && issue.category !== filterCategory) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        issue.code.toLowerCase().includes(term) ||
        issue.message.toLowerCase().includes(term) ||
        issue.entityId.toLowerCase().includes(term) ||
        (issue.relatedEntityId || "").toLowerCase().includes(term)
      );
    });
  }, [report, filterSeverity, filterCategory, searchTerm]);

  const executeActions = (actions: DiagnosticFixAction[], options: DiagnosticFixOption[]) => {
    if (!document || actions.length === 0) return;
    const needsConfirmation = options.some((opt) => opt.requiresConfirmation || opt.risk !== "safe");
    if (needsConfirmation && !window.confirm(summarize(actions))) return;

    const { nextDoc, result } = applyDiagnosticFixes(document, actions);
    onApplyDocument(nextDoc);
    setLastExecution(result);
  };

  const applyIssueFix = (issue: DiagnosticIssue) => {
    const options = issue.fixOptions || [];
    if (options.length === 0) return;
    const chosenId = selectedOptionByIssue[issue.id];
    const option = options.find((opt) => opt.id === chosenId) || getDefaultFix(issue);
    if (!option) return;
    executeActions([option.action], [option]);
  };

  const applySelected = () => {
    if (!report) return;
    const selected = report.issues.filter((issue) => selectedIssueIds.has(issue.id));
    const options = selected
      .map((issue) => {
        const chosenId = selectedOptionByIssue[issue.id];
        return (issue.fixOptions || []).find((opt) => opt.id === chosenId) || getDefaultFix(issue);
      })
      .filter((opt): opt is DiagnosticFixOption => Boolean(opt));
    executeActions(options.map((opt) => opt.action), options);
  };

  const applySafeRecommended = () => {
    if (!report) return;
    const options = report.issues
      .flatMap((issue) => issue.fixOptions || [])
      .filter((opt) => opt.risk === "safe" && opt.recommended);
    executeActions(options.map((opt) => opt.action), options);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: 1080, maxHeight: "92vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Diagnostico Profesional</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={applySafeRecommended} disabled={!report || report.issues.length === 0}>Autocorregir seguras</button>
            <button onClick={applySelected} disabled={selectedIssueIds.size === 0}>Aplicar seleccionadas</button>
            <button onClick={() => setLastExecution(null)}>Reanalizar</button>
            <button onClick={onClose}>Cerrar</button>
          </div>
        </div>

        <div style={{ padding: 12, borderBottom: "1px solid var(--line)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => setFilterSeverity("all")}>Todas</button>
          <button onClick={() => setFilterSeverity("error")}>Errores</button>
          <button onClick={() => setFilterSeverity("warning")}>Warnings</button>
          <button onClick={() => setFilterSeverity("info")}>Info</button>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as DiagnosticCategory | "all")}> 
            <option value="all">Todas categorias</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Buscar por codigo, mensaje o ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ minWidth: 280 }}
          />
          {report ? (
            <span style={{ marginLeft: "auto", color: "var(--ink-muted)", fontSize: 13 }}>
              {report.counts.error} errores | {report.counts.warning} warnings | {report.counts.info} info
            </span>
          ) : null}
        </div>

        <div style={{ padding: 12, overflowY: "auto", flex: 1 }}>
          {(parseErrors.length > 0 || parseWarnings.length > 0) && (
            <div style={{ marginBottom: 12, padding: 10, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-card)" }}>
              <strong>Eventos de importacion</strong>
              {parseErrors.map((err, idx) => <div key={`err-${idx}`} className="modal-line error">{err}</div>)}
              {parseWarnings.map((warn, idx) => <div key={`warn-${idx}`} className="modal-line warning">{warn}</div>)}
            </div>
          )}

          {lastExecution && (
            <div style={{ marginBottom: 12, padding: 10, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-card)" }}>
              <strong>Ultima ejecucion:</strong> aplicadas {lastExecution.applied}, omitidas {lastExecution.skipped}, errores {lastExecution.errors.length}
            </div>
          )}

          {!report ? null : report.issues.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--ink-muted)", border: "1px dashed var(--line)", borderRadius: 8 }}>
              No se detectaron problemas.
            </div>
          ) : filteredIssues.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--ink-muted)", border: "1px dashed var(--line)", borderRadius: 8 }}>
              No hay resultados para los filtros actuales.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredIssues.map((issue) => {
                const isExpanded = expandedIssueId === issue.id;
                const options = issue.fixOptions || [];
                const selectedOption = options.find((opt) => opt.id === selectedOptionByIssue[issue.id]) || getDefaultFix(issue);
                const severityColor = issue.severity === "error" ? "var(--danger-text)" : issue.severity === "warning" ? "var(--warn-text)" : "var(--accent-strong)";

                return (
                  <div key={issue.id} style={{ border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-card)" }}>
                    <div style={{ padding: 10, display: "grid", gridTemplateColumns: "28px 120px 180px 120px 1fr auto", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedIssueIds.has(issue.id)}
                        onChange={(e) => {
                          setSelectedIssueIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(issue.id);
                            else next.delete(issue.id);
                            return next;
                          });
                        }}
                      />
                      <span style={{ color: severityColor, fontWeight: 700 }}>{issue.severity.toUpperCase()}</span>
                      <span>{CATEGORY_LABELS[issue.category]}</span>
                      <code>{issue.code}</code>
                      <div>{issue.message}</div>
                      <button onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}>{isExpanded ? "Ocultar" : "Ver"}</button>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: "1px solid var(--line)", padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            onClick={() => {
                              if (issue.entityId.startsWith("@I")) onSelectPerson(issue.entityId, document?.persons[issue.entityId]?.name || "");
                              else onSelectFamily(issue.entityId);
                            }}
                          >
                            Ir a {issue.entityId}
                          </button>
                          {issue.relatedEntityId && (
                            <button
                              onClick={() => {
                                if (issue.relatedEntityId!.startsWith("@I")) onSelectPerson(issue.relatedEntityId!, document?.persons[issue.relatedEntityId!]?.name || "");
                                else onSelectFamily(issue.relatedEntityId!);
                              }}
                            >
                              Ir a ref {issue.relatedEntityId}
                            </button>
                          )}
                          {issue.suggestedFix ? <span style={{ color: "var(--ink-muted)", fontSize: 13 }}>Sugerencia: {issue.suggestedFix}</span> : null}
                        </div>

                        {options.length === 0 ? (
                          <div style={{ color: "var(--ink-muted)", fontSize: 13 }}>Sin autocorrecciones para este codigo. Mantener edicion asistida.</div>
                        ) : (
                          <>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                              {options.map((opt) => (
                                <label key={opt.id} style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid var(--line)", borderRadius: 6, padding: 8 }}>
                                  <input
                                    type="radio"
                                    name={`fix-${issue.id}`}
                                    checked={selectedOption?.id === opt.id}
                                    onChange={() => setSelectedOptionByIssue((prev) => ({ ...prev, [issue.id]: opt.id }))}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{opt.label} {opt.recommended ? "(recomendada)" : ""}</div>
                                    <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>{opt.description}</div>
                                  </div>
                                  <span style={{ fontSize: 12 }}>{opt.risk}</span>
                                </label>
                              ))}
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <button onClick={() => applyIssueFix(issue)}>Aplicar correccion</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


