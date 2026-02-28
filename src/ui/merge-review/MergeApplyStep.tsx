import type { DiagnosticReport } from "@/core/diagnostics/types";
import type { MergeSessionPreview } from "@/types/merge-review";
import { ContextCard } from "@/ui/context/ContextCard";

type Props = {
  preview: MergeSessionPreview;
  diagnostics: DiagnosticReport;
  unresolvedBlocked: number;
  unresolvedTechnical: number;
  onApply: () => void;
};

export function MergeApplyStep({
  preview,
  diagnostics,
  unresolvedBlocked,
  unresolvedTechnical,
  onApply
}: Props) {
  const blocked = unresolvedBlocked > 0 || unresolvedTechnical > 0 || diagnostics.counts.error > 0;
  return (
    <div className="merge-apply-step">
      <ContextCard
        title="Aplicar fusion"
        rows={[
          { label: "Errores criticos nuevos", value: String(diagnostics.counts.error), tone: diagnostics.counts.error > 0 ? "warn" : "normal" },
          { label: "Advertencias", value: String(diagnostics.counts.warning), tone: "muted" },
          { label: "Bloqueados sin resolver", value: String(unresolvedBlocked), tone: unresolvedBlocked > 0 ? "warn" : "normal" },
          { label: "Tecnicos pendientes", value: String(unresolvedTechnical), tone: unresolvedTechnical > 0 ? "warn" : "normal" },
          { label: "Personas nuevas", value: String(preview.stats.addedPersons), tone: "accent" },
          { label: "Personas actualizadas", value: String(preview.stats.updatedPersons), tone: "accent" }
        ]}
        footer={
          unresolvedBlocked > 0
            ? "Modo estricto: hay casos de alto riesgo sin decision manual."
            : unresolvedTechnical > 0
              ? "Existen conflictos tecnicos pendientes."
              : diagnostics.counts.error > 0
                ? "Se detectaron errores estructurales antes de aplicar."
                : "Listo para aplicar."
        }
      />
      <button className="primary" disabled={blocked} onClick={onApply}>
        Finalizar y aplicar fusion
      </button>
    </div>
  );
}
