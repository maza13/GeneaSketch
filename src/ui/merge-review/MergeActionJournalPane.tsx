import { ContextCard } from "@/ui/context/ContextCard";
import type { MergeReviewSession } from "@/types/merge-review";

type Props = {
  session: MergeReviewSession;
  onRevertAction: (actionId: string) => void;
};

export function MergeActionJournalPane({ session, onRevertAction }: Props) {
  const latest = [...session.actionJournal].reverse().slice(0, 40);
  return (
    <div className="merge-journal-pane">
      <ContextCard
        compact
        title="Resumen vivo"
        rows={[
          { label: "Total casos", value: String(session.derivedStats.totalCases) },
          { label: "Alto", value: String(session.derivedStats.high), tone: "warn" },
          { label: "Medio", value: String(session.derivedStats.medium), tone: "warn" },
          { label: "Bajo", value: String(session.derivedStats.low), tone: "accent" },
          { label: "Pendientes", value: String(session.derivedStats.pending), tone: "warn" },
          { label: "Auto-aplicados", value: String(session.derivedStats.autoApplied), tone: "accent" },
          { label: "Medio sugerido", value: String(session.derivedStats.mediumSuggested), tone: "warn" },
          { label: "Medio auto", value: String(session.derivedStats.mediumAutoApplied), tone: "accent" },
          { label: "Manuales", value: String(session.derivedStats.manualApplied), tone: "accent" },
          { label: "Sobrescrituras manuales", value: String(session.derivedStats.manualOverrides), tone: "normal" },
          { label: "Bloqueados sin resolver", value: String(session.gates.unresolvedBlocked), tone: session.gates.unresolvedBlocked > 0 ? "warn" : "normal" },
          { label: "Tecnicos pendientes", value: String(session.gates.unresolvedTechnical), tone: session.gates.unresolvedTechnical > 0 ? "warn" : "normal" }
        ]}
      />

      <div className="merge-journal-card">
        <div className="merge-journal-card__title">Historial de acciones</div>
        {latest.length === 0 && <div className="merge-journal-empty">Sin acciones aplicadas.</div>}
        {latest.map((entry) => (
          <div key={entry.actionId} className={`merge-journal-item${entry.revertedAt ? " is-reverted" : ""}`}>
            <div className="merge-journal-item__line">
              <code>{entry.actionId}</code>
              <span>{entry.incomingId}</span>
              <strong>{entry.action.kind}</strong>
            </div>
            <div className="merge-journal-item__line">
              <span>{entry.source}</span>
              <span>{entry.revertedAt ? "revertida" : "activa"}</span>
            </div>
            {!entry.revertedAt && (
              <button onClick={() => onRevertAction(entry.actionId)}>
                Revertir accion
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
