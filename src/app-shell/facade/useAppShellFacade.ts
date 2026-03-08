import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useShallow } from "zustand/react/shallow";
import { applyDiagnosticFixes } from "@/core/diagnostics/fixExecutor";
import { projectGraphDocument } from "@/core/read-model/selectors";
import { inferTimelineEvents, inferTimelineStatus } from "@/core/timeline/livingPresence";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { DEFAULT_COLOR_THEME, useAppShellController } from "@/hooks/useAppShellController";
import { useAppShellShortcuts } from "@/hooks/useAppShellShortcuts";
import { useFileLoadRuntime } from "@/hooks/useFileLoadRuntime";
import { useGskFile } from "@/hooks/useGskFile";
import { useMenuConfig } from "@/hooks/useMenuConfig";
import { useWorkspacePersistenceEffects } from "@/hooks/useWorkspacePersistenceEffects";
import { useAppStore } from "@/state/store";
import type { SearchFilterState, SearchSortDirection, SearchSortField } from "@/ui/search/searchEngine";
import type {
  AppShellFacade,
  TimelinePresenceResult,
} from "./types";
import { useShellDerivedViewModels } from "./useShellDerivedViewModels";
import { useShellSessionFlow } from "./useShellSessionFlow";

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
    normalizedDtreeConfig,
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

  return {
    chrome: {
      appRootStyle: {
        "--canvas-bg-custom": shellController.colorTheme.background,
        "--node-fill-custom": shellController.colorTheme.personNode,
        "--node-text-custom": shellController.colorTheme.text,
        "--edge-color-custom": shellController.colorTheme.edges,
      } as CSSProperties,
      leftCollapsed,
      rightCollapsed,
      detailsMode: viewConfig?.rightStack?.detailsMode ?? "expanded",
      timelineMode: viewConfig?.rightStack?.timelineMode ?? "compact",
      topbar: {
        menus,
        actions: menuActions,
        menuLayout: shellController.menuLayout,
        onChangeLayout: shellController.setMenuLayout,
      },
      footer: {
        statusMessage: status,
        personCount: document ? Object.keys(document.persons).length : null,
        familyCount: document ? Object.keys(document.families).length : null,
        sourceCount: document ? Object.keys(document.sources ?? {}).length : null,
        engineMode: viewConfig ? "Kindra" : null,
        isSaved: false,
        appVersion: "0.4.5",
      },
      leftPanel: {
        viewModel: leftPanelViewModel,
        commands: {
          onToggleSection: actions.toggleLeftSection,
          onSetSections: actions.setLeftSectionState,
          onDTreeOrientation: actions.setKindraOrientation,
          onPreset: actions.setPreset,
          onDepth: actions.setDepth,
          onInclude: actions.setInclude,
          onGridEnabled: actions.setGridEnabled,
          onClearPositions: actions.clearNodePositions,
        },
      },
      rightPanel: {
        viewModel: selectedPersonPanelViewModel,
        commands: {
          onToggleDetailsExpanded: () => actions.toggleRightStackSection("details"),
          onEditPerson: shellController.openPersonEditor,
          onViewPersonDetail: (personId) => shellController.setWorkspacePersonId(personId),
          onAddRelation: shellController.openAddRelationEditor,
          onLinkExistingRelation: (anchorId, type) => shellController.setPicker({ anchorId, type }),
          onUnlinkRelation: (personId, relatedId, type) => {
            actions.unlinkRelation(personId, relatedId, type);
            setStatus(`Relacion desvinculada: ${type}`);
          },
        },
      },
      colorThemeMenu: {
        open: shellController.showColorThemeMenu,
        value: shellController.colorTheme,
        onChange: shellController.setColorTheme,
        onReset: () => shellController.setColorTheme(DEFAULT_COLOR_THEME),
        onClose: () => shellController.setShowColorThemeMenu(false),
      },
      dialogs: {
        about: { open: shellController.showAboutModalV3, onClose: () => shellController.setShowAboutModalV3(false) },
        wiki: { open: shellController.showWikiPanel, onClose: () => shellController.setShowWikiPanel(false) },
        familySearch: {
          open: shellController.showFamilySearchPanel,
          onClose: () => shellController.setShowFamilySearchPanel(false),
          onImport: () => shellController.setShowFamilySearchPanel(false),
        },
      },
      shellCommands: {
        onToggleLeft: () => actions.toggleShellPanel("left"),
        onToggleRight: () => actions.toggleShellPanel("right"),
      },
    },
    navigation: {
      search: {
        viewModel: searchViewModel,
        commands: {
          onClose: () => shellController.setShowSearchPanel(false),
          onSelectPerson: (personId) => {
            actions.inspectPerson(personId);
            shellController.setWorkspacePersonId(personId);
          },
          onQueryChange: setSearchQuery,
          onSortFieldChange: setSearchSortField,
          onSortDirectionToggle: () => setSearchSortDirection((prev) => (prev === "asc" ? "desc" : "asc")),
          onFiltersChange: (patch) => setSearchFilters((prev) => ({ ...prev, ...patch })),
          onReset: () => {
            setSearchQuery("");
            setSearchSortField("id");
            setSearchSortDirection("asc");
            setSearchFilters({ sex: "any", lifeStatus: "any", surname: "any" });
          },
        },
      },
      nodeMenu: {
        state: shellController.nodeMenuState
          ? {
              open: true,
              x: shellController.nodeMenuState.x,
              y: shellController.nodeMenuState.y,
              nodeKind: shellController.nodeMenuState.nodeKind,
              title: shellController.nodeMenuState.title,
              items: shellController.nodeMenuState.items,
            }
          : null,
        onClose: () => shellController.setNodeMenu(null),
      },
    },
    workspace: {
      boot: {
        status: bootStatus,
      },
      hiddenInputs: {
        openFile: {
          ref: openFileInputRef,
          onChange: (event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void openAndReplace(file);
            event.currentTarget.value = "";
          },
        },
        importFile: {
          ref: importFileInputRef,
          onChange: (event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void importForMerge(file);
            event.currentTarget.value = "";
          },
        },
      },
      restoreBanner: {
        visible: sessionFlow.restoreBanner.visible,
        message: sessionFlow.restoreBanner.message,
        onDismiss: sessionFlow.restoreBanner.onDismiss,
        onStartFresh: sessionFlow.restoreBanner.onStartFresh,
      },
      exportWarningsBanner: {
        visible: exportWarnings.length > 0,
        count: exportWarnings.length,
        onDismiss: () => setExportWarnings([]),
      },
      pdfExport: {
        open: shellController.showPdfExport,
        options: { scope: pdfOptions.scope, paperSize: pdfOptions.paperSize },
        onScopeChange: (scope) => setPdfOptions((prev) => ({ ...prev, scope })),
        onPaperSizeChange: (paperSize) => setPdfOptions((prev) => ({ ...prev, paperSize })),
        onExportNow: exportPdfNow,
        onClose: () => shellController.setShowPdfExport(false),
      },
      importReview: {
        open: Boolean(importIncomingDoc && document),
        viewModel: importReviewViewModel,
        clearMergeFocus: shellController.clearMergeFocusOverlay,
        onDraftChange: actions.setMergeDraft,
        onFocusChange: shellController.handleMergeFocusChange,
        onApply: handleMergeApply,
        onClose: () => {
          shellController.clearMergeFocusOverlay();
          setImportIncomingDoc(null);
        },
        onClearDraft: actions.clearMergeDraft,
      },
      banners: {
        aiUndo: {
          visible: Boolean(aiUndoSnapshot),
          onUndo: undoAiBatch,
        },
        kinship: {
          visible: Boolean(shellController.pendingKinshipSourceId && document),
          message: shellController.pendingKinshipSourceId && document
            ? `Selecciona a otra persona para calcular parentesco con ${document.persons[shellController.pendingKinshipSourceId]?.name || ""}`.trim()
            : "",
          onDismiss: () => shellController.setPendingKinshipSourceId(null),
        },
      },
    },
    features: {
      diagnostics: {
        open: shellController.showDiagnostics,
        viewModel: diagnosticsViewModel,
        commands: {
          onClose: () => shellController.setShowDiagnostics(false),
          onSelectPerson: (personId) => {
            actions.setSelectedPerson(personId);
            shellController.setShowDiagnostics(false);
          },
          onSelectFamily: (familyId) => {
            const family = document?.families[familyId];
            const candidate = family?.husbandId || family?.wifeId || family?.childrenIds[0];
            if (candidate) actions.setSelectedPerson(candidate);
            shellController.setShowDiagnostics(false);
          },
          onApplyActions: (diagnosticActions, _options) => {
            if (!document) return null;
            const { nextDoc, result } = applyDiagnosticFixes(document, diagnosticActions);
            actions.applyProjectedDocument(nextDoc, "merge");
            return result;
          },
          resolveEntityLabel: (entityId) => {
            if (!document) return undefined;
            if (entityId.startsWith("@I")) return document.persons[entityId]?.name;
            if (entityId.startsWith("@F")) return entityId;
            return undefined;
          },
        },
      },
      globalStats: {
        open: shellController.showGlobalStatsPanel,
        viewModel: globalStatsViewModel,
        onClose: () => shellController.setShowGlobalStatsPanel(false),
      },
      personStats: {
        open: personStatsViewModel.kind === "ready",
        viewModel: personStatsViewModel,
        onClose: () => shellController.setShowPersonStatsPersonId(null),
      },
      ai: {
        settingsModal: {
          open: showAiSettingsModal,
          settings: aiSettings,
          onSave: (next) => {
            actions.setAiSettings(next);
            setStatus("Ajustes AncestrAI guardados.");
          },
          onClose: () => setShowAiSettingsModal(false),
          onStatus: setStatus,
        },
        assistantModal: {
          viewModel: aiAssistantViewModel,
          onClose: () => setShowAiAssistantModal(false),
          onStatus: setStatus,
          onApplyBatch: applyAiBatch,
          onOpenSettings: () => setShowAiSettingsModal(true),
        },
      },
      personEditor: {
        viewModel: personEditorViewModel,
        commands: {
          onClose: () => shellController.setPersonDetailModal(null),
          onSaveEdit: actions.updatePersonById,
          onSaveRelation: actions.addRelationFromAnchor,
          onCreateStandalone: actions.createStandalonePerson,
        },
      },
      personWorkspace: {
        open: Boolean(personWorkspaceViewModel),
        viewModel: personWorkspaceViewModel,
        commands: {
          onClose: () => shellController.setWorkspacePersonId(null),
          onSelectPerson: actions.setSelectedPerson,
          onSetAsFocus: shellController.focusPersonInCanvas,
          onSavePerson: actions.updatePersonById,
          onSaveFamily: actions.updateFamilyById,
          onCreatePerson: actions.createPersonRecord,
          onQuickAddRelation: (anchorId, relationType) => {
            shellController.setWorkspacePersonId(null);
            shellController.openAddRelationEditor(anchorId, relationType);
          },
        },
      },
      personWorkspaceV3: {
        open: Boolean(personWorkspaceViewModelV3),
        viewModel: personWorkspaceViewModelV3,
        commands: {
          onClose: () => shellController.setWorkspacePersonIdV3(null),
          onSelectPerson: (personId) => {
            actions.setSelectedPerson(personId);
            shellController.setWorkspacePersonIdV3(personId);
          },
          onSetAsFocus: shellController.focusPersonInCanvas,
          onSavePerson: actions.updatePersonById,
          onSaveFamily: actions.updateFamilyById,
          onCreatePerson: actions.createPersonRecord,
          onQuickAddRelation: (anchorId, relationType) => {
            shellController.setWorkspacePersonIdV3(null);
            shellController.openAddRelationEditor(anchorId, relationType);
          },
        },
      },
      personPicker: {
        viewModel: personPickerViewModel,
        onLink: (existingPersonId) => {
          if (!shellController.picker) return;
          if (shellController.picker.type === "kinship") {
            actions.setOverlay({
              id: "kinship-standard",
              type: "kinship",
              priority: 90,
              config: { person1Id: shellController.picker.anchorId, person2Id: existingPersonId },
            });
            setStatus("Calculando parentesco...");
            return;
          }
          actions.linkExistingRelation(shellController.picker.anchorId, existingPersonId, shellController.picker.type);
          setStatus("Persona vinculada");
        },
        onClose: () => shellController.setPicker(null),
      },
      branchExport: {
        viewModel: branchExportViewModel,
        onExport: (direction) => {
          if (!shellController.branchAnchorId) return;
          void exportBranchGsk(shellController.branchAnchorId, direction);
          shellController.setBranchAnchorId(null);
        },
        onClose: () => shellController.setBranchAnchorId(null),
      },
      timeline: {
        viewModel: timelineViewModel,
        commands: {
          onTimelineView: actions.setTimelineView,
          onTimelineScaleZoom: actions.setTimelineScaleZoom,
          onTimelineScaleOffset: actions.setTimelineScaleOffset,
          onTimelineHighlight: shellController.handleTimelineHighlight,
          onTimelinePresence: (value, mode): TimelinePresenceResult => {
            if (!document) {
              return { livingIds: [], deceasedIds: [], eventIds: [], livingCount: 0, effectiveValue: value };
            }
            const effectiveValue = mode === "decade" ? Math.floor(value / 10) * 10 : Math.floor(value);
            const scope = viewConfig?.timeline.scope ?? "visible";
            const visibleSet = new Set(visiblePersonIds);
            const { living, deceased } = inferTimelineStatus(document, effectiveValue);
            const events = inferTimelineEvents(document, effectiveValue);
            const filterIds = (ids: Iterable<string>) => {
              const next = Array.from(ids);
              return scope === "all" ? next : next.filter((id) => visibleSet.has(id));
            };
            return {
              livingIds: filterIds(living),
              deceasedIds: filterIds(deceased),
              eventIds: filterIds(events),
              livingCount: filterIds(living).length,
              effectiveValue,
            };
          },
          onApplyPresence: (result) => actions.setTimelineStatus(result.livingIds, result.deceasedIds, result.effectiveValue, result.eventIds),
          onToggleTimelineExpanded: () => actions.toggleRightStackSection("timeline"),
          onClosePanel: () => {
            actions.clearOverlayType("timeline");
            actions.setTimelinePanelOpen(false);
          },
        },
      },
      canvas: {
        graph: expandedGraph,
        documentView: document,
        fitNonce,
        selectedPersonId,
        focusPersonId: viewConfig?.focusPersonId ?? null,
        focusFamilyId: viewConfig?.focusFamilyId ?? null,
        colorTheme: shellController.colorTheme,
        kindraConfig: normalizedDtreeConfig,
        modeBadge: viewConfig ? "Kindra" : null,
        showMockTools: shellController.showMockTools,
        commands: {
          onNodeClick: shellController.handleNodeClick,
          onNodeContextMenu: shellController.handleNodeContextMenu,
          onBgClick: () => shellController.setNodeMenu(null),
          onBgDoubleClick: actions.clearVisualModes,
          onSvgReady: (svg) => {
            graphSvgRef.current = svg;
          },
        },
      },
    },
  };
}

