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
  onClearPositions,
}: Props) {
  const positionCount = Object.keys(visualConfig.nodePositions).length;
  const layersOpen = sections?.layersOpen ?? true;
  const treeConfigOpen = sections?.treeConfigOpen ?? true;
  const canvasToolsOpen = sections?.canvasToolsOpen ?? false;
  const anyClosed = !layersOpen || !treeConfigOpen || !canvasToolsOpen;

  return (
    // gs-panel fills the shell-sidebar container provided by AppShell
    <div className="gs-panel" style={{ height: "100%" }}>

      {/* ── Panel header ──────────────────────────────── */}
      <div className="gs-panel-header">
        <span className="material-symbols-outlined gs-panel-header-icon">explore</span>
        <span className="gs-panel-header-title">Explorador</span>
        <div className="gs-panel-header-actions">
          <button
            className="panel-icon-btn"
            onClick={() => onSetSections({ layersOpen: true, treeConfigOpen: true, canvasToolsOpen: true })}
            title="Expandir todas las secciones"
            disabled={!anyClosed}
          >
            <span className="material-symbols-outlined">unfold_more</span>
          </button>
          <button
            className="panel-icon-btn"
            onClick={() => onSetSections({ layersOpen: false, treeConfigOpen: false, canvasToolsOpen: false })}
            title="Contraer todas las secciones"
            disabled={anyClosed}
          >
            <span className="material-symbols-outlined">unfold_less</span>
          </button>
        </div>
      </div>

      {/* ── Panel body ────────────────────────────────── */}
      <div className="gs-panel-body">

        {/* Section 1: Capas de análisis */}
        <div className={`gs-panel-section ${layersOpen ? "gs-panel-section--open" : "gs-panel-section--closed"}`}>
          <div className="gs-panel-section-header" onClick={() => onToggleSection("layers")}>
            <span className="material-symbols-outlined gs-panel-section-icon">layers</span>
            <span className="gs-panel-section-label">Capas de análisis</span>
            <span className="material-symbols-outlined gs-panel-section-chevron">expand_more</span>
          </div>
          <div className="gs-panel-section-body">
            <LayerPanel document={document} hideHeader />
          </div>
        </div>

        {/* Section 2: Configuración del árbol */}
        {viewConfig && (
          <div className={`gs-panel-section ${treeConfigOpen ? "gs-panel-section--open" : "gs-panel-section--closed"}`}>
            <div className="gs-panel-section-header" onClick={() => onToggleSection("treeConfig")}>
              <span className="material-symbols-outlined gs-panel-section-icon">account_tree</span>
              <span className="gs-panel-section-label">Configuración del árbol</span>
              <span className="material-symbols-outlined gs-panel-section-chevron">expand_more</span>
            </div>
            <div className="gs-panel-section-body">
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
                  <input type="range" min={0} max={25} step={1} value={viewConfig.depth.ancestors}
                    onChange={(event) => onDepth("ancestors", Number(event.target.value))} />
                </div>
                <div className="depth-control">
                  <div className="label-row">
                    <span>2. Descendientes</span>
                    <span className="value-bubble">{viewConfig.depth.descendants}</span>
                  </div>
                  <input type="range" min={0} max={25} step={1} value={viewConfig.depth.descendants}
                    onChange={(event) => onDepth("descendants", Number(event.target.value))} />
                </div>
                <div className="builder-subsection">
                  <h4>Ramas colaterales</h4>
                  <div className="depth-control">
                    <div className="label-row">
                      <span>A. Tíos (de ancestros)</span>
                      <span className="value-bubble">{viewConfig.depth.unclesGreatUncles}</span>
                    </div>
                    <input type="range" min={0} max={6} step={1} value={viewConfig.depth.unclesGreatUncles}
                      onChange={(event) => onDepth("unclesGreatUncles", Number(event.target.value))} />
                  </div>
                  <div className="depth-control">
                    <div className="label-row">
                      <span>B. Hermanos y descendientes</span>
                      <span className="value-bubble">{viewConfig.depth.siblingsNephews}</span>
                    </div>
                    <input type="range" min={0} max={6} step={1} value={viewConfig.depth.siblingsNephews}
                      onChange={(event) => onDepth("siblingsNephews", Number(event.target.value))} />
                  </div>
                  <div className="depth-control">
                    <div className="label-row">
                      <span>C. Tíos directos y descendientes</span>
                      <span className="value-bubble">{viewConfig.depth.unclesCousins}</span>
                    </div>
                    <input type="range" min={0} max={6} step={1} value={viewConfig.depth.unclesCousins}
                      onChange={(event) => onDepth("unclesCousins", Number(event.target.value))} />
                  </div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={viewConfig.showSpouses}
                    onChange={(event) => onInclude("spouses", event.target.checked)} />
                  Mostrar parejas
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Herramientas de lienzo */}
        <div className={`gs-panel-section ${canvasToolsOpen ? "gs-panel-section--open" : "gs-panel-section--closed"}`}>
          <div className="gs-panel-section-header" onClick={() => onToggleSection("canvasTools")}>
            <span className="material-symbols-outlined gs-panel-section-icon">build</span>
            <span className="gs-panel-section-label">Herramientas de lienzo</span>
            <span className="material-symbols-outlined gs-panel-section-chevron">expand_more</span>
          </div>
          <div className="gs-panel-section-body">
            <div className="builder builder--tools">
              <label className="toggle">
                <input type="checkbox" checked={visualConfig.gridEnabled}
                  onChange={(event) => onGridEnabled(event.target.checked)} />
                Cuadrícula
              </label>
              {positionCount > 0 && (
                <button onClick={onClearPositions}>
                  Limpiar posiciones ({positionCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Future slots (reserved space) ─────────────── */}
        <div className="gs-panel-divider" />

        <div className="gs-panel-section gs-panel-section--future">
          <div className="gs-panel-section-header">
            <span className="material-symbols-outlined gs-panel-section-icon">bookmark</span>
            <span className="gs-panel-section-label">Favoritos</span>
            <span className="gs-panel-future-badge">Pronto</span>
          </div>
        </div>

        <div className="gs-panel-section gs-panel-section--future">
          <div className="gs-panel-section-header">
            <span className="material-symbols-outlined gs-panel-section-icon">filter_list</span>
            <span className="gs-panel-section-label">Filtros rápidos</span>
            <span className="gs-panel-future-badge">Pronto</span>
          </div>
        </div>

        <div className="gs-panel-section gs-panel-section--future">
          <div className="gs-panel-section-header">
            <span className="material-symbols-outlined gs-panel-section-icon">history</span>
            <span className="gs-panel-section-label">Historial</span>
            <span className="gs-panel-future-badge">Pronto</span>
          </div>
        </div>

      </div>
    </div>
  );
}
