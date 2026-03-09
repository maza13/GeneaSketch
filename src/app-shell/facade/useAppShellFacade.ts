import { useMemo } from "react";
import { projectGraphDocument } from "@/core/read-model/selectors";
import type { AppShellFacade } from "./types";
import { useShellDerivedViewModels } from "./useShellDerivedViewModels";
import { useShellFacadeActions } from "./useShellFacadeActions";
import { useShellFacadeEffects } from "./useShellFacadeEffects";
import { useShellFacadeRuntime } from "./useShellFacadeRuntime";
import { useShellFacadeState } from "./useShellFacadeState";
import { useShellFeatureComposition } from "./useShellFeatureComposition";

export function useAppShellFacade(): AppShellFacade {
  const state = useShellFacadeState();
  const actions = useShellFacadeActions();

  const document = useMemo(
    () => projectGraphDocument(state.genraphGraph),
    [state.genraphGraph, state.graphRevision],
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
  const sessionFlow = useShellFacadeEffects({
    document,
    genraphGraph: state.genraphGraph,
    viewConfig: state.viewConfig,
    visualConfig: state.visualConfig,
    selectedPersonId: state.selectedPersonId,
    aiSettings: state.aiSettings,
    mergeDraft: state.mergeDraft,
    bootStatus: state.bootStatus,
    restoreNoticeVisible: state.restoreNoticeVisible,
    leftCollapsed,
    rightCollapsed,
    graphId: state.genraphGraph?.graphId,
    runtime,
    actions,
  });

  const searchFilters = runtime.search.filters;
  const { visiblePersonIds, normalizedKindraConfig, leftPanelViewModel, selectedPersonPanelViewModel, timelineViewModel, searchViewModel, diagnosticsViewModel, globalStatsViewModel, personStatsViewModel, personWorkspaceViewModelV3, personEditorViewModel, importReviewViewModel, aiAssistantViewModel, personPickerViewModel, branchExportViewModel } =
    useShellDerivedViewModels({
      document,
      viewConfig: state.viewConfig,
      visualConfig: state.visualConfig,
      expandedGraph: state.expandedGraph,
      selectedPersonId: state.selectedPersonId,
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

  return useShellFeatureComposition({
    document,
    state,
    actions,
    runtime,
    sessionFlow,
    leftCollapsed,
    rightCollapsed,
    visiblePersonIds,
    normalizedKindraConfig,
    leftPanelViewModel,
    selectedPersonPanelViewModel,
    timelineViewModel,
    searchViewModel,
    diagnosticsViewModel,
    globalStatsViewModel,
    personStatsViewModel,
    personWorkspaceViewModelV3,
    personEditorViewModel,
    importReviewViewModel,
    aiAssistantViewModel,
    personPickerViewModel,
    branchExportViewModel,
  });
}
