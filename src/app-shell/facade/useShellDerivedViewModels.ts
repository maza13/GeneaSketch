import { useMemo } from "react";
import { analyzeGeneaDocument } from "@/core/diagnostics/analyzer";
import { calculateGlobalStatistics } from "@/core/graph/globalStatistics";
import { normalizeDtreeConfig } from "@/core/dtree/dtreeConfig";
import { buildAiAssistantViewModel } from "@/app-shell/workbenches/aiAssistantWorkbench";
import { buildImportReviewViewModel } from "@/app-shell/workbenches/importReviewWorkbench";
import { buildPersonEditorViewModel } from "@/app-shell/workbenches/personEditorWorkbench";
import { buildPersonWorkspaceViewModel } from "@/app-shell/workbenches/personWorkspaceWorkbench";
import type { GraphDocument } from "@/core/read-model/types";
import type { SearchFilterState, SearchSortDirection, SearchSortField } from "@/ui/search/searchEngine";
import type { AiSettings, AiInputContext } from "@/types/ai";
import type { MergeDraftSnapshot } from "@/types/merge-draft";
import type { ExpandedGraph, ViewConfig, VisualConfig } from "@/types/domain";
import type { PersonEditorState } from "@/types/editor";
import {
  buildBranchExportViewModel,
  buildLeftPanelViewModel,
  buildPersonPickerViewModel,
  buildPersonStatsViewModel,
  buildSearchViewModel,
  buildSelectedPersonPanelViewModel,
  buildTimelinePanelViewModel,
  buildVisiblePersonIds,
} from "./facadeBuilders";
import type {
  AiAssistantViewModel,
  DiagnosticsViewModel,
  ImportReviewViewModel,
  LeftPanelViewModel,
  PersonPickerViewModel,
  PersonStatsViewModel,
  PersonWorkspaceViewModel,
  SearchPanelViewModel,
  SelectedPersonPanelViewModel,
  TimelinePanelViewModel,
} from "./types";

type Params = {
  document: GraphDocument | null;
  viewConfig: ViewConfig | null;
  visualConfig: VisualConfig;
  expandedGraph: ExpandedGraph;
  selectedPersonId: string | null;
  workspacePersonId: string | null;
  workspacePersonIdV3: string | null;
  branchAnchorId: string | null;
  showSearchPanel: boolean;
  searchQuery: string;
  searchSortField: SearchSortField;
  searchSortDirection: SearchSortDirection;
  searchFilters: SearchFilterState;
  parseErrors: string[];
  parseWarnings: string[];
  aiSettings: AiSettings;
  showPersonStatsPersonId: string | null;
  personDetailModal: PersonEditorState;
  importIncomingDoc: GraphDocument | null;
  mergeDraft: MergeDraftSnapshot | null;
  showAiAssistantModal: boolean;
  aiContext: AiInputContext | null;
  picker: { anchorId: string; type: import("@/types/domain").PendingRelationType | "kinship" } | null;
};

type Result = {
  visiblePersonIds: string[];
  normalizedDtreeConfig: NonNullable<ViewConfig["dtree"]> | undefined;
  leftPanelViewModel: LeftPanelViewModel;
  selectedPersonPanelViewModel: SelectedPersonPanelViewModel;
  timelineViewModel: TimelinePanelViewModel;
  searchViewModel: SearchPanelViewModel;
  diagnosticsViewModel: DiagnosticsViewModel;
  globalStatsViewModel: {
    hasDocument: boolean;
    visiblePersonIds: string[];
    getStats: (scope: "all" | "visible") => ReturnType<typeof calculateGlobalStatistics>;
  };
  personStatsViewModel: PersonStatsViewModel;
  personWorkspaceViewModel: PersonWorkspaceViewModel | null;
  personWorkspaceViewModelV3: PersonWorkspaceViewModel | null;
  personEditorViewModel: ReturnType<typeof buildPersonEditorViewModel>;
  importReviewViewModel: ImportReviewViewModel;
  aiAssistantViewModel: AiAssistantViewModel;
  personPickerViewModel: PersonPickerViewModel | null;
  branchExportViewModel: ReturnType<typeof buildBranchExportViewModel>;
};

export function useShellDerivedViewModels(params: Params): Result {
  const visiblePersonIds = useMemo(
    () => buildVisiblePersonIds(params.document, params.expandedGraph),
    [params.document, params.expandedGraph],
  );
  const normalizedDtreeConfig = useMemo(
    () => (params.viewConfig ? normalizeDtreeConfig(params.viewConfig.dtree) : undefined),
    [params.viewConfig],
  );
  const leftPanelViewModel = useMemo(
    () => buildLeftPanelViewModel(params.document, params.viewConfig, params.visualConfig),
    [params.document, params.viewConfig, params.visualConfig],
  );
  const selectedPersonPanelViewModel = useMemo(
    () => buildSelectedPersonPanelViewModel(params.document, params.workspacePersonId || params.selectedPersonId),
    [params.document, params.selectedPersonId, params.workspacePersonId],
  );
  const timelineViewModel = useMemo(
    () => buildTimelinePanelViewModel(params.document, params.expandedGraph, params.viewConfig),
    [params.document, params.expandedGraph, params.viewConfig],
  );
  const searchViewModel = useMemo(
    () => buildSearchViewModel(
      params.showSearchPanel,
      params.document,
      params.searchQuery,
      params.searchSortField,
      params.searchSortDirection,
      params.searchFilters,
    ),
    [params.document, params.searchFilters, params.searchQuery, params.searchSortDirection, params.searchSortField, params.showSearchPanel],
  );
  const diagnosticsViewModel = useMemo<DiagnosticsViewModel>(
    () => ({
      report: params.document ? analyzeGeneaDocument(params.document) : null,
      parseErrors: params.parseErrors,
      parseWarnings: params.parseWarnings,
    }),
    [params.document, params.parseErrors, params.parseWarnings],
  );
  const globalStatsViewModel = useMemo(
    () => ({
      hasDocument: Boolean(params.document),
      visiblePersonIds,
      getStats: (scope: "all" | "visible") => calculateGlobalStatistics(params.document!, scope, visiblePersonIds),
    }),
    [params.document, visiblePersonIds],
  );
  const personStatsViewModel = useMemo(
    () => buildPersonStatsViewModel(params.document, params.showPersonStatsPersonId),
    [params.document, params.showPersonStatsPersonId],
  );
  const personWorkspaceViewModel = useMemo<PersonWorkspaceViewModel | null>(
    () => buildPersonWorkspaceViewModel(params.document, params.aiSettings, params.workspacePersonId),
    [params.aiSettings, params.document, params.workspacePersonId],
  );
  const personWorkspaceViewModelV3 = useMemo<PersonWorkspaceViewModel | null>(
    () => buildPersonWorkspaceViewModel(params.document, params.aiSettings, params.workspacePersonIdV3),
    [params.aiSettings, params.document, params.workspacePersonIdV3],
  );
  const personEditorViewModel = useMemo(
    () => buildPersonEditorViewModel(params.document, params.aiSettings, params.personDetailModal),
    [params.aiSettings, params.document, params.personDetailModal],
  );
  const importReviewViewModel = useMemo(
    () => buildImportReviewViewModel(params.document, params.importIncomingDoc, params.mergeDraft),
    [params.document, params.importIncomingDoc, params.mergeDraft],
  );
  const aiAssistantViewModel = useMemo(
    () => buildAiAssistantViewModel(params.showAiAssistantModal, params.aiContext, params.document, params.aiSettings),
    [params.aiContext, params.aiSettings, params.document, params.showAiAssistantModal],
  );
  const personPickerViewModel = useMemo(
    () => buildPersonPickerViewModel(params.document, params.picker),
    [params.document, params.picker],
  );
  const branchExportViewModel = useMemo(
    () => buildBranchExportViewModel(params.document, params.branchAnchorId),
    [params.document, params.branchAnchorId],
  );

  return {
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
  };
}
