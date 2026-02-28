import type { ColorThemeConfig } from "@/types/editor";

type Props = {
  open: boolean;
  value: ColorThemeConfig;
  onChange: (next: ColorThemeConfig) => void;
  onReset: () => void;
  onClose: () => void;
};

export function ColorThemeMenu({ open, value, onChange, onReset, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel color-menu-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Personalizar Vista</h3>
          <button onClick={onClose}>Cerrar</button>
        </div>

        <div className="color-grid">
          <label>
            Fondo del canvas
            <input
              type="color"
              value={value.background}
              onChange={(e) => onChange({ ...value, background: e.target.value })}
            />
          </label>
          <label>
            Nodos de persona
            <input
              type="color"
              value={value.personNode}
              onChange={(e) => onChange({ ...value, personNode: e.target.value })}
            />
          </label>
          <label>
            Texto de nodos
            <input
              type="color"
              value={value.text}
              onChange={(e) => onChange({ ...value, text: e.target.value })}
            />
          </label>
          <label>
            Lineas y conexiones
            <input
              type="color"
              value={value.edges}
              onChange={(e) => onChange({ ...value, edges: e.target.value })}
            />
          </label>
          <label>
            Tamaño de texto (px)
            <input
              type="number"
              min={6}
              max={36}
              value={value.nodeFontSize}
              onChange={(e) => onChange({ ...value, nodeFontSize: Number(e.target.value) || 10 })}
            />
          </label>
          <label>
            Grosor de líneas (px)
            <input
              type="number"
              min={0.5}
              max={10}
              step={0.1}
              value={value.edgeThickness}
              onChange={(e) => onChange({ ...value, edgeThickness: Number(e.target.value) || 1.3 })}
            />
          </label>
          <label>
            Ancho de persona (px)
            <input
              type="number"
              min={100}
              max={600}
              step={5}
              value={value.nodeWidth}
              onChange={(e) => onChange({ ...value, nodeWidth: Number(e.target.value) || 210 })}
            />
          </label>
          <label>
            Alto de persona (px)
            <input
              type="number"
              min={40}
              max={300}
              step={2}
              value={value.nodeHeight}
              onChange={(e) => onChange({ ...value, nodeHeight: Number(e.target.value) || 92 })}
            />
          </label>
        </div>

        <div className="color-actions">
          <button onClick={onReset}>Restaurar predeterminado</button>
        </div>
      </div>
    </div>
  );
}
