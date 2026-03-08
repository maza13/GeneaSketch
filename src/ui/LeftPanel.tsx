import type { LeftPanelViewModel } from "@/app-shell/facade/types";
import type { ViewConfig } from "@/types/domain";
import { LayerPanel } from "./LayerPanel";

type Props = {
  viewModel: LeftPanelViewModel;
  commands: {
    onToggleSection: (section: "layers" | "treeConfig" | "canvasTools") => void;
    onSetSections: (patch: Partial<NonNullable<ViewConfig["leftSections"]>>) => void;
    onKindraOrientation: (isVertical: boolean) => void;
    onPreset: (preset: ViewConfig["preset"]) => void;
    onDepth: (kind: keyof ViewConfig["depth"], depth: number) => void;
    onInclude: (key: "spouses", value: boolean) => void;
    onGridEnabled: (enabled: boolean) => void;
    onClearPositions: () => void;
  };
};

export function LeftPanel({ viewModel, commands }: Props) {
  const { documentView, sections, treeConfig, canvasTools } = viewModel;
  const {
    onToggleSection,
    onSetSections,
    onKindraOrientation,
    onPreset,
    onDepth,
    onInclude,
    onGridEnabled,
    onClearPositions,
  } = commands;

  const { layersOpen, treeConfigOpen, canvasToolsOpen } = sections;
  const anyClosed = !layersOpen || !treeConfigOpen || !canvasToolsOpen;

  return (
    <div className="gs-panel" style={{ height: "100%" }}>
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

      <div className="gs-panel-body">
        <div className={`gs-panel-section ${layersOpen ? "gs-panel-section--open" : "gs-panel-section--closed"}`}>
          <div className="gs-panel-section-header" onClick={() => onToggleSection("layers")}>
            <span className="material-symbols-outlined gs-panel-section-icon">layers</span>
            <span className="gs-panel-section-label">Capas de analisis</span>
            <span className="material-symbols-outlined gs-panel-section-chevron">expand_more</span>
          </div>
          <div className="gs-panel-section-body">
            <LayerPanel document={documentView} hideHeader />
          </div>
        </div>

        {treeConfig ? (
          <div className={`gs-panel-section ${treeConfigOpen ? "gs-panel-section--open" : "gs-panel-section--closed"}`}>
            <div className="gs-panel-section-header" onClick={() => onToggleSection("treeConfig")}>
              <span className="material-symbols-outlined gs-panel-section-icon">account_tree</span>
              <span className="gs-panel-section-label">Configuracion del arbol</span>
              <span className="material-symbols-outlined gs-panel-section-chevron">expand_more</span>
            </div>
            <div className="gs-panel-section-body">
              <div className="builder builder--tree">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={treeConfig.isVertical}
                    onChange={(event) => onKindraOrientation(event.target.checked)}
                  />
                  Distribucion vertical
                </label>
                <label>
                  Preset
                  <select value={treeConfig.preset} onChange={(event) => onPreset(event.target.value as ViewConfig["preset"])}>
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
                    <span className="value-bubble">{treeConfig.depth.ancestors}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    step={1}
                    value={treeConfig.depth.ancestors}
                    onChange={(event) => onDepth("ancestors", Number(event.target.value))}
                  />
                </div>

                <div className="depth-control">
                  <div className="label-row">
                    <span>2. Descendientes</span>
                    <span className="value-bubble">{treeConfig.depth.descendants}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    step={1}
                    value={treeConfig.depth.descendants}
                    onChange={(event) => onDepth("descendants", Number(event.target.value))}
                  />
                </div>

                <div className="builder-subsection">
                  <h4>Ramas colaterales</h4>
                  <div className="depth-control">
                    <div className="label-row">
                      <span>A. Tios (de ancestros)</span>
                      <span className="value-bubble">{treeConfig.depth.unclesGreatUncles}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      step={1}
                      value={treeConfig.depth.unclesGreatUncles}
                      onChange={(event) => onDepth("unclesGreatUncles", Number(event.target.value))}
                    />
                  </div>
                  <div className="depth-control">
                    <div className="label-row">
                      <span>B. Hermanos y descendientes</span>
                      <span className="value-bubble">{treeConfig.depth.siblingsNephews}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      step={1}
                      value={treeConfig.depth.siblingsNephews}
                      onChange={(event) => onDepth("siblingsNephews", Number(event.target.value))}
                    />
                  </div>
                  <div className="depth-control">
                    <div className="label-row">
                      <span>C. Tios directos y descendientes</span>
                      <span className="value-bubble">{treeConfig.depth.unclesCousins}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      step={1}
                      value={treeConfig.depth.unclesCousins}
                      onChange={(event) => onDepth("unclesCousins", Number(event.target.value))}
                    />
                  </div>
                </div>

                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={treeConfig.showSpouses}
                    onChange={(event) => onInclude("spouses", event.target.checked)}
                  />
                  Mostrar parejas
                </label>
              </div>
            </div>
          </div>
        ) : null}

        <div className={`gs-panel-section ${canvasToolsOpen ? "gs-panel-section--open" : "gs-panel-section--closed"}`}>
          <div className="gs-panel-section-header" onClick={() => onToggleSection("canvasTools")}>
            <span className="material-symbols-outlined gs-panel-section-icon">build</span>
            <span className="gs-panel-section-label">Herramientas de lienzo</span>
            <span className="material-symbols-outlined gs-panel-section-chevron">expand_more</span>
          </div>
          <div className="gs-panel-section-body">
            <div className="builder builder--tools">
              <label className="toggle">
                <input type="checkbox" checked={canvasTools.gridEnabled} onChange={(event) => onGridEnabled(event.target.checked)} />
                Cuadricula
              </label>
              {canvasTools.positionCount > 0 ? (
                <button onClick={onClearPositions}>Limpiar posiciones ({canvasTools.positionCount})</button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
