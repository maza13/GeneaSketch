import { useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { projectGraphDocument } from "@/core/read-model/selectors";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { useAppShellController } from "@/hooks/useAppShellController";
import { useAppShellShortcuts } from "@/hooks/useAppShellShortcuts";
import { useFileLoadRuntime } from "@/hooks/useFileLoadRuntime";
import { useGskFile } from "@/hooks/useGskFile";
import { useMenuConfig } from "@/hooks/useMenuConfig";
import { useWorkspacePersistenceEffects } from "@/hooks/useWorkspacePersistenceEffects";
import { useAppStore } from "@/state/store";
import type { SearchFilterState, SearchSortDirection, SearchSortField } from "@/ui/search/searchEngine";
import type { AppShellFacade } from "./types";
import { useShellAiFeature } from "./useShellAiFeature";
import { useShellCanvasFeature } from "./useShellCanvasFeature";
import { useShellChromeFeature } from "./useShellChromeFeature";
import { useShellDerivedViewModels } from "./useShellDerivedViewModels";
import { useShellDiagnosticsFeature } from "./useShellDiagnosticsFeature";
import { useShellNavigationFeature } from "./useShellNavigationFeature";
import { useShellPersonFeature } from "./useShellPersonFeature";
import { useShellSessionFlow } from "./useShellSessionFlow";
import { useShellStatsFeature } from "./useShellStatsFeature";
import { useShellWorkspaceFeature } from "./useShellWorkspaceFeature";

export function useAppShellFacade(): AppShellFacade {
  const genraphGraph = useAppStore((state) => state.genraphGraph);
  const viewConfig = useAppStore((state) => state.viewConfig);
  const visualConfig = useAppStore((state) => state.visualConfig);
  const expandedGraph = useAppStore((state) => state.expandedGraph);
  const selectedPersonId = useAppStore((state) => state.selectedPersonId);
  const fitNonce = useAppStore((state) => state.fitNonce);
  const recentFiles = useAppStore((state) => state.recentFiles);
  const mergeDraft = useAppStore((state) => state.mergeDraft);
  const aiSettings = useAppStore((state) => state.aiSettings);
  const bootStatus = useAppStore((state) => state.bootStatus);
  const restoreNoticeVisible = useAppStore((state) => state.restoreNoticeVisible);
  const { parseErrors, parseWarnings } = useAppStore(
    useShallow((state) => ({
      parseErrors: state.parseErrors,
      parseWarnings: state.parseWarnings,
    })),
  );

  const actions = useAppStore(
    useShallow((state) => ({
      applyProjectedDocument: state.applyProjectedDocument,
      createNewTreeDoc: state.createNewTreeDoc,
      setSelectedPerson: state.setSelectedPerson,
      updatePersonById: state.updatePersonById,
      updateFamilyById: state.updateFamilyById,
      addRelationFromAnchor: state.addRelationFromAnchor,
      createStandalonePerson: state.createStandalonePerson,
      createPersonRecord: state.createPersonRecord,
      linkExistingRelation: state.linkExistingRelation,
      unlinkRelation: state.unlinkRelation,
      setPreset: state.setPreset,
      setDepth: state.setDepth,
      setInclude: state.setInclude,
      toggleShellPanel: state.toggleShellPanel,
      toggleLeftSection: state.toggleLeftSection,
      setLeftSectionState: state.setLeftSectionState,
      setTimelinePanelOpen: state.setTimelinePanelOpen,
      toggleRightStackSection: state.toggleRightStackSection,
      setTimelineScope: state.setTimelineScope,
      setTimelineView: state.setTimelineView,
      setTimelineScaleZoom: state.setTimelineScaleZoom,
      setTimelineScaleOffset: state.setTimelineScaleOffset,
      setTimelineStatus: state.setTimelineStatus,
      clearNodePositions: state.clearNodePositions,
      setGridEnabled: state.setGridEnabled,
      setKindraOrientation: state.setKindraOrientation,
      setKindraLayoutEngine: state.setKindraLayoutEngine,
      toggleKindraNodeCollapse: state.toggleKindraNodeCollapse,
      setOverlay: state.setOverlay,
      clearOverlayType: state.clearOverlayType,
      clearVisualModes: state.clearVisualModes,
      goBack: state.goBack,
      goForward: state.goForward,
      fitToScreen: state.fitToScreen,
      clearRecentFiles: state.clearRecentFiles,
      setMergeDraft: state.setMergeDraft,
      clearMergeDraft: state.clearMergeDraft,
      setAiSettings: state.setAiSettings,
      bootstrapSession: state.bootstrapSession,
      clearSession: state.clearSession,
      dismissRestoreNotice: state.dismissRestoreNotice,
      setFocusFamilyId: state.setFocusFamilyId,
      inspectPerson: state.inspectPerson,
      saveAutosessionNow: state.saveAutosessionNow,
    })),
  );

  const document = useMemo(
    () => projectGraphDocument(genraphGraph),
    [genraphGraph?.graphId, genraphGraph?.journalLength],
  );
  const openFileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const clearMergeFocusOverlayRef = useRef<() => void>(() => {});
  const openLocalAiAssistantRef = useRef<(id: string) => void>(() => {});
  const setStatusRef = useRef<(status: string) => void>(() => {});
  const fileLoadRuntime = useFileLoadRuntime(() => clearMergeFocusOverlayRef.current());

  const shellController = useAppShellController({
    document,
    viewConfig,
    selectedPersonId,
    clearOverlayType: actions.clearOverlayType,
    setOverlay: actions.setOverlay,
    inspectPerson: actions.inspectPerson,
    setSelectedPerson: actions.setSelectedPerson,
    fitToScreen: actions.fitToScreen,
    setStatus: (status) => setStatusRef.current(status),
    applyProjectedDocument: actions.applyProjectedDocument,
    toggleKindraNodeCollapse: actions.toggleKindraNodeCollapse,
    setFocusFamilyId: actions.setFocusFamilyId,
    openLocalAiAssistant: (personId) => openLocalAiAssistantRef.current(personId),
  });

  const {
    status,
    setStatus,
    exportWarnings,
    setExportWarnings,
    importIncomingDoc,
    setImportIncomingDoc,
    pdfOptions,
    setPdfOptions,
    openAndReplace,
    importForMerge,
    saveGsk,
    exportGed,
    exportBranchGsk,
    exportRaster,
    exportPdfNow,
    openRecentItem,
    handleMergeApply,
  } = useGskFile(graphSvgRef, shellController.colorTheme, fileLoadRuntime);

  setStatusRef.current = setStatus;

  const {
    showAiAssistantModal,
    setShowAiAssistantModal,
    showAiSettingsModal,
    setShowAiSettingsModal,
    aiContext,
    aiUndoSnapshot,
    openGlobalAiAssistant,
    openLocalAiAssistant,
    applyAiBatch,
    undoAiBatch,
  } = useAiAssistant({
    document,
    applyDocumentChange: (nextDoc, source) => actions.applyProjectedDocument(nextDoc, source),
    setStatus,
  });

  openLocalAiAssistantRef.current = openLocalAiAssistant;
  clearMergeFocusOverlayRef.current = shellController.clearMergeFocusOverlay;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchSortField, setSearchSortField] = useState<SearchSortField>("id");
  const [searchSortDirection, setSearchSortDirection] = useState<SearchSortDirection>("asc");
  const [searchFilters, setSearchFilters] = useState<SearchFilterState>({
    sex: "any",
    lifeStatus: "any",
    surname: "any",
  });

  useAppShellShortcuts({
    colorTheme: shellController.colorTheme,
    document,
    selectedPersonId,
    viewConfig,
    saveGsk,
    openFilePicker: () => openFileInputRef.current?.click(),
    goBack: actions.goBack,
    goForward: actions.goForward,
    fitToScreen: actions.fitToScreen,
    focusPersonInCanvas: shellController.focusPersonInCanvas,
    onOpenAiSettings: () => setShowAiSettingsModal(true),
    toggleShellPanel: actions.toggleShellPanel,
    setTimelinePanelOpen: actions.setTimelinePanelOpen,
    onEscape: () => {
      shellController.setNodeMenu(null);
      shellController.setShowSearchPanel(false);
    },
    onFocusSearch: () => {
      shellController.setShowSearchPanel(true);
      const search = window.document.getElementById("search-center-input") as HTMLInputElement | null;
      search?.focus();
    },
  });

  const { leftCollapsed, rightCollapsed } = viewConfig?.shellPanels || {
    leftCollapsed: false,
    rightCollapsed: false,
  };

  useWorkspacePersistenceEffects({
    document,
    viewConfig,
    visualConfig,
    aiSettings,
    leftCollapsed,
    rightCollapsed,
    saveAutosessionNow: actions.saveAutosessionNow,
    graphId: genraphGraph?.graphId,
    colorTheme: shellController.colorTheme,
  });

  const sessionFlow = useShellSessionFlow({
    bootStatus,
    restoreNoticeVisible,
    document,
    genraphGraph,
    bootstrapSession: actions.bootstrapSession,
    dismissRestoreNotice: actions.dismissRestoreNotice,
    clearSession: actions.clearSession,
    createNewTreeDoc: actions.createNewTreeDoc,
    setSelectedPerson: actions.setSelectedPerson,
    fitToScreen: actions.fitToScreen,
    openPersonEditor: shellController.openPersonEditor,
    setStatus,
  });

  const { menus, actions: menuActions } = useMenuConfig({
    document,
    viewConfig,
    recentFiles,
    selectedPersonId,
    colorTheme: shellController.colorTheme,
    themeMode: shellController.themeMode,
    aiUndoSnapshot,
    leftCollapsed,
    rightCollapsed,
    timelineOpen: viewConfig?.timelinePanelOpen ?? false,
    createNewTreeDoc: async () => sessionFlow.startFreshSession(),
    openFileInput: () => openFileInputRef.current?.click(),
    importFileInput: () => importFileInputRef.current?.click(),
    openAndReplace,
    openRecentItem,
    saveGsk,
    exportGed,
    setShowPdfExport: shellController.setShowPdfExport,
    exportRaster,
    openPersonEditor: shellController.openPersonEditor,
    openAddRelationEditor: shellController.openAddRelationEditor,
    openLocalAiAssistant,
    openGlobalAiAssistant,
    setShowAiSettingsModal,
    undoAiBatch,
    fitToScreen: actions.fitToScreen,
    setThemeMode: shellController.setThemeMode,
    setShowColorThemeMenu: shellController.setShowColorThemeMenu,
    toggleShellPanel: actions.toggleShellPanel,
    setTimelinePanelOpen: actions.setTimelinePanelOpen,
    setTimelineScope: actions.setTimelineScope,
    setTimelineView: actions.setTimelineView,
    setKindraLayoutEngine: actions.setKindraLayoutEngine,
    setShowDiagnostics: shellController.setShowDiagnostics,
    setShowPersonStatsPersonId: shellController.setShowPersonStatsPersonId,
    setShowGlobalStatsPanel: shellController.setShowGlobalStatsPanel,
    clearNodePositions: actions.clearNodePositions,
    generateScenario: shellController.generateScenario,
    setShowMockTools: shellController.setShowMockTools,
    setShowFamilySearchPanel: shellController.setShowFamilySearchPanel,
    setShowWikiPanel: shellController.setShowWikiPanel,
    setShowAboutModalV3: shellController.setShowAboutModalV3,
    openPersonWorkspaceV3: (id) => shellController.setWorkspacePersonIdV3(id),
    setColorTheme: shellController.setColorTheme,
    clearRecentFiles: actions.clearRecentFiles,
    menuLayout: shellController.menuLayout,
    setMenuLayout: shellController.setMenuLayout,
  });

  const {
    visiblePersonIds,
    normalizedKindraConfig,
    leftPanelViewModel,
    selectedPersonPanelViewModel,
    timelineViewModel,
    searchViewModel,
    diagnosticsViewModel,
    globalStatsViewModel,
    personStatsViewModel,
    personWorkspaceViewModel,
    personWorkspaceViewModelV3,
    personEditorViewModel,
    importReviewViewModel,
    aiAssistantViewModel,
    personPickerViewModel,
    branchExportViewModel,
  } = useShellDerivedViewModels({
    document,
    viewConfig,
    visualConfig,
    expandedGraph,
    selectedPersonId,
    workspacePersonId: shellController.workspacePersonId,
    workspacePersonIdV3: shellController.workspacePersonIdV3,
    branchAnchorId: shellController.branchAnchorId,
    showSearchPanel: shellController.showSearchPanel,
    searchQuery,
    searchSortField,
    searchSortDirection,
    searchFilters,
    parseErrors,
    parseWarnings,
    aiSettings,
    showPersonStatsPersonId: shellController.showPersonStatsPersonId,
    personDetailModal: shellController.personDetailModal,
    importIncomingDoc,
    mergeDraft,
    showAiAssistantModal,
    aiContext,
    picker: shellController.picker,
  });

  const chrome = useShellChromeFeature({
    colorTheme: shellController.colorTheme,
    leftCollapsed,
    rightCollapsed,
    viewConfig,
    menus,
    menuActions,
    menuLayout: shellController.menuLayout,
    setMenuLayout: shellController.setMenuLayout,
    status,
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
    openPersonEditor: shellController.openPersonEditor,
    openPersonDetail: (personId) => shellController.setWorkspacePersonId(personId),
    openAddRelationEditor: shellController.openAddRelationEditor,
    setPicker: shellController.setPicker,
    unlinkRelation: actions.unlinkRelation,
    setStatus,
    showColorThemeMenu: shellController.showColorThemeMenu,
    setColorTheme: shellController.setColorTheme,
    setShowColorThemeMenu: shellController.setShowColorThemeMenu,
    showAboutModalV3: shellController.showAboutModalV3,
    setShowAboutModalV3: shellController.setShowAboutModalV3,
    showWikiPanel: shellController.showWikiPanel,
    setShowWikiPanel: shellController.setShowWikiPanel,
    showFamilySearchPanel: shellController.showFamilySearchPanel,
    setShowFamilySearchPanel: shellController.setShowFamilySearchPanel,
    toggleShellPanel: actions.toggleShellPanel,
  });

  const navigation = useShellNavigationFeature({
    searchViewModel,
    setShowSearchPanel: shellController.setShowSearchPanel,
    inspectPerson: actions.inspectPerson,
    setWorkspacePersonId: shellController.setWorkspacePersonId,
    setQuery: setSearchQuery,
    setSortField: setSearchSortField,
    toggleSortDirection: () => setSearchSortDirection((prev) => (prev === "asc" ? "desc" : "asc")),
    patchFilters: (patch) => setSearchFilters((prev) => ({ ...prev, ...patch })),
    resetSearch: () => {
      setSearchQuery("");
      setSearchSortField("id");
      setSearchSortDirection("asc");
      setSearchFilters({ sex: "any", lifeStatus: "any", surname: "any" });
    },
    nodeMenuState: shellController.nodeMenuState
      ? {
          open: true,
          x: shellController.nodeMenuState.x,
          y: shellController.nodeMenuState.y,
          nodeKind: shellController.nodeMenuState.nodeKind,
          title: shellController.nodeMenuState.title,
          items: shellController.nodeMenuState.items,
        }
      : null,
    setNodeMenu: shellController.setNodeMenu,
  });

  const workspace = useShellWorkspaceFeature({
    bootStatus,
    openFileInputRef,
    importFileInputRef,
    openAndReplace,
    importForMerge,
    restoreBanner: {
      visible: sessionFlow.restoreBanner.visible,
      message: sessionFlow.restoreBanner.message,
      onDismiss: sessionFlow.restoreBanner.onDismiss,
      onStartFresh: sessionFlow.restoreBanner.onStartFresh,
    },
    exportWarningsCount: exportWarnings.length,
    dismissExportWarnings: () => setExportWarnings([]),
    showPdfExport: shellController.showPdfExport,
    pdfOptions: { scope: pdfOptions.scope, paperSize: pdfOptions.paperSize },
    setPdfScope: (scope) => setPdfOptions((prev) => ({ ...prev, scope })),
    setPdfPaperSize: (paperSize) => setPdfOptions((prev) => ({ ...prev, paperSize })),
    exportPdfNow,
    closePdfExport: () => shellController.setShowPdfExport(false),
    importIncomingDoc,
    document,
    importReviewViewModel,
    clearMergeFocus: shellController.clearMergeFocusOverlay,
    setMergeDraft: actions.setMergeDraft,
    onFocusChange: shellController.handleMergeFocusChange,
    onApply: handleMergeApply,
    onClearImportIncomingDoc: () => setImportIncomingDoc(null),
    clearMergeDraft: actions.clearMergeDraft,
    aiUndoVisible: Boolean(aiUndoSnapshot),
    undoAiBatch,
    kinshipVisible: Boolean(shellController.pendingKinshipSourceId && document),
    kinshipMessage: shellController.pendingKinshipSourceId && document
      ? `Selecciona a otra persona para calcular parentesco con ${document.persons[shellController.pendingKinshipSourceId]?.name || ""}`.trim()
      : "",
    dismissKinship: () => shellController.setPendingKinshipSourceId(null),
  });

  const diagnostics = useShellDiagnosticsFeature({
    open: shellController.showDiagnostics,
    viewModel: diagnosticsViewModel,
    document,
    setShowDiagnostics: shellController.setShowDiagnostics,
    setSelectedPerson: actions.setSelectedPerson,
    applyProjectedDocument: (nextDoc) => actions.applyProjectedDocument(nextDoc, "merge"),
  });

  const stats = useShellStatsFeature({
    document,
    viewConfig,
    visiblePersonIds,
    globalStatsOpen: shellController.showGlobalStatsPanel,
    globalStatsViewModel,
    setShowGlobalStatsPanel: shellController.setShowGlobalStatsPanel,
    personStatsViewModel,
    setShowPersonStatsPersonId: shellController.setShowPersonStatsPersonId,
    timelineViewModel,
    setTimelineView: actions.setTimelineView,
    setTimelineScaleZoom: actions.setTimelineScaleZoom,
    setTimelineScaleOffset: actions.setTimelineScaleOffset,
    handleTimelineHighlight: shellController.handleTimelineHighlight,
    setTimelineStatus: actions.setTimelineStatus,
    toggleRightStackSection: actions.toggleRightStackSection,
    clearOverlayType: actions.clearOverlayType,
    setTimelinePanelOpen: actions.setTimelinePanelOpen,
  });

  const ai = useShellAiFeature({
    openSettings: showAiSettingsModal,
    aiSettings,
    setAiSettings: actions.setAiSettings,
    setStatus,
    closeSettings: () => setShowAiSettingsModal(false),
    assistantViewModel: aiAssistantViewModel,
    closeAssistant: () => setShowAiAssistantModal(false),
    applyAiBatch,
    openSettingsModal: () => setShowAiSettingsModal(true),
  });

  const person = useShellPersonFeature({
    personEditorViewModel,
    closePersonEditor: () => shellController.setPersonDetailModal(null),
    updatePersonById: actions.updatePersonById,
    addRelationFromAnchor: actions.addRelationFromAnchor,
    createStandalonePerson: actions.createStandalonePerson,
    personWorkspaceViewModel,
    personWorkspaceViewModelV3,
    closeWorkspace: () => shellController.setWorkspacePersonId(null),
    closeWorkspaceV3: () => shellController.setWorkspacePersonIdV3(null),
    setSelectedPerson: actions.setSelectedPerson,
    openWorkspace: shellController.setWorkspacePersonId,
    openWorkspaceV3: shellController.setWorkspacePersonIdV3,
    focusPersonInCanvas: shellController.focusPersonInCanvas,
    updateFamilyById: actions.updateFamilyById,
    createPersonRecord: actions.createPersonRecord,
    openAddRelationEditor: shellController.openAddRelationEditor,
    personPickerViewModel,
    picker: shellController.picker,
    setOverlay: actions.setOverlay,
    linkExistingRelation: actions.linkExistingRelation,
    setStatus,
    setPicker: shellController.setPicker,
    branchExportViewModel,
    branchAnchorId: shellController.branchAnchorId,
    exportBranchGsk,
    setBranchAnchorId: shellController.setBranchAnchorId,
  });

  const canvas = useShellCanvasFeature({
    expandedGraph,
    document,
    fitNonce,
    selectedPersonId,
    focusPersonId: viewConfig?.focusPersonId ?? null,
    focusFamilyId: viewConfig?.focusFamilyId ?? null,
    colorTheme: shellController.colorTheme,
    normalizedKindraConfig,
    showMockTools: shellController.showMockTools,
    setNodeMenu: shellController.setNodeMenu,
    clearVisualModes: actions.clearVisualModes,
    onNodeClick: shellController.handleNodeClick,
    onNodeContextMenu: shellController.handleNodeContextMenu,
    onSvgReady: (svg) => {
      graphSvgRef.current = svg;
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
