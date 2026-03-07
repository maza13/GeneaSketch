import type { CSSProperties, ChangeEventHandler, RefObject } from "react";
import type { FamilyPatch } from "@/core/edit/commands";
import type { DiagnosticFixAction, DiagnosticFixExecutionResult, DiagnosticFixOption, DiagnosticReport } from "@/core/diagnostics/types";
import type { ExtractDirection } from "@/core/edit/generators";
import type { GlobalStatistics } from "@/core/graph/globalStatistics";
import type { PersonStatistics } from "@/core/graph/statistics";
import type { GraphDocument } from "@/core/read-model/types";
import type { AiSettings, AiInputContext } from "@/types/ai";
import type {
  ExpandedGraph,
  PendingRelationType,
  Person,
  TimelineViewMode,
  ViewConfig,
} from "@/types/domain";
import type {
  ColorThemeConfig,
  NodeInteraction,
  PersonEditorPatch,
  PersonEditorState,
  TimelineItem,
} from "@/types/editor";
import type { MenuGroup, MenuItem } from "@/ui/TopMenuBar";
import type { SearchFilterState, SearchResult, SearchSortDirection, SearchSortField } from "@/ui/search/searchEngine";

export type FeatureDocumentView = GraphDocument;

export type PersonDocumentView = FeatureDocumentView;
export type PersonEditorDocumentView = FeatureDocumentView;
export type PersonWorkspaceDocumentView = FeatureDocumentView;
export type ImportReviewDocumentView = FeatureDocumentView;
export type AiAssistantDocumentView = FeatureDocumentView;

export type BirthRangeRefinementViewModel = {
  documentView: PersonEditorDocumentView;
  personId: string;
  aiSettings: AiSettings;
};

export type PersonIdentitySectionViewModel = {
  person: Person;
  documentView: PersonWorkspaceDocumentView;
};

export type PersonFamiliesSectionViewModel = {
  personId: string;
  documentView: PersonWorkspaceDocumentView;
};

export type PersonEventsSectionViewModel = {
  person: Person;
  documentView: PersonWorkspaceDocumentView;
  aiSettings: AiSettings;
};

export type PersonSectionViewModel = {
  person: Person;
  documentView: PersonWorkspaceDocumentView;
};

export type PersonTimelineSectionViewModel = {
  personId: string;
  documentView: PersonWorkspaceDocumentView;
};

export type PersonWorkspaceSectionModels = {
  identity: PersonIdentitySectionViewModel;
  familyLinks: PersonFamiliesSectionViewModel;
  events: PersonEventsSectionViewModel;
  sources: PersonSectionViewModel;
  notes: PersonSectionViewModel;
  media: PersonSectionViewModel;
  audit: {
    person: Person;
  };
  extensions: PersonSectionViewModel;
  timeline: PersonTimelineSectionViewModel;
  analysis: PersonSectionViewModel;
  history: {
    person: Person;
  };
};

export type RelatedPersonListItem = {
  id: string;
  name: string;
  surname?: string;
  sex: "M" | "F" | "U";
  birthDate?: string;
};

export type SelectedPersonPanelViewModel =
  | {
      kind: "empty";
    }
  | {
      kind: "selected";
      person: {
        id: string;
        name: string;
        sex: "M" | "F" | "U";
        birthDate?: string;
        birthPlace?: string;
        deathDate?: string;
        deathPlace?: string;
        lifeStatus: "alive" | "deceased";
      };
      parents: RelatedPersonListItem[];
      spouses: RelatedPersonListItem[];
      children: RelatedPersonListItem[];
    };

export type LeftPanelViewModel = {
  hasDocument: boolean;
  documentView: PersonDocumentView | null;
  sections: {
    layersOpen: boolean;
    treeConfigOpen: boolean;
    canvasToolsOpen: boolean;
  };
  treeConfig: {
    isVertical: boolean;
    preset: ViewConfig["preset"];
    depth: ViewConfig["depth"];
    showSpouses: boolean;
  } | null;
  canvasTools: {
    gridEnabled: boolean;
    positionCount: number;
  };
};

export type SearchPanelViewModel = {
  open: boolean;
  query: string;
  sortField: SearchSortField;
  sortDirection: SearchSortDirection;
  filters: SearchFilterState;
  results: SearchResult[];
  hasSearchData: boolean;
};

export type TimelinePresenceResult = {
  livingIds: string[];
  deceasedIds: string[];
  eventIds: string[];
  livingCount: number;
  effectiveValue: number;
};

export type TimelinePanelViewModel = {
  isOpen: boolean;
  isExpanded: boolean;
  items: TimelineItem[];
  activeItemId: string | null;
  scopeLabel: string;
  timelineView: TimelineViewMode;
  scaleZoom: number;
  scaleOffset: number;
  bounds: {
    min: number;
    max: number;
  };
};

export type DiagnosticsViewModel = {
  report: DiagnosticReport | null;
  parseErrors: string[];
  parseWarnings: string[];
};

export type GlobalStatsViewModel = {
  hasDocument: boolean;
  visiblePersonIds: string[];
  getStats: (scope: "all" | "visible") => GlobalStatistics;
};

export type PersonStatsViewModel =
  | {
      kind: "empty";
    }
  | {
      kind: "ready";
      personId: string;
      personName: string;
      personSex: "M" | "F" | "U";
      stats: PersonStatistics;
    };

export type PersonEditorViewModel = {
  editorState: PersonEditorState;
  aiSettings: AiSettings;
  documentView: PersonEditorDocumentView | null;
  birthRefinement: BirthRangeRefinementViewModel | null;
  getNameSuggestions: (query: string) => string[];
  getPlaceSuggestions: (query: string) => string[];
  getSurnameSuggestions: (anchorId: string | null, relationType: PendingRelationType | null) => Array<{ paternal: string; maternal: string }>;
};

export type PersonWorkspaceViewModel = {
  personId: string;
  person: Person | null;
  aiSettings: AiSettings;
  documentView: PersonWorkspaceDocumentView;
  sections: PersonWorkspaceSectionModels;
};

export type ImportReviewViewModel = {
  baseDocument: ImportReviewDocumentView | null;
  incomingDocument: ImportReviewDocumentView | null;
  initialDraft: import("@/types/merge-draft").MergeDraftSnapshot | null;
};

export type AiAssistantViewModel = {
  open: boolean;
  context: AiInputContext | null;
  documentView: AiAssistantDocumentView | null;
  settings: AiSettings;
};

export type PersonPickerOption = {
  id: string;
  name: string;
  surname?: string;
  birthDate?: string;
};

export type PersonPickerViewModel = {
  open: boolean;
  anchorId: string;
  relationType: PendingRelationType | "kinship";
  options: PersonPickerOption[];
};

export type BranchExportViewModel = {
  open: boolean;
  personId: string;
  personName: string;
  previews: Record<ExtractDirection, { persons: number; families: number }>;
};

export type ShellChromeFacade = {
  appRootStyle: CSSProperties;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  detailsMode: "expanded" | "compact";
  timelineMode: "expanded" | "compact";
  topbar: {
    menus: MenuGroup[];
    actions: MenuItem[];
    menuLayout: "frequency" | "role" | "hybrid";
    onChangeLayout: (layout: "frequency" | "role" | "hybrid") => void;
  };
  footer: {
    statusMessage: string;
    personCount: number | null;
    familyCount: number | null;
    sourceCount: number | null;
    engineMode: string | null;
    isSaved: boolean;
    appVersion: string;
  };
  leftPanel: {
    viewModel: LeftPanelViewModel;
    commands: {
      onToggleSection: (section: "layers" | "treeConfig" | "canvasTools") => void;
      onSetSections: (patch: Partial<NonNullable<ViewConfig["leftSections"]>>) => void;
      onDTreeOrientation: (isVertical: boolean) => void;
      onPreset: (preset: ViewConfig["preset"]) => void;
      onDepth: (kind: keyof ViewConfig["depth"], depth: number) => void;
      onInclude: (key: "spouses", value: boolean) => void;
      onGridEnabled: (enabled: boolean) => void;
      onClearPositions: () => void;
    };
  };
  rightPanel: {
    viewModel: SelectedPersonPanelViewModel;
    commands: {
      onToggleDetailsExpanded: () => void;
      onEditPerson: (personId: string) => void;
      onViewPersonDetail: (personId: string) => void;
      onAddRelation: (personId: string, type: PendingRelationType) => void;
      onLinkExistingRelation: (anchorId: string, type: PendingRelationType) => void;
      onUnlinkRelation: (personId: string, relatedId: string, type: "parent" | "child" | "spouse") => void;
    };
  };
  colorThemeMenu: {
    open: boolean;
    value: ColorThemeConfig;
    onChange: (next: ColorThemeConfig) => void;
    onReset: () => void;
    onClose: () => void;
  };
  dialogs: {
    about: {
      open: boolean;
      onClose: () => void;
    };
    wiki: {
      open: boolean;
      onClose: () => void;
    };
    familySearch: {
      open: boolean;
      onClose: () => void;
      onImport: () => void;
    };
  };
  shellCommands: {
    onToggleLeft: () => void;
    onToggleRight: () => void;
  };
};

export type ShellNavigationFacade = {
  search: {
    viewModel: SearchPanelViewModel;
    commands: {
      onClose: () => void;
      onSelectPerson: (personId: string) => void;
      onQueryChange: (query: string) => void;
      onSortFieldChange: (field: SearchSortField) => void;
      onSortDirectionToggle: () => void;
      onFiltersChange: (patch: Partial<SearchFilterState>) => void;
      onReset: () => void;
    };
  };
  nodeMenu: {
    state: {
      open: boolean;
      x: number;
      y: number;
      nodeKind: NodeInteraction["nodeKind"];
      title: string;
      items: import("@/ui/NodeActionMenu").NodeActionMenuItem[];
    } | null;
    onClose: () => void;
  };
};

export type ShellWorkspaceFacade = {
  hiddenInputs: {
    openFile: {
      ref: RefObject<HTMLInputElement>;
      onChange: ChangeEventHandler<HTMLInputElement>;
    };
    importFile: {
      ref: RefObject<HTMLInputElement>;
      onChange: ChangeEventHandler<HTMLInputElement>;
    };
  };
  restoreBanner: {
    visible: boolean;
    onRestore: () => Promise<void>;
    onClear: () => Promise<void>;
  };
  exportWarningsBanner: {
    visible: boolean;
    count: number;
    onDismiss: () => void;
  };
  pdfExport: {
    open: boolean;
    options: {
      scope: "viewport" | "full";
      paperSize: "LETTER" | "LEGAL" | "TABLOID" | "A0" | "A1" | "A2" | "A3" | "A4" | "A5" | "CUSTOM";
    };
    onScopeChange: (scope: "viewport" | "full") => void;
    onPaperSizeChange: (size: "LETTER" | "LEGAL" | "TABLOID" | "A0" | "A1" | "A2" | "A3" | "A4" | "A5" | "CUSTOM") => void;
    onExportNow: () => Promise<void | true | undefined>;
    onClose: () => void;
  };
  importReview: {
    open: boolean;
    viewModel: ImportReviewViewModel;
    clearMergeFocus: () => void;
    onDraftChange: (draft: import("@/types/merge-draft").MergeDraftSnapshot | null) => void;
    onFocusChange: (focus: import("@/core/edit/mergeFocus").MergeFocusPayload | null) => void;
    onApply: (merged: ImportReviewDocumentView, stats: { addedPersons: number; updatedPersons: number; addedFamilies: number }) => void;
    onClose: () => void;
    onClearDraft: () => void;
  };
  banners: {
    aiUndo: {
      visible: boolean;
      onUndo: () => void;
    };
    kinship: {
      visible: boolean;
      message: string;
      onDismiss: () => void;
    };
  };
};

export type ShellFeaturesFacade = {
  diagnostics: {
    open: boolean;
    viewModel: DiagnosticsViewModel;
    commands: {
      onClose: () => void;
      onSelectPerson: (personId: string) => void;
      onSelectFamily: (familyId: string) => void;
      onApplyActions: (actions: DiagnosticFixAction[], options: DiagnosticFixOption[]) => DiagnosticFixExecutionResult | null;
      resolveEntityLabel: (entityId: string) => string | undefined;
    };
  };
  globalStats: {
    open: boolean;
    viewModel: GlobalStatsViewModel;
    onClose: () => void;
  };
  personStats: {
    open: boolean;
    viewModel: PersonStatsViewModel;
    onClose: () => void;
  };
  ai: {
    settingsModal: {
      open: boolean;
      settings: AiSettings;
      onSave: (next: Partial<AiSettings>) => void;
      onClose: () => void;
      onStatus: (status: string) => void;
    };
    assistantModal: {
      viewModel: AiAssistantViewModel;
      onClose: () => void;
      onStatus: (status: string) => void;
      onApplyBatch: (nextDoc: AiAssistantDocumentView, summary: string) => void;
      onOpenSettings: () => void;
    };
  };
  personEditor: {
    viewModel: PersonEditorViewModel;
    commands: {
      onClose: () => void;
      onSaveEdit: (personId: string, patch: PersonEditorPatch) => void;
      onSaveRelation: (anchorId: string, type: PendingRelationType, input: import("@/types/editor").PersonRelationInput) => void;
      onCreateStandalone: (input: import("@/types/editor").PersonRelationInput) => void;
    };
  };
  personWorkspace: {
    open: boolean;
    viewModel: PersonWorkspaceViewModel | null;
    commands: {
      onClose: () => void;
      onSelectPerson: (personId: string) => void;
      onSetAsFocus: (personId: string) => void;
      onSavePerson: (personId: string, patch: PersonEditorPatch) => void;
      onSaveFamily: (familyId: string, patch: FamilyPatch) => void;
      onCreatePerson: (input: { name: string; surname?: string; sex?: "M" | "F" | "U"; birthDate?: string; deathDate?: string; lifeStatus?: "alive" | "deceased" }) => string | null;
      onQuickAddRelation: (anchorId: string, relationType: PendingRelationType) => void;
    };
  };
  personWorkspaceV3: {
    open: boolean;
    viewModel: PersonWorkspaceViewModel | null;
    commands: ShellFeaturesFacade["personWorkspace"]["commands"];
  };
  personPicker: {
    viewModel: PersonPickerViewModel | null;
    onLink: (existingPersonId: string) => void;
    onClose: () => void;
  };
  branchExport: {
    viewModel: BranchExportViewModel | null;
    onExport: (direction: ExtractDirection) => void;
    onClose: () => void;
  };
  timeline: {
    viewModel: TimelinePanelViewModel;
    commands: {
      onTimelineView: (view: TimelineViewMode) => void;
      onTimelineScaleZoom: (zoom: number) => void;
      onTimelineScaleOffset: (offset: number) => void;
      onTimelineHighlight: (payload: { sourceItemId: string; primaryPersonId: string | null; secondaryPersonIds: string[] } | null) => void;
      onTimelinePresence: (value: number, mode: "year" | "decade") => TimelinePresenceResult;
      onApplyPresence: (result: TimelinePresenceResult) => void;
      onToggleTimelineExpanded: () => void;
      onClosePanel: () => void;
    };
  };
  canvas: {
    graph: ExpandedGraph;
    documentView: GraphDocument | null;
    fitNonce: number;
    selectedPersonId: string | null;
    focusPersonId: string | null;
    focusFamilyId: string | null;
    colorTheme: ColorThemeConfig;
    dtreeConfig: NonNullable<ViewConfig["dtree"]> | undefined;
    modeBadge: string | null;
    showMockTools: boolean;
    commands: {
      onNodeClick: (interaction: NodeInteraction) => void;
      onNodeContextMenu: (interaction: NodeInteraction) => void;
      onBgClick: () => void;
      onBgDoubleClick: () => void;
      onSvgReady: (svg: SVGSVGElement | null) => void;
    };
  };
};

export type AppShellFacade = {
  chrome: ShellChromeFacade;
  navigation: ShellNavigationFacade;
  workspace: ShellWorkspaceFacade;
  features: ShellFeaturesFacade;
};
