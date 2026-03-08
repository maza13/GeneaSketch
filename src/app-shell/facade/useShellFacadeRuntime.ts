import { useRef, useState } from "react";
import type { SearchFilterState, SearchSortDirection, SearchSortField } from "@/ui/search/searchEngine";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { useAppShellController } from "@/hooks/useAppShellController";
import { useFileLoadRuntime } from "@/hooks/useFileLoadRuntime";
import { useGskFile } from "@/hooks/useGskFile";
import { useMenuConfig } from "@/hooks/useMenuConfig";
import type { GraphDocument } from "@/core/read-model/types";

type Params = {
  document: GraphDocument | null;
  viewConfig: any;
  selectedPersonId: string | null;
  recentFiles: any[];
  aiSettings: any;
  mergeDraft: any;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  actions: any;
};

export function useShellFacadeRuntime(params: Params) {
  const openFileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const clearMergeFocusOverlayRef = useRef<() => void>(() => {});
  const openLocalAiAssistantRef = useRef<(id: string) => void>(() => {});
  const setStatusRef = useRef<(status: string) => void>(() => {});
  const fileLoadRuntime = useFileLoadRuntime(() => clearMergeFocusOverlayRef.current());

  const shellController = useAppShellController({
    document: params.document,
    viewConfig: params.viewConfig,
    selectedPersonId: params.selectedPersonId,
    clearOverlayType: params.actions.clearOverlayType,
    setOverlay: params.actions.setOverlay,
    inspectPerson: params.actions.inspectPerson,
    setSelectedPerson: params.actions.setSelectedPerson,
    fitToScreen: params.actions.fitToScreen,
    setStatus: (status) => setStatusRef.current(status),
    applyProjectedDocument: params.actions.applyProjectedDocument,
    toggleKindraNodeCollapse: params.actions.toggleKindraNodeCollapse,
    setFocusFamilyId: params.actions.setFocusFamilyId,
    openLocalAiAssistant: (personId) => openLocalAiAssistantRef.current(personId),
  });

  const gsk = useGskFile(graphSvgRef, shellController.colorTheme, fileLoadRuntime);
  setStatusRef.current = gsk.setStatus;

  const ai = useAiAssistant({
    document: params.document,
    applyDocumentChange: (nextDoc, source) => params.actions.applyProjectedDocument(nextDoc, source),
    setStatus: gsk.setStatus,
  });

  openLocalAiAssistantRef.current = ai.openLocalAiAssistant;
  clearMergeFocusOverlayRef.current = shellController.clearMergeFocusOverlay;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchSortField, setSearchSortField] = useState<SearchSortField>("id");
  const [searchSortDirection, setSearchSortDirection] = useState<SearchSortDirection>("asc");
  const [searchFilters, setSearchFilters] = useState<SearchFilterState>({
    sex: "any",
    lifeStatus: "any",
    surname: "any",
  });

  const menu = useMenuConfig({
    document: params.document,
    viewConfig: params.viewConfig,
    recentFiles: params.recentFiles,
    selectedPersonId: params.selectedPersonId,
    colorTheme: shellController.colorTheme,
    themeMode: shellController.themeMode,
    aiUndoSnapshot: ai.aiUndoSnapshot,
    leftCollapsed: params.leftCollapsed,
    rightCollapsed: params.rightCollapsed,
    timelineOpen: params.viewConfig?.timelinePanelOpen ?? false,
    createNewTreeDoc: params.actions.createNewTreeDoc,
    openFileInput: () => openFileInputRef.current?.click(),
    importFileInput: () => importFileInputRef.current?.click(),
    openAndReplace: gsk.openAndReplace,
    openRecentItem: gsk.openRecentItem,
    saveGsk: gsk.saveGsk,
    exportGed: gsk.exportGed,
    setShowPdfExport: shellController.setShowPdfExport,
    exportRaster: gsk.exportRaster,
    openPersonEditor: shellController.openPersonEditor,
    openAddRelationEditor: shellController.openAddRelationEditor,
    openLocalAiAssistant: ai.openLocalAiAssistant,
    openGlobalAiAssistant: ai.openGlobalAiAssistant,
    setShowAiSettingsModal: ai.setShowAiSettingsModal,
    undoAiBatch: ai.undoAiBatch,
    fitToScreen: params.actions.fitToScreen,
    setThemeMode: shellController.setThemeMode,
    setShowColorThemeMenu: shellController.setShowColorThemeMenu,
    toggleShellPanel: params.actions.toggleShellPanel,
    setTimelinePanelOpen: params.actions.setTimelinePanelOpen,
    setTimelineScope: params.actions.setTimelineScope,
    setTimelineView: params.actions.setTimelineView,
    setKindraLayoutEngine: params.actions.setKindraLayoutEngine,
    setShowDiagnostics: shellController.setShowDiagnostics,
    setShowPersonStatsPersonId: shellController.setShowPersonStatsPersonId,
    setShowGlobalStatsPanel: shellController.setShowGlobalStatsPanel,
    clearNodePositions: params.actions.clearNodePositions,
    generateScenario: shellController.generateScenario,
    setShowMockTools: shellController.setShowMockTools,
    setShowFamilySearchPanel: shellController.setShowFamilySearchPanel,
    setShowWikiPanel: shellController.setShowWikiPanel,
    setShowAboutModalV3: shellController.setShowAboutModalV3,
    openPersonWorkspaceV3: (id) => shellController.setWorkspacePersonIdV3(id),
    setColorTheme: shellController.setColorTheme,
    clearRecentFiles: params.actions.clearRecentFiles,
    menuLayout: shellController.menuLayout,
    setMenuLayout: shellController.setMenuLayout,
  });

  return {
    refs: {
      openFileInputRef,
      importFileInputRef,
      graphSvgRef,
    },
    shellController,
    fileLoadRuntime,
    gsk,
    ai,
    menu,
    search: {
      query: searchQuery,
      setQuery: setSearchQuery,
      sortField: searchSortField,
      setSortField: setSearchSortField,
      sortDirection: searchSortDirection,
      setSortDirection: setSearchSortDirection,
      filters: searchFilters,
      setFilters: setSearchFilters,
    },
  };
}
