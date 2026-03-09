import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { GraphDocument } from "@/core/read-model/types";
import type { AiSettings } from "@/types/ai";
import type { MergeDraftSnapshot } from "@/types/merge-draft";
import type { ExpandedGraph, RecentFileEntry, ViewConfig, VisualConfig } from "@/types/domain";
import type { SearchFilterState, SearchSortDirection, SearchSortField } from "@/ui/search/searchEngine";
import type { useShellFacadeActions } from "./useShellFacadeActions";
import type { GenraphGraph } from "@/core/genraph";
import type {
  AiAssistantViewModel,
  BranchExportViewModel,
  DiagnosticsViewModel,
  GlobalStatsViewModel,
  ImportReviewViewModel,
  LeftPanelViewModel,
  PersonEditorViewModel,
  PersonPickerViewModel,
  PersonStatsViewModel,
  PersonWorkspaceViewModel,
  SearchPanelViewModel,
  SelectedPersonPanelViewModel,
  TimelinePanelViewModel,
} from "./types";

export type ShellFacadeActions = ReturnType<typeof useShellFacadeActions>;

export type ShellFacadeRuntimeParams = {
  document: GraphDocument | null;
  viewConfig: ViewConfig | null;
  selectedPersonId: string | null;
  recentFiles: RecentFileEntry[];
  aiSettings: AiSettings;
  mergeDraft: MergeDraftSnapshot | null;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  actions: ShellFacadeActions;
};

export type ShellSearchRuntime = {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  sortField: SearchSortField;
  setSortField: Dispatch<SetStateAction<SearchSortField>>;
  sortDirection: SearchSortDirection;
  setSortDirection: Dispatch<SetStateAction<SearchSortDirection>>;
  filters: SearchFilterState;
  setFilters: Dispatch<SetStateAction<SearchFilterState>>;
};

export type ShellRuntimeRefs = {
  openFileInputRef: RefObject<HTMLInputElement>;
  importFileInputRef: RefObject<HTMLInputElement>;
  graphSvgRef: MutableRefObject<SVGSVGElement | null>;
};

export type ShellRuntimeServices = {
  refs: ShellRuntimeRefs;
  shellController: ReturnType<typeof import("@/hooks/useAppShellController").useAppShellController>;
  fileLoadRuntime: import("@/hooks/useFileLoadRuntime").FileLoadRuntime;
  gsk: ReturnType<typeof import("@/hooks/useGskFile").useGskFile>;
  ai: ReturnType<typeof import("@/hooks/useAiAssistant").useAiAssistant>;
};

export type ShellFacadeRuntime = ShellRuntimeServices & {
  menu: ReturnType<typeof import("@/hooks/useMenuConfig").useMenuConfig>;
  search: ShellSearchRuntime;
};

export type ShellFeatureCompositionParams = {
  document: GraphDocument | null;
  state: {
    viewConfig: ViewConfig | null;
    visualConfig: VisualConfig;
    expandedGraph: ExpandedGraph;
    selectedPersonId: string | null;
    fitNonce: number;
    bootStatus: "checking" | "restoring" | "ready";
    restoreNoticeVisible: boolean;
    parseErrors: string[];
    parseWarnings: string[];
    aiSettings: AiSettings;
    mergeDraft: MergeDraftSnapshot | null;
    genraphGraph: GenraphGraph | null;
  };
  actions: ShellFacadeActions;
  runtime: ShellFacadeRuntime;
  sessionFlow: {
    restoreBanner: {
      visible: boolean;
      message: string;
      onDismiss: () => void;
      onStartFresh: () => Promise<void>;
    };
  };
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  visiblePersonIds: string[];
  normalizedKindraConfig: NonNullable<ViewConfig["kindra"]> | undefined;
  leftPanelViewModel: LeftPanelViewModel;
  selectedPersonPanelViewModel: SelectedPersonPanelViewModel;
  timelineViewModel: TimelinePanelViewModel;
  searchViewModel: SearchPanelViewModel;
  diagnosticsViewModel: DiagnosticsViewModel;
  globalStatsViewModel: GlobalStatsViewModel;
  personStatsViewModel: PersonStatsViewModel;
  personWorkspaceViewModelV3: PersonWorkspaceViewModel | null;
  personEditorViewModel: PersonEditorViewModel;
  importReviewViewModel: ImportReviewViewModel;
  aiAssistantViewModel: AiAssistantViewModel;
  personPickerViewModel: PersonPickerViewModel | null;
  branchExportViewModel: BranchExportViewModel | null;
};
