import type { DiagnosticReport } from "@/core/diagnostics/types";
import type { DataDiff } from "@/core/edit/diff";
import type { MergeSessionPreview } from "@/types/merge-review";
import { ContextCard } from "@/ui/context/ContextCard";

type Props = {
  diff: DataDiff;
  preview: MergeSessionPreview;
  diagnostics: DiagnosticReport;
  onExportAudit: () => void;
};

export function MergePreviewStep({ diff, preview, diagnostics, onExportAudit }: Props) {
  return (
    <div className="merge-preview-step">
      <ContextCard
        title="Vista previa de fusion"
        rows={[
          { label: "Personas nuevas", value: String(preview.stats.addedPersons), tone: "accent" },
          { label: "Personas actualizadas", value: String(preview.stats.updatedPersons) },
          { label: "Familias nuevas", value: String(preview.stats.addedFamilies), tone: "accent" },
          { label: "IDs personas renombrados", value: String(preview.stats.renamedPersonIds.length) },
          { label: "IDs familias renombrados", value: String(preview.stats.renamedFamilyIds.length) },
          { label: "Riesgo estimado", value: `${diff.summary.estimatedRisk}%`, tone: "warn" },
          { label: "Errores diagnostico", value: String(diagnostics.counts.error), tone: diagnostics.counts.error > 0 ? "warn" : "normal" }
        ]}
      />
      <ContextCard
        title="Compatibilidad y normalizacion"
        rows={[
          { label: "Base", value: `${diff.summary.compatibilitySummary?.baseFormat ?? "N/D"} (${diff.summary.compatibilitySummary?.baseVersion ?? "N/D"})` },
          { label: "Entrante", value: `${diff.summary.compatibilitySummary?.incomingFormat ?? "N/D"} (${diff.summary.compatibilitySummary?.incomingVersion ?? "N/D"})` },
          { label: "Normalizado", value: `${diff.summary.compatibilitySummary?.normalizedTo.sourceFormat ?? "GSK"} (${diff.summary.compatibilitySummary?.normalizedTo.gedVersion ?? "7.0.x"})`, tone: "accent" }
        ]}
      />
      {preview.merged.metadata.mergeAudit && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onExportAudit}>Exportar auditoria JSON</button>
        </div>
      )}
    </div>
  );
}
