import { lazy, Suspense, type ReactNode } from "react";
import type { ShellChromeFacade, ShellFeaturesFacade } from "@/app-shell/facade/types";
import { AppFooter } from "@/ui/shell/AppFooter";
import { AppShell } from "@/ui/shell/AppShell";
import { ShellToolbar } from "@/ui/shell/ShellToolbar";
import { PanelErrorBoundary } from "@/ui/common/PanelErrorBoundary";
import { TopMenuBar } from "@/ui/TopMenuBar";

const LeftPanel = lazy(() => import("@/ui/LeftPanel").then((module) => ({ default: module.LeftPanel })));
const RightPanel = lazy(() => import("@/ui/RightPanel").then((module) => ({ default: module.RightPanel })));
const ShellTimelineRightPanel = lazy(() => import("./ShellTimelineRightPanel").then((module) => ({ default: module.ShellTimelineRightPanel })));

function LeftPanelPlaceholder() {
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ height: 14, width: "58%", borderRadius: 999, background: "var(--bg-card)" }} />
      <div style={{ height: 42, borderRadius: 12, background: "var(--bg-input)" }} />
      <div style={{ height: 14, width: "46%", borderRadius: 999, background: "var(--bg-card)" }} />
      <div style={{ height: 72, borderRadius: 12, background: "var(--bg-input)" }} />
    </div>
  );
}

function RightPanelPlaceholder() {
  return (
    <div style={{ padding: 18, color: "var(--ink-muted)", fontSize: 13 }}>
      Cargando panel...
    </div>
  );
}

type Props = {
  chrome: ShellChromeFacade;
  timeline: ShellFeaturesFacade["timeline"];
  canvasStage: ReactNode;
  workspaceOverlayHost?: ReactNode;
};

export function ShellAppFrame({ chrome, timeline, canvasStage, workspaceOverlayHost }: Props) {
  return (
    <AppShell
      leftCollapsed={chrome.leftCollapsed}
      rightCollapsed={chrome.rightCollapsed}
      detailsMode={chrome.detailsMode}
      onToggleLeft={chrome.shellCommands.onToggleLeft}
      onToggleRight={chrome.shellCommands.onToggleRight}
      topbar={
        <TopMenuBar
          menus={chrome.topbar.menus}
          menuLayout={chrome.topbar.menuLayout}
          onChangeLayout={chrome.topbar.onChangeLayout}
        />
      }
      toolbar={
        <ShellToolbar
          actions={chrome.toolbar.actions}
          menuLayout={chrome.topbar.menuLayout}
        />
      }
      footer={
        <AppFooter
          statusMessage={chrome.footer.statusMessage}
          personCount={chrome.footer.personCount}
          familyCount={chrome.footer.familyCount}
          sourceCount={chrome.footer.sourceCount}
          engineMode={chrome.footer.engineMode}
          isSaved={chrome.footer.isSaved}
          appVersion={chrome.footer.appVersion}
        />
      }
      leftPanel={
        <PanelErrorBoundary panelName="Panel izquierdo">
          <Suspense fallback={<LeftPanelPlaceholder />}>
            <div className="panel-left-stack">
              <LeftPanel viewModel={chrome.leftPanel.viewModel} commands={chrome.leftPanel.commands} />
              {timeline.viewModel.isOpen ? (
                <ShellTimelineRightPanel viewModel={timeline.viewModel} commands={timeline.commands} />
              ) : null}
            </div>
          </Suspense>
        </PanelErrorBoundary>
      }
      rightPanel={
        <PanelErrorBoundary panelName="Panel derecho">
          <Suspense fallback={<RightPanelPlaceholder />}>
            <RightPanel
              viewModel={chrome.rightPanel.viewModel}
              detailsMode={chrome.detailsMode}
              onToggleDetailsExpanded={chrome.rightPanel.commands.onToggleDetailsExpanded}
              onInspectPerson={chrome.rightPanel.commands.onInspectPerson}
              onEditPerson={chrome.rightPanel.commands.onEditPerson}
              onViewPersonDetail={chrome.rightPanel.commands.onViewPersonDetail}
              onAddRelation={chrome.rightPanel.commands.onAddRelation}
              onLinkExistingRelation={chrome.rightPanel.commands.onLinkExistingRelation}
              onUnlinkRelation={chrome.rightPanel.commands.onUnlinkRelation}
            />
          </Suspense>
        </PanelErrorBoundary>
      }
      canvas={
        <PanelErrorBoundary panelName="Canvas principal">
          {canvasStage}
        </PanelErrorBoundary>
      }
      workspaceOverlayHost={workspaceOverlayHost}
    />
  );
}
