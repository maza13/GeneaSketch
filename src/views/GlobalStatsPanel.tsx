import { useMemo, useState } from "react";
import type { GeneaDocument } from "@/types/domain";
import type { DiagnosticReport } from "@/core/diagnostics/types";
import { calculateGlobalStatistics } from "@/core/graph/globalStatistics";

type Props = {
  document: GeneaDocument | null;
  report?: DiagnosticReport | null;
  visiblePersonIds?: string[];
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

export function GlobalStatsPanel({ document, visiblePersonIds, onClose }: Props) {
  const [scope, setScope] = useState<"all" | "visible">("all");
  if (!document) return null;

  const stats = useMemo(() => {
    return calculateGlobalStatistics(document, scope, visiblePersonIds);
  }, [document, scope, visiblePersonIds]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-panel" style={{ width: 980, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Estadisticas Generales</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={scope} onChange={(e) => setScope(e.target.value as "all" | "visible")}>
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <section style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
              <h4 style={{ margin: "0 0 10px 0" }}>Demografia</h4>
              <div>M: {stats.demographics.sex.M} | F: {stats.demographics.sex.F} | U: {stats.demographics.sex.U}</div>
              <div>Vivos: {stats.demographics.lifeStatus.alive} | Fallecidos: {stats.demographics.lifeStatus.deceased}</div>
            </section>

            <section style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
              <h4 style={{ margin: "0 0 10px 0" }}>Cobertura</h4>
              <div>Con nombre: {stats.coverage.withName}</div>
              <div>Con nacimiento: {stats.coverage.withBirth}</div>
              <div>Fallecidos con DEAT: {stats.coverage.withDeathAmongDeceased}</div>
              <div>Placeholders: {stats.coverage.placeholders}</div>
            </section>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <section style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
              <h4 style={{ margin: "0 0 10px 0" }}>Estructura</h4>
              <div>Personas aisladas: {stats.structure.orphanPersons}</div>
              <div>Familias sin hijos: {stats.structure.orphanFamilies}</div>
              <div>Familias vacias: {stats.structure.emptyFamilies}</div>
              <div>Familias monoparentales: {stats.structure.singleParentFamilies}</div>
              <div>Promedio hijos/familia: {stats.structure.avgChildrenPerFamily}</div>
            </section>

            <section style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
              <h4 style={{ margin: "0 0 10px 0" }}>Cronologia</h4>
              <div>Nacimiento: {stats.chronology.earliestBirth ?? "--"} - {stats.chronology.latestBirth ?? "--"}</div>
              <div>Defuncion: {stats.chronology.earliestDeath ?? "--"} - {stats.chronology.latestDeath ?? "--"}</div>
            </section>
          </div>

          <section style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
            <h4 style={{ margin: "0 0 10px 0" }}>Top Apellidos</h4>
            {stats.surnamesTop.length === 0 ? (
              <div style={{ color: "var(--ink-muted)" }}>Sin apellidos suficientes.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {stats.surnamesTop.map((item) => (
                  <div key={item.surname} style={{ display: "flex", justifyContent: "space-between", background: "var(--bg-input)", borderRadius: 6, padding: "8px 10px" }}>
                    <span>{item.surname}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
            <h4 style={{ margin: "0 0 10px 0" }}>Diagnostico</h4>
            <div>Errores: {stats.diagnostics.error} | Warnings: {stats.diagnostics.warning} | Info: {stats.diagnostics.info}</div>
            <div style={{ marginTop: 6 }}>
              Estructural: {stats.diagnostics.byCategory.structural} | Cronologia: {stats.diagnostics.byCategory.chronological} | Calidad: {stats.diagnostics.byCategory.data_quality} | Relaciones: {stats.diagnostics.byCategory.relationships}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
