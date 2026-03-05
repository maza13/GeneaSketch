import type {
    ActiveOverlay,
    ExpandedGraph,
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
import type { GSchemaGraph } from "@/core/gschema";
import type { GraphPayload, ReadModelMode, RecentPayloadV2 } from "@/core/read-model/types";

export type RightStackState = {
    detailsMode: "expanded" | "compact";
    timelineMode: "expanded" | "compact";
    detailsAutoCompactedByTimeline?: boolean;
};
import type { AiSettings } from "@/types/ai";
import type { MergeDraftSnapshot } from "@/types/merge-draft";
import { PersonPatch, PersonInput } from "@/core/engine/GeneaEngine";

export interface DocSlice {
    /**
     * The GSchema graph engine — the new source of truth for 0.4.0+.
     * When null, the app is operating in legacy-only mode (pre-0.4.0 files) - wait, now it's the ONLY mode.
     */
    gschemaGraph: GSchemaGraph | null;
    graphRevision: number;
    xrefToUid?: Record<string, string>;
    uidToXref?: Record<string, string>;
    expandedGraph: ExpandedGraph;

    // Core state loader
    loadGraph: (payload: GraphPayload) => void;
    createNewTreeDoc: () => void;

    // Mutations
    updatePersonById: (personId: string, patch: PersonPatch) => void;
    updateSelectedPerson: (patch: PersonPatch) => void;
    createStandalonePerson: (input: PersonInput) => void;
    createPersonRecord: (input: PersonInput) => string | null;
    updateFamilyById: (familyId: string, patch: any) => void; // Using any for FamilyPatch for now
    linkExistingRelation: (anchorId: string, existingPersonId: string, type: PendingRelationType) => void;
    unlinkRelation: (personId: string, relatedId: string, type: "parent" | "child" | "spouse") => void;
    addRelationFromAnchor: (anchorId: string, type: PendingRelationType, input: PersonInput, targetFamilyId?: string) => void;
    addRelationFromSelected: (type: PendingRelationType, input: PersonInput, targetFamilyId?: string) => void;
    updateNoteRecord: (noteId: string, text: string) => void;
}

export interface ViewSlice {
    readModelMode: ReadModelMode;
    viewConfig: ViewConfig | null;
    visualConfig: VisualConfig;
    selectedPersonId: string | null;
    fitNonce: number;
    setReadModelMode: (mode: ReadModelMode) => void;
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
    setDTreeLayoutEngine: (engine: "vnext") => void;
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
    recentPayloads: Record<string, RecentPayloadV2>;
    isRestoring: boolean;
    inspectPerson: (personId: string | null) => void;
    goBack: () => void;
    goForward: () => void;
    setParseErrors: (errors: string[]) => void;
    setParseWarnings: (warnings: string[]) => void;
    addRecentFile: (entry: Omit<RecentFileEntry, "id" | "lastUsedAt">, payload: RecentPayloadV2) => string;
    removeRecentFile: (id: string) => void;
    clearRecentFiles: () => void;
    openRecentFile: (id: string) => { entry: RecentFileEntry, payload: RecentPayloadV2 } | null;
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
