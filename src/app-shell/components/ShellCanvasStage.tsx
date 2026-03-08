import { lazy, Suspense } from "react";
import type { ShellFeaturesFacade, ShellWorkspaceFacade } from "@/app-shell/facade/types";

const MockToolsPanel = lazy(() => import("@/ui/MockToolsPanel").then((module) => ({ default: module.MockToolsPanel })));
const KindraViewV31 = lazy(() => import("@/views/KindraViewV31").then((module) => ({ default: module.KindraViewV31 })));

type Props = {
  workspace: Pick<ShellWorkspaceFacade, "boot" | "restoreBanner" | "exportWarningsBanner" | "banners">;
  canvas: ShellFeaturesFacade["canvas"];
};

const STACKED_BANNER_STYLE = {
  marginTop: 6,
  justifyContent: "space-between",
} as const;

const KINSHIP_BANNER_STYLE = {
  position: "absolute",
  top: 10,
  left: "50%",
  transform: "translateX(-50%)",
  background: "var(--overlay-panel-bg-soft)",
  color: "var(--tree-kinship-accent)",
  border: "1px solid var(--border)",
  padding: "12px 24px",
  borderRadius: 8,
  zIndex: 100,
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "var(--overlay-shadow)",
} as const;

const MOCK_TOOLS_STYLE = {
  position: "absolute",
  top: 10,
  left: 10,
  zIndex: 1000,
  width: 300,
} as const;

export function ShellCanvasStage({ workspace, canvas }: Props) {
  const hasDocument = Boolean(canvas.documentView);

  return (
    <>
      {workspace.boot.status !== "ready" ? (
        <div className="empty-state">
          {workspace.boot.status === "restoring" ? "Restaurando sesion..." : "Preparando espacio de trabajo..."}
        </div>
      ) : null}

      {workspace.restoreBanner.visible ? (
        <div className="restore-banner">
          <span>{workspace.restoreBanner.message}</span>
          <button onClick={() => void workspace.restoreBanner.onStartFresh()}>Nueva sesion</button>
          <button onClick={workspace.restoreBanner.onDismiss}>Ocultar</button>
        </div>
      ) : null}

      {workspace.exportWarningsBanner.visible ? (
        <div className="restore-banner" style={STACKED_BANNER_STYLE}>
          <span>Exportacion legacy con advertencias: {workspace.exportWarningsBanner.count}</span>
          <button onClick={workspace.exportWarningsBanner.onDismiss}>Ocultar</button>
        </div>
      ) : null}

      {workspace.banners.aiUndo.visible ? (
        <div className="restore-banner" style={STACKED_BANNER_STYLE}>
          <span>Ultimo lote IA disponible para deshacer.</span>
          <button onClick={workspace.banners.aiUndo.onUndo}>Deshacer lote IA</button>
        </div>
      ) : null}

      {workspace.banners.kinship.visible ? (
        <div onClick={workspace.banners.kinship.onDismiss} style={KINSHIP_BANNER_STYLE}>
          {workspace.banners.kinship.message}
        </div>
      ) : null}

      {workspace.boot.status === "ready" && !hasDocument ? (
        <div className="empty-state">
          Crea un arbol nuevo o abre un archivo .gsk o .ged para empezar.
        </div>
      ) : null}
      {workspace.boot.status === "ready" && hasDocument && canvas.modeBadge ? <div className="mode-badge">{canvas.modeBadge}</div> : null}
      <Suspense fallback={null}>
        {canvas.showMockTools ? (
          <div style={MOCK_TOOLS_STYLE}>
            <MockToolsPanel />
          </div>
        ) : null}
      </Suspense>

      {workspace.boot.status === "ready" && hasDocument ? (
        <Suspense fallback={<div className="empty-state">Cargando lienzo...</div>}>
          <KindraViewV31
            graph={canvas.graph}
            document={canvas.documentView}
            fitNonce={canvas.fitNonce}
            onNodeClick={canvas.commands.onNodeClick}
            onNodeContextMenu={canvas.commands.onNodeContextMenu}
            focusPersonId={canvas.focusPersonId}
            focusFamilyId={canvas.focusFamilyId}
            selectedPersonId={canvas.selectedPersonId}
            colorTheme={canvas.colorTheme}
            kindraConfig={canvas.kindraConfig}
            onBgClick={canvas.commands.onBgClick}
            onBgDoubleClick={canvas.commands.onBgDoubleClick}
            onSvgReady={canvas.commands.onSvgReady}
          />
        </Suspense>
      ) : null}
    </>
  );
}

