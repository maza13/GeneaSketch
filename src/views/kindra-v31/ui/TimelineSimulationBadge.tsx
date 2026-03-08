import type { ActiveOverlay } from "@/types/domain";
import type { TreePalette } from "@/views/kindra-v31/overlays/types";

type Props = {
  timelineOverlay: ActiveOverlay | null;
  livingCount: number;
  deceasedCount: number;
  palette: TreePalette;
};

export function TimelineSimulationBadge({
  timelineOverlay,
  livingCount,
  deceasedCount,
  palette
}: Props) {
  if (!timelineOverlay) {
    return null;
  }

  const displayYear = timelineOverlay.config.year ?? timelineOverlay.config.currentYear ?? "-";

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        right: 24,
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "16px",
        padding: "16px 20px",
        color: "#fff",
        zIndex: 20,
        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 200
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            letterSpacing: "0.05em"
          }}
        >
          Simulacion
        </span>
        <span style={{ fontSize: 24, fontWeight: "bold", color: "var(--accent)" }}>{displayYear}</span>
      </div>
      <div style={{ height: 1, background: "rgba(255,255,255,0.1)" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: palette.success }} />
            <span style={{ fontSize: 13 }}>Personas vivas</span>
          </div>
          <span style={{ fontWeight: "bold", color: palette.success }}>{livingCount}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: palette.danger }} />
            <span style={{ fontSize: 13 }}>Difuntos</span>
          </div>
          <span style={{ fontWeight: "bold", color: palette.danger }}>{deceasedCount}</span>
        </div>
      </div>
    </div>
  );
}
