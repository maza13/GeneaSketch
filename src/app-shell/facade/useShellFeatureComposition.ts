import type { SearchFilterState, SearchSortDirection, SearchSortField } from "@/ui/search/searchEngine";
import type { AppShellFacade } from "./types";
import { useShellAiFeature } from "./useShellAiFeature";
import { useShellCanvasFeature } from "./useShellCanvasFeature";
import { useShellChromeFeature } from "./useShellChromeFeature";
import { useShellDiagnosticsFeature } from "./useShellDiagnosticsFeature";
import { useShellNavigationFeature } from "./useShellNavigationFeature";
import { useShellPersonFeature } from "./useShellPersonFeature";
import { useShellStatsFeature } from "./useShellStatsFeature";
import { useShellWorkspaceFeature } from "./useShellWorkspaceFeature";
import type { ShellFeatureCompositionParams } from "./runtimeTypes";

function createSearchCommands(runtime: ShellFeatureCompositionParams["runtime"]) {
  return {
    setQuery: runtime.search.setQuery,
    setSortField: runtime.search.setSortField,
    toggleSortDirection: () =>
      runtime.search.setSortDirection((prev: SearchSortDirection) => (prev === "asc" ? "desc" : "asc")),
    patchFilters: (patch: Partial<SearchFilterState>) =>
      runtime.search.setFilters((prev) => ({ ...prev, ...patch })),
    resetSearch: () => {
      runtime.search.setQuery("");
      runtime.search.setSortField("id" as SearchSortField);
      runtime.search.setSortDirection("asc");
      runtime.search.setFilters({ sex: "any", lifeStatus: "any", surname: "any" });
    },
  };
}

function createNodeMenuState(runtime: ShellFeatureCompositionParams["runtime"]): AppShellFacade["navigation"]["nodeMenu"]["state"] {
  return runtime.shellController.nodeMenuState
    ? {
        open: true,
        x: runtime.shellController.nodeMenuState.x,
        y: runtime.shellController.nodeMenuState.y,
        nodeKind: runtime.shellController.nodeMenuState.nodeKind,
        title: runtime.shellController.nodeMenuState.title,
        items: runtime.shellController.nodeMenuState.items,
      }
    : null;
}

function createWorkspaceRestoreBanner(
  sessionFlow: ShellFeatureCompositionParams["sessionFlow"],
): AppShellFacade["workspace"]["restoreBanner"] {
  return {
    visible: sessionFlow.restoreBanner.visible,
    message: sessionFlow.restoreBanner.message,
    onDismiss: sessionFlow.restoreBanner.onDismiss,
    onStartFresh: sessionFlow.restoreBanner.onStartFresh,
  };
}

function createKinshipBanner(params: ShellFeatureCompositionParams): AppShellFacade["workspace"]["banners"]["kinship"] {
  const sourceId = params.runtime.shellController.pendingKinshipSourceId;
  const personName = sourceId && params.document ? params.document.persons[sourceId]?.name || "" : "";
  return {
    visible: Boolean(sourceId && params.document),
    message: sourceId ? `Selecciona a otra persona para calcular parentesco con ${personName}`.trim() : "",
    onDismiss: () => params.runtime.shellController.setPendingKinshipSourceId(null),
  };
}

export function useShellFeatureComposition(params: ShellFeatureCompositionParams): AppShellFacade {
  const searchCommands = createSearchCommands(params.runtime);
  const kinshipBanner = createKinshipBanner(params);
  const chrome = useShellChromeFeature({
    colorTheme: params.runtime.shellController.colorTheme,
    leftCollapsed: params.leftCollapsed,
    rightCollapsed: params.rightCollapsed,
    viewConfig: params.state.viewConfig,
    menus: params.runtime.menu.menus,
    menuActions: params.runtime.menu.actions,
    menuLayout: params.runtime.shellController.menuLayout,
    setMenuLayout: params.runtime.shellController.setMenuLayout,
    status: params.runtime.gsk.status,
    document: params.document,
    leftPanelViewModel: params.leftPanelViewModel,
    toggleLeftSection: params.actions.toggleLeftSection,
    setLeftSectionState: params.actions.setLeftSectionState,
    setKindraOrientation: params.actions.setKindraOrientation,
    setPreset: params.actions.setPreset,
    setDepth: params.actions.setDepth,
    setInclude: params.actions.setInclude,
    setGridEnabled: params.actions.setGridEnabled,
    clearNodePositions: params.actions.clearNodePositions,
    selectedPersonPanelViewModel: params.selectedPersonPanelViewModel,
    inspectPerson: (personId) => params.actions.setSelectedPerson(personId),
    toggleRightStackSection: () => params.actions.toggleRightStackSection("details"),
    openPersonEditor: params.runtime.shellController.openPersonEditor,
    openPersonDetail: params.runtime.shellController.setWorkspacePersonIdV3,
    openAddRelationEditor: params.runtime.shellController.openAddRelationEditor,
    setPicker: params.runtime.shellController.setPicker,
    unlinkRelation: params.actions.unlinkRelation,
    setStatus: params.runtime.gsk.setStatus,
    showColorThemeMenu: params.runtime.shellController.showColorThemeMenu,
    setColorTheme: params.runtime.shellController.setColorTheme,
    setShowColorThemeMenu: params.runtime.shellController.setShowColorThemeMenu,
    showAboutModalV3: params.runtime.shellController.showAboutModalV3,
    setShowAboutModalV3: params.runtime.shellController.setShowAboutModalV3,
    showWikiPanel: params.runtime.shellController.showWikiPanel,
    setShowWikiPanel: params.runtime.shellController.setShowWikiPanel,
    showFamilySearchPanel: params.runtime.shellController.showFamilySearchPanel,
    setShowFamilySearchPanel: params.runtime.shellController.setShowFamilySearchPanel,
    toggleShellPanel: params.actions.toggleShellPanel,
  });

  const navigation = useShellNavigationFeature({
    searchViewModel: params.searchViewModel,
    setShowSearchPanel: params.runtime.shellController.setShowSearchPanel,
    inspectPerson: params.actions.inspectPerson,
    setWorkspacePersonId: params.runtime.shellController.setWorkspacePersonIdV3,
    setQuery: searchCommands.setQuery,
    setSortField: searchCommands.setSortField,
    toggleSortDirection: searchCommands.toggleSortDirection,
    patchFilters: searchCommands.patchFilters,
    resetSearch: searchCommands.resetSearch,
    nodeMenuState: createNodeMenuState(params.runtime),
    setNodeMenu: () => params.runtime.shellController.setNodeMenu(null),
  });

  const workspace = useShellWorkspaceFeature({
    bootStatus: params.state.bootStatus,
    openFileInputRef: params.runtime.refs.openFileInputRef,
    importFileInputRef: params.runtime.refs.importFileInputRef,
    openAndReplace: params.runtime.gsk.openAndReplace,
    importForMerge: params.runtime.gsk.importForMerge,
    restoreBanner: createWorkspaceRestoreBanner(params.sessionFlow),
    exportWarningsCount: params.runtime.gsk.exportWarnings.length,
    dismissExportWarnings: () => params.runtime.gsk.setExportWarnings([]),
    showPdfExport: params.runtime.shellController.showPdfExport,
    pdfOptions: { scope: params.runtime.gsk.pdfOptions.scope, paperSize: params.runtime.gsk.pdfOptions.paperSize },
    setPdfScope: (scope) => params.runtime.gsk.setPdfOptions((prev) => ({ ...prev, scope })),
    setPdfPaperSize: (paperSize) => params.runtime.gsk.setPdfOptions((prev) => ({ ...prev, paperSize })),
    exportPdfNow: params.runtime.gsk.exportPdfNow,
    closePdfExport: () => params.runtime.shellController.setShowPdfExport(false),
    importIncomingDoc: params.runtime.gsk.importIncomingDoc,
    document: params.document,
    importReviewViewModel: params.importReviewViewModel,
    clearMergeFocus: params.runtime.shellController.clearMergeFocusOverlay,
    setMergeDraft: params.actions.setMergeDraft,
    onFocusChange: params.runtime.shellController.handleMergeFocusChange,
    onApply: params.runtime.gsk.handleMergeApply,
    onClearImportIncomingDoc: () => params.runtime.gsk.setImportIncomingDoc(null),
    clearMergeDraft: params.actions.clearMergeDraft,
    aiUndoVisible: Boolean(params.runtime.ai.aiUndoSnapshot),
    undoAiBatch: params.runtime.ai.undoAiBatch,
    kinshipVisible: kinshipBanner.visible,
    kinshipMessage: kinshipBanner.message,
    dismissKinship: kinshipBanner.onDismiss,
  });

  const diagnostics = useShellDiagnosticsFeature({
    open: params.runtime.shellController.showDiagnostics,
    viewModel: params.diagnosticsViewModel,
    document: params.document,
    setShowDiagnostics: params.runtime.shellController.setShowDiagnostics,
    setSelectedPerson: params.actions.setSelectedPerson,
    applyProjectedDocument: (nextDoc) => params.actions.applyProjectedDocument(nextDoc, "merge"),
  });

  const stats = useShellStatsFeature({
    document: params.document,
    viewConfig: params.state.viewConfig,
    visiblePersonIds: params.visiblePersonIds,
    globalStatsOpen: params.runtime.shellController.showGlobalStatsPanel,
    globalStatsViewModel: params.globalStatsViewModel,
    setShowGlobalStatsPanel: params.runtime.shellController.setShowGlobalStatsPanel,
    personStatsViewModel: params.personStatsViewModel,
    setShowPersonStatsPersonId: params.runtime.shellController.setShowPersonStatsPersonId,
    timelineViewModel: params.timelineViewModel,
    setTimelineView: params.actions.setTimelineView,
    setTimelineScaleZoom: params.actions.setTimelineScaleZoom,
    setTimelineScaleOffset: params.actions.setTimelineScaleOffset,
    handleTimelineHighlight: params.runtime.shellController.handleTimelineHighlight,
    setTimelineStatus: params.actions.setTimelineStatus,
    toggleRightStackSection: params.actions.toggleRightStackSection,
    clearOverlayType: params.actions.clearOverlayType,
    setTimelinePanelOpen: params.actions.setTimelinePanelOpen,
    setLeftSectionState: params.actions.setLeftSectionState,
  });

  const ai = useShellAiFeature({
    openSettings: params.runtime.ai.showAiSettingsModal,
    aiSettings: params.state.aiSettings,
    setAiSettings: params.actions.setAiSettings,
    setStatus: params.runtime.gsk.setStatus,
    closeSettings: () => params.runtime.ai.setShowAiSettingsModal(false),
    assistantViewModel: params.aiAssistantViewModel,
    closeAssistant: () => params.runtime.ai.setShowAiAssistantModal(false),
    applyAiBatch: params.runtime.ai.applyAiBatch,
    openSettingsModal: () => params.runtime.ai.setShowAiSettingsModal(true),
  });

  const person = useShellPersonFeature({
    personEditorViewModel: params.personEditorViewModel,
    closePersonEditor: () => params.runtime.shellController.setPersonDetailModal(null),
    updatePersonById: params.actions.updatePersonById,
    addRelationFromAnchor: params.actions.addRelationFromAnchor,
    createStandalonePerson: params.actions.createStandalonePerson,
    personWorkspaceViewModelV3: params.personWorkspaceViewModelV3,
    workspaceWindowState: params.runtime.shellController.workspaceWindowState,
    closeWorkspaceV3: () => params.runtime.shellController.setWorkspacePersonIdV3(null),
    openPersonEditor: params.runtime.shellController.openPersonEditor,
    openLocalAiAssistant: params.runtime.ai.openLocalAiAssistant,
    setSelectedPerson: params.actions.setSelectedPerson,
    openWorkspaceV3: params.runtime.shellController.setWorkspacePersonIdV3,
    focusPersonInCanvas: params.runtime.shellController.focusPersonInCanvas,
    updateFamilyById: params.actions.updateFamilyById,
    createPersonRecord: params.actions.createPersonRecord,
    openAddRelationEditor: params.runtime.shellController.openAddRelationEditor,
    personPickerViewModel: params.personPickerViewModel,
    picker: params.runtime.shellController.picker,
    setOverlay: params.actions.setOverlay,
    linkExistingRelation: params.actions.linkExistingRelation,
    setStatus: params.runtime.gsk.setStatus,
    setPicker: () => params.runtime.shellController.setPicker(null),
    branchExportViewModel: params.branchExportViewModel,
    branchAnchorId: params.runtime.shellController.branchAnchorId,
    exportBranchGsk: params.runtime.gsk.exportBranchGsk,
    setBranchAnchorId: params.runtime.shellController.setBranchAnchorId,
  });

  const canvas = useShellCanvasFeature({
    expandedGraph: params.state.expandedGraph,
    document: params.document,
    fitNonce: params.state.fitNonce,
    selectedPersonId: params.state.selectedPersonId,
    focusPersonId: params.state.viewConfig?.focusPersonId ?? null,
    focusFamilyId: params.state.viewConfig?.focusFamilyId ?? null,
    colorTheme: params.runtime.shellController.colorTheme,
    normalizedKindraConfig: params.normalizedKindraConfig,
    showMockTools: params.runtime.shellController.showMockTools,
    setNodeMenu: params.runtime.shellController.setNodeMenu,
    clearVisualModes: params.actions.clearVisualModes,
    onNodeClick: params.runtime.shellController.handleNodeClick,
    onNodeContextMenu: params.runtime.shellController.handleNodeContextMenu,
    onSvgReady: (svg) => {
      params.runtime.refs.graphSvgRef.current = svg;
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
      personWorkspaceV3: person.personWorkspaceV3,
      personPicker: person.personPicker,
      branchExport: person.branchExport,
      timeline: stats.timeline,
      canvas,
    },
  };
}
