import { useMemo, useState } from "react";
import { caseMatchesSearch } from "@/core/edit/reviewSession";
import type { MergeHypothesis } from "@/types/domain";
import type { GraphDocument } from "@/types/domain";
import type { MergeReviewCase, MergeReviewSession } from "@/types/merge-review";

type Props = {
  session: MergeReviewSession;
  mode: "auto_deep" | "expert_workbench";
  incomingDoc: GraphDocument;
  onSelectCase: (incomingId: string) => void;
  onSearchChange: (search: string) => void;
  onToggleLowSection: (visible: boolean) => void;
};

const ROW_HEIGHT = 64;
const OVERSCAN = 8;

function riskBadgeClass(risk: MergeReviewCase["riskLevel"]): string {
  if (risk === "high") return "merge-risk-badge merge-risk-badge--high";
  if (risk === "medium") return "merge-risk-badge merge-risk-badge--medium";
  return "merge-risk-badge merge-risk-badge--low";
}

function riskLabel(risk: MergeReviewCase["riskLevel"]): string {
  if (risk === "high") return "alto";
  if (risk === "medium") return "medio";
  return "bajo";
}

function hypothesisLabel(hypothesisType: string): string {
  if (hypothesisType === "CreateNewPerson") return "Crear persona nueva";
  return hypothesisType;
}

function selectedHypothesisSafe(reviewCase: MergeReviewCase): MergeHypothesis | null {
  return reviewCase.hypothesesTopK[reviewCase.selectedHypothesis] || reviewCase.hypothesesTopK[0] || null;
}

function VirtualCaseList({
  ids,
  session,
  incomingDoc,
  selectedCaseId,
  onSelectCase,
  maxHeight
}: {
  ids: string[];
  session: MergeReviewSession;
  incomingDoc: GraphDocument;
  selectedCaseId: string | null;
  onSelectCase: (incomingId: string) => void;
  maxHeight: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const totalHeight = ids.length * ROW_HEIGHT;
  const viewportHeight = Math.min(maxHeight, Math.max(ROW_HEIGHT * 2, totalHeight));
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const end = Math.min(ids.length, start + visibleCount);
  const topPad = start * ROW_HEIGHT;
  const bottomPad = Math.max(0, totalHeight - end * ROW_HEIGHT);
  const visibleIds = ids.slice(start, end);

  if (ids.length === 0) {
    return <div className="merge-inbox-empty">Sin casos en esta seccion.</div>;
  }

  return (
    <div
      className="merge-inbox-virtual"
      style={{ maxHeight: viewportHeight }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: topPad }} />
      {visibleIds.map((incomingId) => {
        const reviewCase = session.cases[incomingId];
        if (!reviewCase) return null;
        const incoming = incomingDoc.persons[incomingId];
        const selectedHypothesis = selectedHypothesisSafe(reviewCase);
        const activeActions = Array.isArray(reviewCase.requiredActionsApplied) ? reviewCase.requiredActionsApplied.length : 0;
        const isSelected = selectedCaseId === incomingId;
        return (
          <button
            key={incomingId}
            className={`merge-case-row${isSelected ? " is-selected" : ""}`}
            onClick={() => onSelectCase(incomingId)}
          >
            <div className="merge-case-row__top">
              <span className="merge-case-row__name">
                {incoming?.name || "(Sin nombre)"} {incoming?.surname || ""}
              </span>
              <span className={riskBadgeClass(reviewCase.riskLevel)}>{riskLabel(reviewCase.riskLevel)}</span>
            </div>
            <div className="merge-case-row__meta">
              <span>{incomingId}</span>
              <span>{hypothesisLabel(selectedHypothesis?.hypothesisType || "CreateNewPerson")}</span>
              <span>P{reviewCase.priority}</span>
              <span>{activeActions > 0 ? `${activeActions} accion(es)` : "sin aplicar"}</span>
            </div>
          </button>
        );
      })}
      <div style={{ height: bottomPad }} />
    </div>
  );
}

export function MergeInboxPane({
  session,
  mode,
  incomingDoc,
  onSelectCase,
  onSearchChange,
  onToggleLowSection
}: Props) {
  const filteredIds = useMemo(
    () =>
      session.orderedCaseIds.filter((incomingId) =>
        session.cases[incomingId] &&
        caseMatchesSearch(session.cases[incomingId], incomingDoc.persons[incomingId], session.filters.search)
      ),
    [incomingDoc.persons, session]
  );

  const highIds = filteredIds.filter((incomingId) => session.cases[incomingId]?.riskLevel === "high");
  const mediumIds = filteredIds.filter((incomingId) => session.cases[incomingId]?.riskLevel === "medium");
  const lowIds = filteredIds.filter((incomingId) => session.cases[incomingId]?.riskLevel === "low");
  const networkConfirmedIds = filteredIds.filter((incomingId) => {
    const reviewCase = session.cases[incomingId];
    const hypothesis = reviewCase ? selectedHypothesisSafe(reviewCase) : null;
    return hypothesis?.hypothesisType === "SamePersonNetworkConfirmed" || reviewCase?.status === "auto_applied";
  });
  const criticalOverrideIds = filteredIds.filter((incomingId) => {
    const reviewCase = session.cases[incomingId];
    const hypothesis = reviewCase ? selectedHypothesisSafe(reviewCase) : null;
    return hypothesis?.hypothesisType === "SamePersonCriticalOverride";
  });
  const manualReviewIds = filteredIds.filter((incomingId) => !networkConfirmedIds.includes(incomingId) && !criticalOverrideIds.includes(incomingId));

  return (
    <div className="merge-inbox-pane">
      <div className="merge-pane-header">
        <div className="merge-pane-title">Bandeja de riesgo</div>
        <input
          value={session.filters.search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nombre o ID"
        />
      </div>

      {mode === "auto_deep" ? (
        <>
          <div className="merge-section">
            <div className="merge-section__header">
              <strong>Auto confirmados por red</strong>
              <span>{networkConfirmedIds.length}</span>
            </div>
            <VirtualCaseList
              ids={networkConfirmedIds}
              session={session}
              incomingDoc={incomingDoc}
              selectedCaseId={session.selectedCaseId}
              onSelectCase={onSelectCase}
              maxHeight={220}
            />
          </div>

          <div className="merge-section">
            <div className="merge-section__header">
              <strong>Excepciones criticas auto</strong>
              <span>{criticalOverrideIds.length}</span>
            </div>
            <VirtualCaseList
              ids={criticalOverrideIds}
              session={session}
              incomingDoc={incomingDoc}
              selectedCaseId={session.selectedCaseId}
              onSelectCase={onSelectCase}
              maxHeight={220}
            />
          </div>

          <div className="merge-section">
            <div className="merge-section__header">
              <strong>Revision manual</strong>
              <span>{manualReviewIds.length}</span>
            </div>
            <VirtualCaseList
              ids={manualReviewIds}
              session={session}
              incomingDoc={incomingDoc}
              selectedCaseId={session.selectedCaseId}
              onSelectCase={onSelectCase}
              maxHeight={260}
            />
          </div>
        </>
      ) : (
        <>
          <div className="merge-section">
            <div className="merge-section__header">
              <strong>Bloqueados (alto)</strong>
              <span>{highIds.length}</span>
            </div>
            <VirtualCaseList
              ids={highIds}
              session={session}
              incomingDoc={incomingDoc}
              selectedCaseId={session.selectedCaseId}
              onSelectCase={onSelectCase}
              maxHeight={220}
            />
          </div>

          <div className="merge-section">
            <div className="merge-section__header">
              <strong>Revision (medio)</strong>
              <span>{mediumIds.length}</span>
            </div>
            <VirtualCaseList
              ids={mediumIds}
              session={session}
              incomingDoc={incomingDoc}
              selectedCaseId={session.selectedCaseId}
              onSelectCase={onSelectCase}
              maxHeight={260}
            />
          </div>

          <div className="merge-section">
            <div className="merge-section__header">
              <strong>Auto-aplicados (bajo)</strong>
              <button onClick={() => onToggleLowSection(!session.filters.showLowSection)}>
                {session.filters.showLowSection ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {session.filters.showLowSection ? (
              <VirtualCaseList
                ids={lowIds}
                session={session}
                incomingDoc={incomingDoc}
                selectedCaseId={session.selectedCaseId}
                onSelectCase={onSelectCase}
                maxHeight={220}
              />
            ) : (
              <div className="merge-inbox-empty">Seccion colapsada ({lowIds.length})</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

