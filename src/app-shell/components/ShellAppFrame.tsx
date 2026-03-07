import { lazy, Suspense, type ReactNode } from "react";
import type { ShellChromeFacade, ShellFeaturesFacade } from "@/app-shell/facade/types";
import { AppFooter } from "@/ui/shell/AppFooter";
import { AppShell } from "@/ui/shell/AppShell";
import { PanelErrorBoundary } from "@/ui/common/PanelErrorBoundary";
import { TopMenuBar } from "@/ui/TopMenuBar";

const LeftPanel = lazy(() => import("@/ui/LeftPanel").then((module) => ({ default: module.LeftPanel })));
const RightPanel = lazy(() => import("@/ui/RightPanel").then((module) => ({ default: module.RightPanel })));
const ShellTimelineRightPanel = lazy(() => import("./ShellTimelineRightPanel").then((module) => ({ default: module.ShellTimelineRightPanel })));

type Props = {
  chrome: ShellChromeFacade;
  timeline: ShellFeaturesFacade["timeline"];
  canvasStage: ReactNode;
};

export function ShellAppFrame({ chrome, timeline, canvasStage }: Props) {
  return (
    <AppShell
      leftCollapsed={chrome.leftCollapsed}
      rightCollapsed={chrome.rightCollapsed}
      detailsMode={chrome.detailsMode}
      timelineMode={chrome.timelineMode}
      onToggleLeft={chrome.shellCommands.onToggleLeft}
      onToggleRight={chrome.shellCommands.onToggleRight}
      topbar={
        <TopMenuBar
          menus={chrome.topbar.menus}
          actions={chrome.topbar.actions}
          menuLayout={chrome.topbar.menuLayout}
          onChangeLayout={chrome.topbar.onChangeLayout}
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
          <Suspense fallback={null}>
            <LeftPanel viewModel={chrome.leftPanel.viewModel} commands={chrome.leftPanel.commands} />
          </Suspense>
        </PanelErrorBoundary>
      }
      rightPanel={
        <PanelErrorBoundary panelName="Panel derecho">
          <Suspense fallback={null}>
            <>
              <RightPanel
                viewModel={chrome.rightPanel.viewModel}
                detailsMode={chrome.detailsMode}
                onToggleDetailsExpanded={chrome.rightPanel.commands.onToggleDetailsExpanded}
                onEditPerson={chrome.rightPanel.commands.onEditPerson}
                onViewPersonDetail={chrome.rightPanel.commands.onViewPersonDetail}
                onAddRelation={chrome.rightPanel.commands.onAddRelation}
                onLinkExistingRelation={chrome.rightPanel.commands.onLinkExistingRelation}
                onUnlinkRelation={chrome.rightPanel.commands.onUnlinkRelation}
              />
              {timeline.viewModel.isOpen ? (
                <ShellTimelineRightPanel viewModel={timeline.viewModel} commands={timeline.commands} />
              ) : null}
            </>
          </Suspense>
        </PanelErrorBoundary>
      }
      canvas={
        <PanelErrorBoundary panelName="Canvas principal">
          {canvasStage}
        </PanelErrorBoundary>
      }
    />
  );
}
