import { useMemo, useState } from "react";
import type { GlobalStatsViewModel } from "@/app-shell/facade/types";

type Props = {
  viewModel: GlobalStatsViewModel;
  onClose: () => void;
};

function card(title: string, value: string | number) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 12, color: "var(--ink-muted)", textTransform: "uppercase" }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--ink-0)", marginTop: 4 }}>{value}</div>
    </div>
  );
}

export function ShellGlobalStatsPanel({ viewModel, onClose }: Props) {
  const [scope, setScope] = useState<"all" | "visible">("all");
  const stats = useMemo(() => viewModel.getStats(scope), [scope, viewModel]);

  if (!viewModel.hasDocument) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-panel" style={{ width: 980, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Estadisticas generales</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={scope} onChange={(event) => setScope(event.target.value as "all" | "visible")}>
              <option value="all">Archivo completo</option>
              <option value="visible">Solo visibles</option>
            </select>
            <button onClick={onClose}>Cerrar</button>
          </div>
        </div>
        <div style={{ padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {card("Personas", stats.totals.persons)}
            {card("Familias", stats.totals.families)}
            {card("Media", stats.totals.media)}
            {card("Componentes", stats.structure.connectedComponents)}
          </div>
        </div>
      </div>
    </div>
  );
}
