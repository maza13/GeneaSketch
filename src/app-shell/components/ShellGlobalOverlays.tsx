import type { ShellChromeFacade, ShellFeaturesFacade, ShellNavigationFacade } from "@/app-shell/facade/types";
import { ShellBranchExtractionModal } from "@/app-shell/components/ShellBranchExtractionModal";
import { ShellDiagnosticPanel } from "@/app-shell/components/ShellDiagnosticPanel";
import { ShellGlobalStatsPanel } from "@/app-shell/components/ShellGlobalStatsPanel";
import { ShellPersonPickerModal } from "@/app-shell/components/ShellPersonPickerModal";
import { ShellPersonStatsPanel } from "@/app-shell/components/ShellPersonStatsPanel";
import { ShellSearchCenterPanel } from "@/app-shell/components/ShellSearchCenterPanel";
import { AboutReleaseModalV3 } from "@/ui/AboutReleaseModalV3";
import { AiAssistantModal } from "@/ui/ai/AiAssistantModal";
import { AiSettingsModal } from "@/ui/ai/AiSettingsModal";
import { ColorThemeMenu } from "@/ui/ColorThemeMenu";
import { FamilySearchPanel } from "@/ui/external/FamilySearchPanel";
import { NodeActionMenu } from "@/ui/NodeActionMenu";
import { PanelErrorBoundary } from "@/ui/common/PanelErrorBoundary";
import { WikiPanel } from "@/ui/WikiPanel";

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

      {diagnostics.open ? <ShellDiagnosticPanel viewModel={diagnostics.viewModel} commands={diagnostics.commands} /> : null}
      {personStats.open ? <ShellPersonStatsPanel viewModel={personStats.viewModel} onClose={personStats.onClose} /> : null}
      {globalStats.open ? <ShellGlobalStatsPanel viewModel={globalStats.viewModel} onClose={globalStats.onClose} /> : null}

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

      <AiSettingsModal
        open={ai.settingsModal.open}
        settings={ai.settingsModal.settings}
        onSave={ai.settingsModal.onSave}
        onClose={ai.settingsModal.onClose}
        onStatus={ai.settingsModal.onStatus}
      />

      <AiAssistantModal
        viewModel={ai.assistantModal.viewModel}
        onClose={ai.assistantModal.onClose}
        onStatus={ai.assistantModal.onStatus}
        onApplyBatch={ai.assistantModal.onApplyBatch}
        onOpenSettings={ai.assistantModal.onOpenSettings}
      />

      <AboutReleaseModalV3 open={dialogs.about.open} onClose={dialogs.about.onClose} />
      <PanelErrorBoundary panelName="Wiki">
        <WikiPanel open={dialogs.wiki.open} onClose={dialogs.wiki.onClose} />
      </PanelErrorBoundary>

      {dialogs.familySearch.open ? (
        <PanelErrorBoundary panelName="FamilySearch">
          <FamilySearchPanel onClose={dialogs.familySearch.onClose} onImport={dialogs.familySearch.onImport} />
        </PanelErrorBoundary>
      ) : null}

      <ShellPersonPickerModal viewModel={personPicker.viewModel} onLink={personPicker.onLink} onClose={personPicker.onClose} />
      <ShellBranchExtractionModal viewModel={branchExport.viewModel} onExport={branchExport.onExport} onClose={branchExport.onClose} />
    </>
  );
}
