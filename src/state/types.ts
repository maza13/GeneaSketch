import type {
    ActiveOverlay,
    ExpandedGraph,
    GeneaDocument,
    PendingRelationType,
    Preset,
    RecentFileEntry,
    RightPanelView,
    TimelineScope,
    TimelineViewMode,
    ViewConfig,
    ViewMode,
    VisualConfig
} from "@/types/domain";

export type RightStackState = {
    detailsMode: "expanded" | "compact";
    timelineMode: "expanded" | "compact";
    detailsAutoCompactedByTimeline?: boolean;
};
import type { AiSettings } from "@/types/ai";
import type { MergeDraftSnapshot } from "@/types/merge-draft";
import { PersonPatch, PersonInput } from "@/core/engine/GeneaEngine";

export interface DocSlice {
    document: GeneaDocument | null;
    expandedGraph: ExpandedGraph;
    setDocument: (doc: GeneaDocument | null) => void;
    applyDiagnosticDocument: (nextDoc: GeneaDocument) => void;
    createNewTreeDoc: () => void;
    updatePersonById: (personId: string, patch: PersonPatch) => void;
    updateSelectedPerson: (patch: PersonPatch) => void;
    createStandalonePerson: (input: PersonInput) => void;
    createPersonRecord: (input: PersonInput) => string | null;
    updateFamilyById: (familyId: string, patch: any) => void; // Using any for FamilyPatch for now
    linkExistingRelation: (anchorId: string, existingPersonId: string, type: PendingRelationType) => void;
    unlinkRelation: (personId: string, relatedId: string, type: "parent" | "child" | "spouse") => void;
    addRelationFromAnchor: (anchorId: string, type: PendingRelationType, input: PersonInput, targetFamilyId?: string) => void;
    addRelationFromSelected: (type: PendingRelationType, input: PersonInput, targetFamilyId?: string) => void;
}

export interface ViewSlice {
    viewConfig: ViewConfig | null;
    visualConfig: VisualConfig;
    selectedPersonId: string | null;
    fitNonce: number;
    setSelectedPerson: (personId: string | null) => void;
    setFocusFamilyId: (familyId: string | null) => void;
    setMode: (mode: ViewMode) => void;
    setPreset: (preset: Preset) => void;
    setDepth: (kind: keyof ViewConfig["depth"], depth: number) => void;
    setInclude: (k: "spouses", v: boolean) => void;
    setRightPanelView: (view: RightPanelView) => void;
    setShellPanelCollapsed: (side: "left" | "right", collapsed: boolean) => void;
    toggleShellPanel: (side: "left" | "right") => void;
    setLeftSectionState: (patch: Partial<ViewConfig["leftSections"]>) => void;
    toggleLeftSection: (section: "layers" | "treeConfig" | "canvasTools") => void;
    setTimelinePanelOpen: (open: boolean) => void;
    setRightStackState: (patch: Partial<RightStackState>) => void;
    toggleRightStackSection: (section: "details" | "timeline") => void;
    setTimelineScope: (scope: TimelineScope) => void;
    setTimelineView: (view: TimelineViewMode) => void;
    setTimelineScaleZoom: (zoom: number) => void;
    setTimelineScaleOffset: (offset: number) => void;
    setTimelineStatus: (livingIds: string[], deceasedIds: string[], year: number, eventPersonIds?: string[]) => void;
    setNodePosition: (nodeId: string, x: number, y: number) => void;
    clearNodePositions: () => void;
    setGridEnabled: (enabled: boolean) => void;
    setGridSize: (size: number) => void;
    setDTreeOrientation: (isVertical: boolean) => void;
    setDTreeLayoutEngine: (engine: string) => void;
    toggleDTreeNodeCollapse: (nodeId: string) => void;
    setOverlay: (overlay: ActiveOverlay) => void;
    removeOverlay: (id: string) => void;
    clearOverlayType: (type: string) => void;
    clearAllOverlays: () => void;
    clearVisualModes: () => void;
    fitToScreen: () => void;
}

export interface SessionSlice {
    focusHistory: string[];
    focusIndex: number;
    restoreAvailable: boolean;
    parseErrors: string[];
    parseWarnings: string[];
    recentFiles: RecentFileEntry[];
    recentPayloads: Record<string, any>;
    isRestoring: boolean;
    inspectPerson: (personId: string | null) => void;
    goBack: () => void;
    goForward: () => void;
    setParseErrors: (errors: string[]) => void;
    setParseWarnings: (warnings: string[]) => void;
    addRecentFile: (entry: Omit<RecentFileEntry, "id" | "lastUsedAt">, payload: any) => string;
    removeRecentFile: (id: string) => void;
    clearRecentFiles: () => void;
    openRecentFile: (id: string) => { entry: RecentFileEntry, payload: any } | null;
    saveAutosessionNow: () => Promise<void>;
    checkRestoreAvailability: () => Promise<void>;
    restoreSession: () => Promise<void>;
    clearSession: () => Promise<void>;
}

export interface AiSlice {
    aiSettings: AiSettings;
    mergeDraft: MergeDraftSnapshot | null;
    setMergeDraft: (draft: MergeDraftSnapshot | null) => void;
    clearMergeDraft: () => void;
    setAiSettings: (settings: Partial<AiSettings>) => void;
}

export type AppState = DocSlice & ViewSlice & SessionSlice & AiSlice;
