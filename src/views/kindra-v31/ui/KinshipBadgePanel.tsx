import type { TreePalette } from "@/views/kindra-v31/overlays/types";
import { formatPercentageLabel } from "@/views/kindra-v31/ui/kinshipHeatmapModel";

type Props = {
  kinshipBadge: any;
  palette: TreePalette;
};

export function KinshipBadgePanel({ kinshipBadge, palette }: Props) {
  if (!kinshipBadge) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: palette.overlayBgSoft,
        color: palette.overlayText,
        border: "1px solid var(--border)",
        padding: "12px 24px",
        borderRadius: 12,
        fontSize: 18,
        zIndex: 10,
        boxShadow: palette.overlayShadow,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        backdropFilter: "blur(12px)"
      }}
    >
      {kinshipBadge.type === "kinship" ? (
        <>
          <div style={{ fontSize: 16, opacity: 0.9, marginBottom: 4 }}>
            Parentesco de <strong>{kinshipBadge.p1}</strong> con <strong>{kinshipBadge.p2}</strong>
          </div>
          <div style={{ fontSize: 20, margin: "4px 0" }}>
            <strong>Relacion: </strong>
            <span style={{ color: "var(--tree-warning)", fontWeight: "bold" }}>{kinshipBadge.text}</span>
            {kinshipBadge.textSecondary ? (
              <span style={{ color: palette.overlayTextSoft, fontSize: 14 }}> ({kinshipBadge.textSecondary})</span>
            ) : null}
          </div>
          {kinshipBadge.sharedDnaPercentage > 0 ? (
            <div style={{ fontSize: 16, opacity: 0.9 }}>
              <strong>ADN compartido:</strong> {formatPercentageLabel(kinshipBadge.sharedDnaPercentage)}
            </div>
          ) : null}
          {kinshipBadge.yDnaShared || kinshipBadge.mtDnaShared ? (
            <div style={{ fontSize: 14, display: "flex", gap: "12px", opacity: 0.9 }}>
              {kinshipBadge.yDnaShared ? <span> Linea paterna pura (ADN-Y)</span> : null}
              {kinshipBadge.mtDnaShared ? <span> Linea materna pura (ADN-mt)</span> : null}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div style={{ fontSize: 16, opacity: 0.9, marginBottom: 4 }}>
            {kinshipBadge.mode === "patrilineal"
              ? "Linaje Patrilineal (ADN-Y)"
              : "Linaje Matrilineal (ADN-mt)"}
          </div>
          {kinshipBadge.mode === "couple" ? (
            <>
              <div style={{ fontSize: 15 }}>
                Linajes combinados: <strong style={{ color: palette.patrilineal }}>Y-DNA</strong> y{" "}
                <strong style={{ color: palette.matrilineal }}>mt-DNA</strong>
              </div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>
                {kinshipBadge.husbandName} (Y: {kinshipBadge.husbandCount}) + {kinshipBadge.wifeName} (mt: {kinshipBadge.wifeCount})
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15 }}>
                Desde:{" "}
                <strong style={{ color: kinshipBadge.mode === "patrilineal" ? palette.patrilineal : palette.matrilineal }}>
                  {kinshipBadge.oldestName}
                </strong>{" "}
                hasta <strong>{kinshipBadge.targetName}</strong>
              </div>
              <div style={{ fontSize: 14, opacity: 0.8 }}>
                Total de personas en linaje: <strong>{kinshipBadge.count}</strong>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
