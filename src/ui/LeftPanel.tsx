import type { GraphDocument, ViewConfig, VisualConfig } from "@/types/domain";
import { LayerPanel } from "./LayerPanel";

type Props = {
  document: GraphDocument | null;
  viewConfig: ViewConfig | null;
  visualConfig: VisualConfig;
  sections?: ViewConfig["leftSections"];
  onToggleSection: (section: "layers" | "treeConfig" | "canvasTools") => void;
  onSetSections: (patch: Partial<NonNullable<ViewConfig["leftSections"]>>) => void;
  onDTreeOrientation: (isVertical: boolean) => void;
  onPreset: (preset: ViewConfig["preset"]) => void;
  onDepth: (kind: keyof ViewConfig["depth"], depth: number) => void;
  onInclude: (k: "spouses", v: boolean) => void;
  onGridEnabled: (enabled: boolean) => void;
  onClearPositions: () => void;
};

export function LeftPanel({
  document,
  viewConfig,
  visualConfig,
  sections,
  onToggleSection,
  onSetSections,
  onDTreeOrientation,
  onPreset,
  onDepth,
  onInclude,
  onGridEnabled,
  onClearPositions
}: Props) {
  const positionCount = Object.keys(visualConfig.nodePositions).length;
  const layersOpen = sections?.layersOpen ?? true;
  const treeConfigOpen = sections?.treeConfigOpen ?? true;
  const canvasToolsOpen = sections?.canvasToolsOpen ?? false;
  const anyClosed = !layersOpen || !treeConfigOpen || !canvasToolsOpen;

  return (
    <aside className="panel panel-left" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="panel-left-inner">
        <div className="panel-header-row">
          <h2>Capas y árbol</h2>
          <div className="panel-header-actions">
            <button
              className="panel-icon-btn"
              onClick={() => onSetSections({ layersOpen: true, treeConfigOpen: true, canvasToolsOpen: true })}
              title="Expandir todas las secciones"
              disabled={!anyClosed}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className="panel-icon-btn"
              onClick={() => onSetSections({ layersOpen: false, treeConfigOpen: false, canvasToolsOpen: false })}
              title="Contraer todas las secciones"
              disabled={anyClosed}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <section className="left-section">
          <header className="left-section__header">
            <h3>Capas de análisis</h3>
            <button className="panel-icon-btn" onClick={() => onToggleSection("layers")} title={layersOpen ? "Contraer sección" : "Expandir sección"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ transform: layersOpen ? "rotate(0deg)" : "rotate(180deg)" }}>
                <path d="M7 13l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </header>
          {layersOpen ? <LayerPanel document={document} hideHeader /> : null}
        </section>

        {viewConfig ? (
          <section className="left-section">
            <header className="left-section__header">
              <h3>Configuración del árbol</h3>
              <button className="panel-icon-btn" onClick={() => onToggleSection("treeConfig")} title={treeConfigOpen ? "Contraer sección" : "Expandir sección"}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ transform: treeConfigOpen ? "rotate(0deg)" : "rotate(180deg)" }}>
                  <path d="M7 13l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </header>
            {treeConfigOpen ? (
              <div className="builder builder--tree">
                {viewConfig.dtree && (
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={viewConfig.dtree.isVertical}
                      onChange={(event) => onDTreeOrientation(event.target.checked)}
                    />
                    Distribución vertical
                  </label>
                )}
                <label>
                  Preset
                  <select value={viewConfig.preset} onChange={(event) => onPreset(event.target.value as ViewConfig["preset"])}>
                    <option value="custom">Personalizado</option>
                    <option value="family_origin">Familia de origen</option>
                    <option value="nuclear_family">Familia nuclear</option>
                    <option value="extended_family">Familia ampliada</option>
                    <option value="direct_ancestors">Ancestros directos</option>
                    <option value="direct_descendants">Descendientes directos</option>
                  </select>
                </label>
                <div className="depth-control">
                  <div className="label-row">
                    <span>1. Ancestros</span>
                    <span className="value-bubble">{viewConfig.depth.ancestors}</span>
                  </div>
                  <input type="range" min={0} max={25} step={1} value={viewConfig.depth.ancestors} onChange={(event) => onDepth("ancestors", Number(event.target.value))} />
                </div>
                <div className="depth-control">
                  <div className="label-row">
                    <span>2. Descendientes</span>
                    <span className="value-bubble">{viewConfig.depth.descendants}</span>
                  </div>
                  <input type="range" min={0} max={25} step={1} value={viewConfig.depth.descendants} onChange={(event) => onDepth("descendants", Number(event.target.value))} />
                </div>
                <div className="builder-subsection">
                  <h4>Ramas colaterales</h4>
                  <div className="depth-control">
                    <div className="label-row">
                      <span>A. Tíos (de ancestros)</span>
                      <span className="value-bubble">{viewConfig.depth.unclesGreatUncles}</span>
                    </div>
                    <input type="range" min={0} max={6} step={1} value={viewConfig.depth.unclesGreatUncles} onChange={(event) => onDepth("unclesGreatUncles", Number(event.target.value))} />
                  </div>
                  <div className="depth-control">
                    <div className="label-row">
                      <span>B. Hermanos y descendientes</span>
                      <span className="value-bubble">{viewConfig.depth.siblingsNephews}</span>
                    </div>
                    <input type="range" min={0} max={6} step={1} value={viewConfig.depth.siblingsNephews} onChange={(event) => onDepth("siblingsNephews", Number(event.target.value))} />
                  </div>
                  <div className="depth-control">
                    <div className="label-row">
                      <span>C. Tíos directos y descendientes</span>
                      <span className="value-bubble">{viewConfig.depth.unclesCousins}</span>
                    </div>
                    <input type="range" min={0} max={6} step={1} value={viewConfig.depth.unclesCousins} onChange={(event) => onDepth("unclesCousins", Number(event.target.value))} />
                  </div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={viewConfig.showSpouses} onChange={(event) => onInclude("spouses", event.target.checked)} />
                  Mostrar parejas
                </label>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="left-section">
          <header className="left-section__header">
            <h3>Herramientas de lienzo</h3>
            <button className="panel-icon-btn" onClick={() => onToggleSection("canvasTools")} title={canvasToolsOpen ? "Contraer sección" : "Expandir sección"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ transform: canvasToolsOpen ? "rotate(0deg)" : "rotate(180deg)" }}>
                <path d="M7 13l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </header>
          {canvasToolsOpen ? (
            <div className="builder builder--tools">
              <label className="toggle">
                <input type="checkbox" checked={visualConfig.gridEnabled} onChange={(event) => onGridEnabled(event.target.checked)} />
                Cuadrícula
              </label>
              {positionCount > 0 ? <button onClick={onClearPositions}>Limpiar posiciones ({positionCount})</button> : null}
            </div>
          ) : null}
        </section>
      </div>
    </aside>
  );
}

