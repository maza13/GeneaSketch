import { useState } from "react";
import type { BranchExportViewModel } from "@/app-shell/facade/types";
import type { ExtractDirection } from "@/core/edit/generators";

type Props = {
  viewModel: BranchExportViewModel | null;
  onExport: (direction: ExtractDirection) => void;
  onClose: () => void;
};

const OPTIONS: Array<{ value: ExtractDirection; label: string; desc: string }> = [
  { value: "all_ancestors", label: "Todos los ancestros", desc: "Extrae a los antepasados directos y colaterales conectados hacia arriba." },
  { value: "paternal_ancestors", label: "Ancestros paternos", desc: "Extrae solo la rama patrilineal." },
  { value: "maternal_ancestors", label: "Ancestros maternos", desc: "Extrae solo la rama matrilineal." },
  { value: "all_descendants", label: "Toda la descendencia", desc: "Extrae a hijos, nietos y familiares conectados hacia abajo." },
];

export function ShellBranchExtractionModal({ viewModel, onExport, onClose }: Props) {
  const [direction, setDirection] = useState<ExtractDirection>("all_ancestors");

  if (!viewModel) return null;

  const preview = viewModel.previews[direction];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: 480 }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Extraer y exportar rama</h3>
          <button onClick={onClose}>Cerrar</button>
        </div>

        <div style={{ padding: "0 20px" }}>
          <p style={{ margin: "10px 0 20px 0", color: "var(--ink-muted)" }}>
            Selecciona que parte del arbol de <strong>{viewModel.personName}</strong> deseas extraer a un nuevo archivo GSK.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {OPTIONS.map((option) => (
              <label
                key={option.value}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: 16,
                  border: "1px solid",
                  borderColor: direction === option.value ? "var(--accent)" : "var(--border)",
                  borderRadius: 8,
                  background: direction === option.value ? "var(--accent-soft)" : "var(--surface)",
                  cursor: "pointer",
                }}
              >
                <input type="radio" name="extraction_dir" value={option.value} checked={direction === option.value} onChange={() => setDirection(option.value)} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "1.05em", color: direction === option.value ? "var(--accent)" : "var(--ink)" }}>{option.label}</div>
                  <div style={{ fontSize: "0.85em", color: "var(--ink-muted)", marginTop: 4 }}>{option.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div style={{ marginTop: 24, padding: 16, background: "var(--bg-input)", border: "1px solid var(--border-light)", borderRadius: 8 }}>
            <span style={{ fontSize: "0.85em", color: "var(--ink-muted)", display: "block", marginBottom: 4 }}>Vista previa de extraccion</span>
            <strong>{preview.persons}</strong> Personas y <strong>{preview.families}</strong> Familias
          </div>
        </div>

        <div className="modal-footer" style={{ padding: 20, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={() => onExport(direction)}>Exportar a archivo .GSK</button>
        </div>
      </div>
    </div>
  );
}
