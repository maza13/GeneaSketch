import type { GraphDocument } from "@/types/domain";
import type { FamilyOriginData, TreePalette } from "@/views/kindra-v31/overlays/types";
import type { HoveredNode } from "@/views/kindra-v31/ui/overlayUiModel";

type Props = {
  hoveredNode: HoveredNode;
  document: GraphDocument | null;
  familyOriginTargetId: string | null;
  familyOriginData: FamilyOriginData;
  palette: TreePalette;
};

export function OriginHoverCard({
  hoveredNode,
  document,
  familyOriginTargetId,
  familyOriginData,
  palette
}: Props) {
  const { summary } = familyOriginData;
  const isSelf = hoveredNode.canonId === familyOriginTargetId || hoveredNode.id === familyOriginTargetId;
  const personData = document && hoveredNode.isPerson ? document.persons[hoveredNode.canonId] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {personData ? (
        <div
          style={{
            fontWeight: "bold",
            color: isSelf ? palette.familyOriginSelf : palette.info,
            fontSize: 14,
            marginBottom: 2
          }}
        >
          {isSelf ? "Persona consultada" : `${personData.name}${personData.surname ? ` ${personData.surname}` : ""}`}
        </div>
      ) : null}
      {summary ? (
        <div
          style={{
            background: "var(--info-bg)",
            borderRadius: 6,
            padding: "8px 10px",
            borderLeft: `3px solid ${palette.info}`
          }}
        >
          <div style={{ fontWeight: "bold", color: palette.info, marginBottom: 4, fontSize: 12 }}>Familia de origen</div>
          <div style={{ fontSize: 12, color: palette.overlayTextSoft, display: "flex", flexDirection: "column", gap: 3 }}>
            <span>
              {summary.children} {summary.children === 1 ? "hijo/a" : "hijos/as"}
            </span>
            {summary.marriageDate ? <span>Matrimonio: {summary.marriageDate}</span> : null}
            {summary.era ? <span>Epoca: {summary.era}</span> : null}
            {summary.location ? <span>Lugar: {summary.location}</span> : null}
          </div>
        </div>
      ) : (
        <div style={{ color: palette.overlayTextMuted, fontSize: 12 }}>Sin familia de origen documentada.</div>
      )}
    </div>
  );
}
