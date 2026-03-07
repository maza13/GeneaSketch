import { useState } from "react";
import type { DiagnosticsViewModel } from "@/app-shell/facade/types";
import type { DiagnosticCategory, DiagnosticIssue } from "@/core/diagnostics/types";

type Props = {
  viewModel: DiagnosticsViewModel;
  commands: {
    onClose: () => void;
    onSelectPerson: (personId: string) => void;
    onSelectFamily: (familyId: string) => void;
    onApplyActions: (
      actions: import("@/core/diagnostics/types").DiagnosticFixAction[],
      options: import("@/core/diagnostics/types").DiagnosticFixOption[],
    ) => import("@/core/diagnostics/types").DiagnosticFixExecutionResult | null;
    resolveEntityLabel: (entityId: string) => string | undefined;
  };
};

const CATEGORY_LABELS: Record<DiagnosticCategory, string> = {
  structural: "Estructural",
  chronological: "Cronologia",
  data_quality: "Calidad de datos",
  relationships: "Relaciones",
};

function summarize(actions: import("@/core/diagnostics/types").DiagnosticFixAction[]): string {
  return actions.length === 1
    ? "Aplicar esta correccion requiere confirmacion. Deseas continuar?"
    : `Aplicar ${actions.length} correcciones requiere confirmacion. Deseas continuar?`;
}

function getDefaultFix(issue: DiagnosticIssue) {
  if (!issue.fixOptions || issue.fixOptions.length === 0) return undefined;
  return issue.fixOptions.find((option) => option.recommended) || issue.fixOptions[0];
}

export function ShellDiagnosticPanel({ viewModel, commands }: Props) {
  const [filterSeverity, setFilterSeverity] = useState<"all" | "error" | "warning" | "info">("all");
  const [filterCategory, setFilterCategory] = useState<DiagnosticCategory | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [selectedOptionByIssue, setSelectedOptionByIssue] = useState<Record<string, string>>({});
  const [lastExecution, setLastExecution] = useState<import("@/core/diagnostics/types").DiagnosticFixExecutionResult | null>(null);

  const report = viewModel.report;
  const filteredIssues = report?.issues.filter((issue) => {
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
  }) || [];

  const executeActions = (
    actions: import("@/core/diagnostics/types").DiagnosticFixAction[],
    options: import("@/core/diagnostics/types").DiagnosticFixOption[],
  ) => {
    if (actions.length === 0) return;
    const needsConfirmation = options.some((option) => option.requiresConfirmation || option.risk !== "safe");
    if (needsConfirmation && !window.confirm(summarize(actions))) return;
    setLastExecution(commands.onApplyActions(actions, options));
  };

  if (!report) return null;

  return (
    <div className="modal-overlay" onClick={commands.onClose}>
      <div className="modal-panel" style={{ width: 1080, maxHeight: "92vh", display: "flex", flexDirection: "column" }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Diagnostico profesional</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                const options = report.issues.flatMap((issue) => issue.fixOptions || []).filter((option) => option.risk === "safe" && option.recommended);
                executeActions(options.map((option) => option.action), options);
              }}
              disabled={report.issues.length === 0}
            >
              Autocorregir seguras
            </button>
            <button
              onClick={() => {
                const selected = report.issues.filter((issue) => selectedIssueIds.has(issue.id));
                const options = selected
                  .map((issue) => {
                    const chosenId = selectedOptionByIssue[issue.id];
                    return (issue.fixOptions || []).find((option) => option.id === chosenId) || getDefaultFix(issue);
                  })
                  .filter(Boolean) as import("@/core/diagnostics/types").DiagnosticFixOption[];
                executeActions(options.map((option) => option.action), options);
              }}
              disabled={selectedIssueIds.size === 0}
            >
              Aplicar seleccionadas
            </button>
            <button onClick={() => setLastExecution(null)}>Reanalizar</button>
            <button onClick={commands.onClose}>Cerrar</button>
          </div>
        </div>

        <div style={{ padding: 12, borderBottom: "1px solid var(--line)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => setFilterSeverity("all")}>Todas</button>
          <button onClick={() => setFilterSeverity("error")}>Errores</button>
          <button onClick={() => setFilterSeverity("warning")}>Warnings</button>
          <button onClick={() => setFilterSeverity("info")}>Info</button>
          <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value as DiagnosticCategory | "all")}>
            <option value="all">Todas categorias</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <input type="text" placeholder="Buscar por codigo, mensaje o ID" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} style={{ minWidth: 280 }} />
          <span style={{ marginLeft: "auto", color: "var(--ink-muted)", fontSize: 13 }}>
            {report.counts.error} errores | {report.counts.warning} warnings | {report.counts.info} info
          </span>
        </div>

        <div style={{ padding: 12, overflowY: "auto", flex: 1 }}>
          {(viewModel.parseErrors.length > 0 || viewModel.parseWarnings.length > 0) ? (
            <div style={{ marginBottom: 12, padding: 10, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-card)" }}>
              <strong>Eventos de importacion</strong>
              {viewModel.parseErrors.map((error, index) => <div key={`error-${index}`} className="modal-line error">{error}</div>)}
              {viewModel.parseWarnings.map((warning, index) => <div key={`warning-${index}`} className="modal-line warning">{warning}</div>)}
            </div>
          ) : null}

          {lastExecution ? (
            <div style={{ marginBottom: 12, padding: 10, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-card)" }}>
              <strong>Ultima ejecucion:</strong> aplicadas {lastExecution.applied}, omitidas {lastExecution.skipped}, errores {lastExecution.errors.length}
            </div>
          ) : null}

          {filteredIssues.map((issue) => {
            const options = issue.fixOptions || [];
            const isExpanded = expandedIssueId === issue.id;
            const selectedOption = options.find((option) => option.id === selectedOptionByIssue[issue.id]) || getDefaultFix(issue);
            const severityColor = issue.severity === "error" ? "var(--danger-text)" : issue.severity === "warning" ? "var(--warn-text)" : "var(--accent-strong)";

            return (
              <div key={issue.id} style={{ border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-card)", marginBottom: 10 }}>
                <div style={{ padding: 10, display: "grid", gridTemplateColumns: "28px 120px 180px 120px 1fr auto", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedIssueIds.has(issue.id)}
                    onChange={(event) => {
                      setSelectedIssueIds((prev) => {
                        const next = new Set(prev);
                        if (event.target.checked) next.add(issue.id);
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
                {isExpanded ? (
                  <div style={{ borderTop: "1px solid var(--line)", padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => issue.entityId.startsWith("@I") ? commands.onSelectPerson(issue.entityId) : commands.onSelectFamily(issue.entityId)}>
                        Ir a {commands.resolveEntityLabel(issue.entityId) || issue.entityId}
                      </button>
                      {issue.relatedEntityId ? (
                        <button onClick={() => issue.relatedEntityId!.startsWith("@I") ? commands.onSelectPerson(issue.relatedEntityId!) : commands.onSelectFamily(issue.relatedEntityId!)}>
                          Ir a ref {commands.resolveEntityLabel(issue.relatedEntityId) || issue.relatedEntityId}
                        </button>
                      ) : null}
                      {issue.suggestedFix ? <span style={{ color: "var(--ink-muted)", fontSize: 13 }}>Sugerencia: {issue.suggestedFix}</span> : null}
                    </div>

                    {options.length === 0 ? (
                      <div style={{ color: "var(--ink-muted)", fontSize: 13 }}>Sin autocorrecciones para este codigo.</div>
                    ) : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                          {options.map((option) => (
                            <label key={option.id} style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid var(--line)", borderRadius: 6, padding: 8 }}>
                              <input
                                type="radio"
                                name={`fix-${issue.id}`}
                                checked={selectedOption?.id === option.id}
                                onChange={() => setSelectedOptionByIssue((prev) => ({ ...prev, [issue.id]: option.id }))}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{option.label} {option.recommended ? "(recomendada)" : ""}</div>
                                <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>{option.description}</div>
                              </div>
                              <span style={{ fontSize: 12 }}>{option.risk}</span>
                            </label>
                          ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => {
                              if (!selectedOption) return;
                              executeActions([selectedOption.action], [selectedOption]);
                            }}
                          >
                            Aplicar correccion
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
