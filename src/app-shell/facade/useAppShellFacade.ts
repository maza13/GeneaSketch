import { useMemo } from "react";
import { projectGraphDocument } from "@/core/read-model/selectors";
import { useAppShellShortcuts } from "@/hooks/useAppShellShortcuts";
import { useWorkspacePersistenceEffects } from "@/hooks/useWorkspacePersistenceEffects";
import type { SearchFilterState } from "@/ui/search/searchEngine";
import type { AppShellFacade } from "./types";
import { useShellAiFeature } from "./useShellAiFeature";
import { useShellCanvasFeature } from "./useShellCanvasFeature";
import { useShellChromeFeature } from "./useShellChromeFeature";
import { useShellDerivedViewModels } from "./useShellDerivedViewModels";
import { useShellDiagnosticsFeature } from "./useShellDiagnosticsFeature";
import { useShellFacadeActions } from "./useShellFacadeActions";
import { useShellFacadeRuntime } from "./useShellFacadeRuntime";
import { useShellFacadeState } from "./useShellFacadeState";
import { useShellNavigationFeature } from "./useShellNavigationFeature";
import { useShellPersonFeature } from "./useShellPersonFeature";
import { useShellSessionFlow } from "./useShellSessionFlow";
import { useShellStatsFeature } from "./useShellStatsFeature";
import { useShellWorkspaceFeature } from "./useShellWorkspaceFeature";

export function useAppShellFacade(): AppShellFacade {
  const state = useShellFacadeState();
  const actions = useShellFacadeActions();

  const document = useMemo(
    () => projectGraphDocument(state.genraphGraph),
    [state.genraphGraph?.graphId, state.genraphGraph?.journalLength],
  );

  const leftCollapsed = state.viewConfig?.shellPanels?.leftCollapsed ?? false;
  const rightCollapsed = state.viewConfig?.shellPanels?.rightCollapsed ?? false;

  const runtime = useShellFacadeRuntime({
    document,
    viewConfig: state.viewConfig,
    selectedPersonId: state.selectedPersonId,
    recentFiles: state.recentFiles,
    aiSettings: state.aiSettings,
    mergeDraft: state.mergeDraft,
    leftCollapsed,
    rightCollapsed,
    actions,
  });

  useAppShellShortcuts({
    colorTheme: runtime.shellController.colorTheme,
    document,
    selectedPersonId: state.selectedPersonId,
    viewConfig: state.viewConfig,
    saveGsk: runtime.gsk.saveGsk,
    openFilePicker: () => runtime.refs.openFileInputRef.current?.click(),
    goBack: actions.goBack,
    goForward: actions.goForward,
    fitToScreen: actions.fitToScreen,
    focusPersonInCanvas: runtime.shellController.focusPersonInCanvas,
    onOpenAiSettings: () => runtime.ai.setShowAiSettingsModal(true),
    toggleShellPanel: actions.toggleShellPanel,
    setTimelinePanelOpen: actions.setTimelinePanelOpen,
    onEscape: () => {
      runtime.shellController.setNodeMenu(null);
      runtime.shellController.setShowSearchPanel(false);
    },
    onFocusSearch: () => {
      runtime.shellController.setShowSearchPanel(true);
      const search = window.document.getElementById("search-center-input") as HTMLInputElement | null;
      search?.focus();
    },
  });

  useWorkspacePersistenceEffects({
    document,
    viewConfig: state.viewConfig,
    visualConfig: state.visualConfig,
    aiSettings: state.aiSettings,
    leftCollapsed,
    rightCollapsed,
    saveAutosessionNow: actions.saveAutosessionNow,
    graphId: state.genraphGraph?.graphId,
    colorTheme: runtime.shellController.colorTheme,
  });

  const sessionFlow = useShellSessionFlow({
    bootStatus: state.bootStatus,
    restoreNoticeVisible: state.restoreNoticeVisible,
    document,
    genraphGraph: state.genraphGraph,
    bootstrapSession: actions.bootstrapSession,
    dismissRestoreNotice: actions.dismissRestoreNotice,
    clearSession: actions.clearSession,
    createNewTreeDoc: actions.createNewTreeDoc,
    setSelectedPerson: actions.setSelectedPerson,
    fitToScreen: actions.fitToScreen,
    openPersonEditor: runtime.shellController.openPersonEditor,
    setStatus: runtime.gsk.setStatus,
  });

  const searchFilters = runtime.search.filters;
  const { visiblePersonIds, normalizedKindraConfig, leftPanelViewModel, selectedPersonPanelViewModel, timelineViewModel, searchViewModel, diagnosticsViewModel, globalStatsViewModel, personStatsViewModel, personWorkspaceViewModel, personWorkspaceViewModelV3, personEditorViewModel, importReviewViewModel, aiAssistantViewModel, personPickerViewModel, branchExportViewModel } =
    useShellDerivedViewModels({
      document,
      viewConfig: state.viewConfig,
      visualConfig: state.visualConfig,
      expandedGraph: state.expandedGraph,
      selectedPersonId: state.selectedPersonId,
      workspacePersonId: runtime.shellController.workspacePersonId,
      workspacePersonIdV3: runtime.shellController.workspacePersonIdV3,
      branchAnchorId: runtime.shellController.branchAnchorId,
      showSearchPanel: runtime.shellController.showSearchPanel,
      searchQuery: runtime.search.query,
      searchSortField: runtime.search.sortField,
      searchSortDirection: runtime.search.sortDirection,
      searchFilters,
      parseErrors: state.parseErrors,
      parseWarnings: state.parseWarnings,
      aiSettings: state.aiSettings,
      showPersonStatsPersonId: runtime.shellController.showPersonStatsPersonId,
      personDetailModal: runtime.shellController.personDetailModal,
      importIncomingDoc: runtime.gsk.importIncomingDoc,
      mergeDraft: state.mergeDraft,
      showAiAssistantModal: runtime.ai.showAiAssistantModal,
      aiContext: runtime.ai.aiContext,
      picker: runtime.shellController.picker,
    });

  const chrome = useShellChromeFeature({
    colorTheme: runtime.shellController.colorTheme,
    leftCollapsed,
    rightCollapsed,
    viewConfig: state.viewConfig,
    menus: runtime.menu.menus,
    menuActions: runtime.menu.actions,
    menuLayout: runtime.shellController.menuLayout,
    setMenuLayout: runtime.shellController.setMenuLayout,
    status: runtime.gsk.status,
    document,
    leftPanelViewModel,
    toggleLeftSection: actions.toggleLeftSection,
    setLeftSectionState: actions.setLeftSectionState,
    setKindraOrientation: actions.setKindraOrientation,
    setPreset: actions.setPreset,
    setDepth: actions.setDepth,
    setInclude: actions.setInclude,
    setGridEnabled: actions.setGridEnabled,
    clearNodePositions: actions.clearNodePositions,
    selectedPersonPanelViewModel,
    toggleRightStackSection: () => actions.toggleRightStackSection("details"),
    openPersonEditor: runtime.shellController.openPersonEditor,
    openPersonDetail: (personId) => runtime.shellController.setWorkspacePersonId(personId),
    openAddRelationEditor: runtime.shellController.openAddRelationEditor,
    setPicker: runtime.shellController.setPicker,
    unlinkRelation: actions.unlinkRelation,
    setStatus: runtime.gsk.setStatus,
    showColorThemeMenu: runtime.shellController.showColorThemeMenu,
    setColorTheme: runtime.shellController.setColorTheme,
    setShowColorThemeMenu: runtime.shellController.setShowColorThemeMenu,
    showAboutModalV3: runtime.shellController.showAboutModalV3,
    setShowAboutModalV3: runtime.shellController.setShowAboutModalV3,
    showWikiPanel: runtime.shellController.showWikiPanel,
    setShowWikiPanel: runtime.shellController.setShowWikiPanel,
    showFamilySearchPanel: runtime.shellController.showFamilySearchPanel,
    setShowFamilySearchPanel: runtime.shellController.setShowFamilySearchPanel,
    toggleShellPanel: actions.toggleShellPanel,
  });

  const navigation = useShellNavigationFeature({
    searchViewModel,
    setShowSearchPanel: runtime.shellController.setShowSearchPanel,
    inspectPerson: actions.inspectPerson,
    setWorkspacePersonId: runtime.shellController.setWorkspacePersonId,
    setQuery: runtime.search.setQuery,
    setSortField: runtime.search.setSortField,
    toggleSortDirection: () => runtime.search.setSortDirection((prev) => (prev === "asc" ? "desc" : "asc")),
    patchFilters: (patch: Partial<SearchFilterState>) => runtime.search.setFilters((prev) => ({ ...prev, ...patch })),
    resetSearch: () => {
      runtime.search.setQuery("");
      runtime.search.setSortField("id");
      runtime.search.setSortDirection("asc");
      runtime.search.setFilters({ sex: "any", lifeStatus: "any", surname: "any" });
    },
    nodeMenuState: runtime.shellController.nodeMenuState
      ? {
          open: true,
          x: runtime.shellController.nodeMenuState.x,
          y: runtime.shellController.nodeMenuState.y,
          nodeKind: runtime.shellController.nodeMenuState.nodeKind,
          title: runtime.shellController.nodeMenuState.title,
          items: runtime.shellController.nodeMenuState.items,
        }
      : null,
    setNodeMenu: runtime.shellController.setNodeMenu,
  });

  const workspace = useShellWorkspaceFeature({
    bootStatus: state.bootStatus,
    openFileInputRef: runtime.refs.openFileInputRef,
    importFileInputRef: runtime.refs.importFileInputRef,
    openAndReplace: runtime.gsk.openAndReplace,
    importForMerge: runtime.gsk.importForMerge,
    restoreBanner: {
      visible: sessionFlow.restoreBanner.visible,
      message: sessionFlow.restoreBanner.message,
      onDismiss: sessionFlow.restoreBanner.onDismiss,
      onStartFresh: sessionFlow.restoreBanner.onStartFresh,
    },
    exportWarningsCount: runtime.gsk.exportWarnings.length,
    dismissExportWarnings: () => runtime.gsk.setExportWarnings([]),
    showPdfExport: runtime.shellController.showPdfExport,
    pdfOptions: { scope: runtime.gsk.pdfOptions.scope, paperSize: runtime.gsk.pdfOptions.paperSize },
    setPdfScope: (scope) => runtime.gsk.setPdfOptions((prev) => ({ ...prev, scope })),
    setPdfPaperSize: (paperSize) => runtime.gsk.setPdfOptions((prev) => ({ ...prev, paperSize })),
    exportPdfNow: runtime.gsk.exportPdfNow,
    closePdfExport: () => runtime.shellController.setShowPdfExport(false),
    importIncomingDoc: runtime.gsk.importIncomingDoc,
    document,
    importReviewViewModel,
    clearMergeFocus: runtime.shellController.clearMergeFocusOverlay,
    setMergeDraft: actions.setMergeDraft,
    onFocusChange: runtime.shellController.handleMergeFocusChange,
    onApply: runtime.gsk.handleMergeApply,
    onClearImportIncomingDoc: () => runtime.gsk.setImportIncomingDoc(null),
    clearMergeDraft: actions.clearMergeDraft,
    aiUndoVisible: Boolean(runtime.ai.aiUndoSnapshot),
    undoAiBatch: runtime.ai.undoAiBatch,
    kinshipVisible: Boolean(runtime.shellController.pendingKinshipSourceId && document),
    kinshipMessage: runtime.shellController.pendingKinshipSourceId && document
      ? `Selecciona a otra persona para calcular parentesco con ${document.persons[runtime.shellController.pendingKinshipSourceId]?.name || ""}`.trim()
      : "",
    dismissKinship: () => runtime.shellController.setPendingKinshipSourceId(null),
  });

  const diagnostics = useShellDiagnosticsFeature({
    open: runtime.shellController.showDiagnostics,
    viewModel: diagnosticsViewModel,
    document,
    setShowDiagnostics: runtime.shellController.setShowDiagnostics,
    setSelectedPerson: actions.setSelectedPerson,
    applyProjectedDocument: (nextDoc) => actions.applyProjectedDocument(nextDoc, "merge"),
  });

  const stats = useShellStatsFeature({
    document,
    viewConfig: state.viewConfig,
    visiblePersonIds,
    globalStatsOpen: runtime.shellController.showGlobalStatsPanel,
    globalStatsViewModel,
    setShowGlobalStatsPanel: runtime.shellController.setShowGlobalStatsPanel,
    personStatsViewModel,
    setShowPersonStatsPersonId: runtime.shellController.setShowPersonStatsPersonId,
    timelineViewModel,
    setTimelineView: actions.setTimelineView,
    setTimelineScaleZoom: actions.setTimelineScaleZoom,
    setTimelineScaleOffset: actions.setTimelineScaleOffset,
    handleTimelineHighlight: runtime.shellController.handleTimelineHighlight,
    setTimelineStatus: actions.setTimelineStatus,
    toggleRightStackSection: actions.toggleRightStackSection,
    clearOverlayType: actions.clearOverlayType,
    setTimelinePanelOpen: actions.setTimelinePanelOpen,
  });

  const ai = useShellAiFeature({
    openSettings: runtime.ai.showAiSettingsModal,
    aiSettings: state.aiSettings,
    setAiSettings: actions.setAiSettings,
    setStatus: runtime.gsk.setStatus,
    closeSettings: () => runtime.ai.setShowAiSettingsModal(false),
    assistantViewModel: aiAssistantViewModel,
    closeAssistant: () => runtime.ai.setShowAiAssistantModal(false),
    applyAiBatch: runtime.ai.applyAiBatch,
    openSettingsModal: () => runtime.ai.setShowAiSettingsModal(true),
  });

  const person = useShellPersonFeature({
    personEditorViewModel,
    closePersonEditor: () => runtime.shellController.setPersonDetailModal(null),
    updatePersonById: actions.updatePersonById,
    addRelationFromAnchor: actions.addRelationFromAnchor,
    createStandalonePerson: actions.createStandalonePerson,
    personWorkspaceViewModel,
    personWorkspaceViewModelV3,
    closeWorkspace: () => runtime.shellController.setWorkspacePersonId(null),
    closeWorkspaceV3: () => runtime.shellController.setWorkspacePersonIdV3(null),
    setSelectedPerson: actions.setSelectedPerson,
    openWorkspace: runtime.shellController.setWorkspacePersonId,
    openWorkspaceV3: runtime.shellController.setWorkspacePersonIdV3,
    focusPersonInCanvas: runtime.shellController.focusPersonInCanvas,
    updateFamilyById: actions.updateFamilyById,
    createPersonRecord: actions.createPersonRecord,
    openAddRelationEditor: runtime.shellController.openAddRelationEditor,
    personPickerViewModel,
    picker: runtime.shellController.picker,
    setOverlay: actions.setOverlay,
    linkExistingRelation: actions.linkExistingRelation,
    setStatus: runtime.gsk.setStatus,
    setPicker: runtime.shellController.setPicker,
    branchExportViewModel,
    branchAnchorId: runtime.shellController.branchAnchorId,
    exportBranchGsk: runtime.gsk.exportBranchGsk,
    setBranchAnchorId: runtime.shellController.setBranchAnchorId,
  });

  const canvas = useShellCanvasFeature({
    expandedGraph: state.expandedGraph,
    document,
    fitNonce: state.fitNonce,
    selectedPersonId: state.selectedPersonId,
    focusPersonId: state.viewConfig?.focusPersonId ?? null,
    focusFamilyId: state.viewConfig?.focusFamilyId ?? null,
    colorTheme: runtime.shellController.colorTheme,
    normalizedKindraConfig,
    showMockTools: runtime.shellController.showMockTools,
    setNodeMenu: runtime.shellController.setNodeMenu,
    clearVisualModes: actions.clearVisualModes,
    onNodeClick: runtime.shellController.handleNodeClick,
    onNodeContextMenu: runtime.shellController.handleNodeContextMenu,
    onSvgReady: (svg) => {
      runtime.refs.graphSvgRef.current = svg;
    },
  });

  return {
    chrome,
    navigation,
    workspace,
    features: {
      diagnostics,
      globalStats: stats.globalStats,
      personStats: stats.personStats,
      ai,
      personEditor: person.personEditor,
      personWorkspace: person.personWorkspace,
      personWorkspaceV3: person.personWorkspaceV3,
      personPicker: person.personPicker,
      branchExport: person.branchExport,
      timeline: stats.timeline,
      canvas,
    },
  };
}
