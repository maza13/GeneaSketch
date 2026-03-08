import { findKinship, getLifeOverlapInfo } from "@/core/graph/kinship";
import { ContextCard } from "@/ui/context/ContextCard";
import type { ActiveOverlay, GraphDocument } from "@/types/domain";
import type { KinshipHeatmapRuntime } from "@/views/kindra-v31/overlays/kinshipHeatmapRuntime";
import type { TreePalette } from "@/views/kindra-v31/overlays/types";
import { buildHeatmapHoverModel } from "@/views/kindra-v31/ui/kinshipHeatmapModel";
import type { HoveredNode } from "@/views/kindra-v31/ui/overlayUiModel";

type Props = {
  hoveredNode: HoveredNode;
  heatmapOverlay: ActiveOverlay;
  document: GraphDocument | null;
  palette: TreePalette;
  runtime: KinshipHeatmapRuntime | null;
};

export function HeatmapHoverCard({
  hoveredNode,
  heatmapOverlay,
  document,
  palette,
  runtime
}: Props) {
  if (!hoveredNode.isPerson || !document) {
    return null;
  }

  const baseId = String(heatmapOverlay.config.personId ?? "");
  const targetId = hoveredNode.canonId;
  const basePerson = document.persons[baseId];
  const targetPerson = document.persons[targetId];

  if (!basePerson || !targetPerson) {
    return null;
  }

  const kinship = runtime
    ? runtime.getHeatmapKinship(baseId, targetId)
    : findKinship(document, baseId, targetId);
  const fallbackKinship = kinship ?? runtime?.getKinship(baseId, targetId) ?? null;
  const contemporaneity = getLifeOverlapInfo(basePerson, targetPerson);
  const isSelf = baseId === targetId;
  const isSameNuclearFamily = Boolean(
    basePerson.famc.length > 0
      && targetPerson.famc.length > 0
      && basePerson.famc[0] === targetPerson.famc[0]
      && !isSelf
  );
  const model = buildHeatmapHoverModel({
    baseName: basePerson.name,
    isSelf,
    kinship: fallbackKinship,
    contemporaneity,
    isSameNuclearFamily
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontWeight: "bold", fontSize: 14, color: palette.kinshipAccent }}>
        {model.title}
      </div>
      {model.kinshipLabel && model.sharedDnaLabel ? (
        <ContextCard
          compact
          title="Analisis Biologico"
          rows={[
            { label: "Parentesco", value: model.kinshipLabel, tone: "accent" },
            { label: "ADN Compartido", value: model.sharedDnaLabel, tone: "normal" }
          ]}
        />
      ) : null}
      {model.contemporaneity ? (
        <div
          style={{
            fontSize: 12,
            background: "rgba(0,0,0,0.1)",
            padding: "6px 8px",
            borderRadius: 4,
            borderLeft: `2px solid ${palette.info}`
          }}
        >
          {model.contemporaneity}
        </div>
      ) : null}
      {model.isSameNuclearFamily ? (
        <div style={{ fontSize: 11, color: "var(--success-text)", fontWeight: 600 }}>
          Pertenecen a la misma familia nuclear.
        </div>
      ) : null}
    </div>
  );
}
