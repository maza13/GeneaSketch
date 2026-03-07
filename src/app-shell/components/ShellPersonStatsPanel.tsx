import type { PersonStatsViewModel } from "@/app-shell/facade/types";
import { ContextCard } from "@/ui/context/ContextCard";
import { ContextHoverAnchor } from "@/ui/context/ContextHoverAnchor";

type Props = {
  viewModel: PersonStatsViewModel;
  onClose: () => void;
};

export function ShellPersonStatsPanel({ viewModel, onClose }: Props) {
  if (viewModel.kind === "empty") return null;

  const { stats, personId, personName, personSex } = viewModel;
  const breakdown = stats.relativesBreakdown;
  const totalRelatives = breakdown.reduce((sum, item) => sum + item.count, 0);
  const childbearing = stats.childbearingSummary;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-panel" style={{ width: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }} onClick={(event) => event.stopPropagation()}>
        <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, color: "var(--ink-0)" }}>{personName || "Desconocido"}</h2>
            <span style={{ color: "var(--ink-muted)", fontSize: 13 }}>ID: {personId} | {totalRelatives} familiares | {personSex}</span>
          </div>
          <button onClick={onClose}>x</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 18 }}>
            <div style={{ background: "var(--bg-card)", padding: 16, borderRadius: 12, border: "1px solid var(--line-soft)", textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: "bold", color: "var(--timeline-type-birt)", marginBottom: 4 }}>{stats.totalAncestors}</div>
              <div style={{ color: "var(--ink-muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Ancestros</div>
            </div>
            <div style={{ background: "var(--bg-card)", padding: 16, borderRadius: 12, border: "1px solid var(--line-soft)", textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: "bold", color: "var(--success-text)", marginBottom: 4 }}>{stats.totalDescendants}</div>
              <div style={{ color: "var(--ink-muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Descendientes</div>
            </div>
            <div style={{ background: "var(--bg-card)", padding: 16, borderRadius: 12, border: "1px solid var(--line-soft)", textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: "bold", color: "var(--timeline-type-div)", marginBottom: 4 }}>
                {stats.averageAncestralLifespan !== null ? stats.averageAncestralLifespan : "--"}
              </div>
              <div style={{ color: "var(--ink-muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Longevidad</div>
            </div>
          </div>

          {childbearing ? (
            <div style={{ marginBottom: 26 }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 16, color: "var(--ink-0)" }}>Ventana de hijos</h3>
              {childbearing.firstChild && childbearing.lastChild ? (
                <ContextHoverAnchor
                  anchor={<span style={{ color: "var(--ink-1)", fontSize: 13, textDecoration: "underline dotted", cursor: "default" }}>{childbearing.phrase}</span>}
                  card={
                    <ContextCard
                      title="Primer y ultimo hijo"
                      rows={[
                        { label: "Primer hijo", value: childbearing.firstChild.childName, tone: "accent" },
                        { label: "Ultimo hijo", value: childbearing.lastChild.childName, tone: "accent" },
                      ]}
                      footer={childbearing.estimated ? "Estimado" : "Exacto"}
                    />
                  }
                />
              ) : (
                <span style={{ color: "var(--ink-muted)", fontSize: 13 }}>{childbearing.phrase}</span>
              )}
            </div>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {breakdown.map((item) => (
              <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-input)", padding: "10px 14px", borderRadius: 6 }}>
                <span style={{ color: "var(--ink-0)", fontSize: 14 }}>{item.label}</span>
                <span style={{ background: "var(--bg-overlay)", padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: "bold", color: "var(--ink-0)" }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
