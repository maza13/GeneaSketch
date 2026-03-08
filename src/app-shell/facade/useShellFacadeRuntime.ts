import { useMenuConfig } from "@/hooks/useMenuConfig";
import { useShellSearchRuntime } from "./useShellSearchRuntime";
import { useShellRuntimeRefsAndServices } from "./useShellRuntimeRefsAndServices";
import type { ShellFacadeRuntimeParams } from "./runtimeTypes";

export function useShellFacadeRuntime(params: ShellFacadeRuntimeParams) {
  const services = useShellRuntimeRefsAndServices({
    document: params.document,
    viewConfig: params.viewConfig,
    selectedPersonId: params.selectedPersonId,
    aiSettings: params.aiSettings,
    mergeDraft: params.mergeDraft,
    actions: params.actions,
  });
  const search = useShellSearchRuntime();

  const menu = useMenuConfig({
    document: params.document,
    viewConfig: params.viewConfig,
    recentFiles: params.recentFiles,
    selectedPersonId: params.selectedPersonId,
    colorTheme: services.shellController.colorTheme,
    themeMode: services.shellController.themeMode,
    aiUndoSnapshot: services.ai.aiUndoSnapshot,
    leftCollapsed: params.leftCollapsed,
    rightCollapsed: params.rightCollapsed,
    timelineOpen: params.viewConfig?.timelinePanelOpen ?? false,
    createNewTreeDoc: params.actions.createNewTreeDoc,
    openFileInput: () => services.refs.openFileInputRef.current?.click(),
    importFileInput: () => services.refs.importFileInputRef.current?.click(),
    openAndReplace: services.gsk.openAndReplace,
    openRecentItem: services.gsk.openRecentItem,
    saveGsk: services.gsk.saveGsk,
    exportGed: services.gsk.exportGed,
    setShowPdfExport: services.shellController.setShowPdfExport,
    exportRaster: services.gsk.exportRaster,
    openPersonEditor: services.shellController.openPersonEditor,
    openAddRelationEditor: services.shellController.openAddRelationEditor,
    openLocalAiAssistant: services.ai.openLocalAiAssistant,
    openGlobalAiAssistant: services.ai.openGlobalAiAssistant,
    setShowAiSettingsModal: services.ai.setShowAiSettingsModal,
    undoAiBatch: services.ai.undoAiBatch,
    fitToScreen: params.actions.fitToScreen,
    setThemeMode: services.shellController.setThemeMode,
    setShowColorThemeMenu: services.shellController.setShowColorThemeMenu,
    toggleShellPanel: params.actions.toggleShellPanel,
    setTimelinePanelOpen: params.actions.setTimelinePanelOpen,
    setTimelineScope: params.actions.setTimelineScope,
    setTimelineView: params.actions.setTimelineView,
    setKindraLayoutEngine: params.actions.setKindraLayoutEngine,
    setShowDiagnostics: services.shellController.setShowDiagnostics,
    setShowPersonStatsPersonId: services.shellController.setShowPersonStatsPersonId,
    setShowGlobalStatsPanel: services.shellController.setShowGlobalStatsPanel,
    clearNodePositions: params.actions.clearNodePositions,
    generateScenario: services.shellController.generateScenario,
    setShowMockTools: services.shellController.setShowMockTools,
    setShowFamilySearchPanel: services.shellController.setShowFamilySearchPanel,
    setShowWikiPanel: services.shellController.setShowWikiPanel,
    setShowAboutModalV3: services.shellController.setShowAboutModalV3,
    openPersonWorkspaceV3: services.shellController.setWorkspacePersonIdV3,
    setColorTheme: services.shellController.setColorTheme,
    clearRecentFiles: params.actions.clearRecentFiles,
    menuLayout: services.shellController.menuLayout,
    setMenuLayout: services.shellController.setMenuLayout,
  });

  return {
    ...services,
    menu,
    search: {
      ...search,
    },
  };
}
