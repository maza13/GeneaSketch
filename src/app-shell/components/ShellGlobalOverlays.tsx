import { lazy, Suspense } from "react";
import type { ShellChromeFacade, ShellFeaturesFacade, ShellNavigationFacade } from "@/app-shell/facade/types";
import { ShellBranchExtractionModal } from "@/app-shell/components/ShellBranchExtractionModal";
import { ShellPersonPickerModal } from "@/app-shell/components/ShellPersonPickerModal";
import { ShellSearchCenterPanel } from "@/app-shell/components/ShellSearchCenterPanel";
import { ColorThemeMenu } from "@/ui/ColorThemeMenu";
import { NodeActionMenu } from "@/ui/NodeActionMenu";
import { PanelErrorBoundary } from "@/ui/common/PanelErrorBoundary";

const AboutReleaseModalV3 = lazy(() => import("@/ui/AboutReleaseModalV3").then((module) => ({ default: module.AboutReleaseModalV3 })));
const AiAssistantModal = lazy(() => import("@/ui/ai/AiAssistantModal").then((module) => ({ default: module.AiAssistantModal })));
const AiSettingsModal = lazy(() => import("@/ui/ai/AiSettingsModal").then((module) => ({ default: module.AiSettingsModal })));
const FamilySearchPanel = lazy(() => import("@/ui/external/FamilySearchPanel").then((module) => ({ default: module.FamilySearchPanel })));
const ShellDiagnosticPanel = lazy(() => import("@/app-shell/components/ShellDiagnosticPanel").then((module) => ({ default: module.ShellDiagnosticPanel })));
const ShellGlobalStatsPanel = lazy(() => import("@/app-shell/components/ShellGlobalStatsPanel").then((module) => ({ default: module.ShellGlobalStatsPanel })));
const ShellPersonStatsPanel = lazy(() => import("@/app-shell/components/ShellPersonStatsPanel").then((module) => ({ default: module.ShellPersonStatsPanel })));
const WikiPanel = lazy(() => import("@/ui/WikiPanel").then((module) => ({ default: module.WikiPanel })));

type Props = {
  navigation: ShellNavigationFacade;
  colorThemeMenu: ShellChromeFacade["colorThemeMenu"];
  dialogs: ShellChromeFacade["dialogs"];
  diagnostics: ShellFeaturesFacade["diagnostics"];
  personStats: ShellFeaturesFacade["personStats"];
  globalStats: ShellFeaturesFacade["globalStats"];
  ai: ShellFeaturesFacade["ai"];
  personPicker: ShellFeaturesFacade["personPicker"];
  branchExport: ShellFeaturesFacade["branchExport"];
};

export function ShellGlobalOverlays({
  navigation,
  colorThemeMenu,
  dialogs,
  diagnostics,
  personStats,
  globalStats,
  ai,
  personPicker,
  branchExport,
}: Props) {
  return (
    <>
      <PanelErrorBoundary panelName="Buscador">
        <ShellSearchCenterPanel viewModel={navigation.search.viewModel} commands={navigation.search.commands} />
      </PanelErrorBoundary>

      <Suspense fallback={null}>
        {diagnostics.open ? <ShellDiagnosticPanel viewModel={diagnostics.viewModel} commands={diagnostics.commands} /> : null}
        {personStats.open ? <ShellPersonStatsPanel viewModel={personStats.viewModel} onClose={personStats.onClose} /> : null}
        {globalStats.open ? <ShellGlobalStatsPanel viewModel={globalStats.viewModel} onClose={globalStats.onClose} /> : null}
      </Suspense>

      {navigation.nodeMenu.state ? (
        <NodeActionMenu
          open={navigation.nodeMenu.state.open}
          x={navigation.nodeMenu.state.x}
          y={navigation.nodeMenu.state.y}
          nodeKind={navigation.nodeMenu.state.nodeKind}
          title={navigation.nodeMenu.state.title}
          items={navigation.nodeMenu.state.items}
          onClose={navigation.nodeMenu.onClose}
        />
      ) : null}

      <ColorThemeMenu
        open={colorThemeMenu.open}
        value={colorThemeMenu.value}
        onChange={colorThemeMenu.onChange}
        onReset={colorThemeMenu.onReset}
        onClose={colorThemeMenu.onClose}
      />

      <Suspense fallback={null}>
        {ai.settingsModal.open ? (
          <AiSettingsModal
            open={ai.settingsModal.open}
            settings={ai.settingsModal.settings}
            onSave={ai.settingsModal.onSave}
            onClose={ai.settingsModal.onClose}
            onStatus={ai.settingsModal.onStatus}
          />
        ) : null}

        {ai.assistantModal.viewModel.open ? (
          <AiAssistantModal
            viewModel={ai.assistantModal.viewModel}
            onClose={ai.assistantModal.onClose}
            onStatus={ai.assistantModal.onStatus}
            onApplyBatch={ai.assistantModal.onApplyBatch}
            onOpenSettings={ai.assistantModal.onOpenSettings}
          />
        ) : null}

        {dialogs.about.open ? <AboutReleaseModalV3 open={dialogs.about.open} onClose={dialogs.about.onClose} /> : null}
        {dialogs.wiki.open ? (
          <PanelErrorBoundary panelName="Wiki">
            <WikiPanel open={dialogs.wiki.open} onClose={dialogs.wiki.onClose} />
          </PanelErrorBoundary>
        ) : null}

        {dialogs.familySearch.open ? (
          <PanelErrorBoundary panelName="FamilySearch">
            <FamilySearchPanel onClose={dialogs.familySearch.onClose} onImport={dialogs.familySearch.onImport} />
          </PanelErrorBoundary>
        ) : null}
      </Suspense>

      <ShellPersonPickerModal viewModel={personPicker.viewModel} onLink={personPicker.onLink} onClose={personPicker.onClose} />
      <ShellBranchExtractionModal viewModel={branchExport.viewModel} onExport={branchExport.onExport} onClose={branchExport.onClose} />
    </>
  );
}
