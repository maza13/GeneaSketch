import { create } from "zustand";
import {
  addRelation,
  createNewTree,
  createPerson,
  linkExistingRelation,
  unlinkChild,
  unlinkParent,
  unlinkSpouse,
  updateFamily,
  updatePerson,
  type FamilyPatch
} from "@/core/edit/commands";
import { sanitizeMergeDraftSnapshot } from "@/core/edit/mergeDraftValidation";
import { createDefaultAiSettings } from "@/core/ai/defaults";
import { expandGraph } from "@/core/graph/expand";
import { SessionService } from "@/io/sessionService";
import type { AiModelCatalogEntry, AiSettings } from "@/types/ai";
import type { MergeDraftSnapshot } from "@/types/merge-draft";
import type {
  ActiveOverlay,
  ExpandedGraph,
  GeneaDocument,
  OverlayType,
  PendingRelationType,
  RecentFileEntry,
  RightPanelView,
  SessionSnapshot,
  TimelineScope,
  TimelineViewMode,
  ViewConfig,
  ViewMode,
  VisualConfig
} from "@/types/domain";

type PersonInput = {
  name: string;
  surname?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  residence?: string;
  sex?: "M" | "F" | "U";
  lifeStatus?: "alive" | "deceased";
  photoDataUrl?: string | null;
};

type PersonPatch = {
  name?: string;
  surname?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  residence?: string;
  isPlaceholder?: boolean;
  sex?: "M" | "F" | "U";
  lifeStatus?: "alive" | "deceased";
  photoDataUrl?: string | null;
};

type LegacyViewConfigLike = Partial<ViewConfig> & {
  include?: { spouses?: boolean };
};

type AppState = {
  document: GeneaDocument | null;
  viewConfig: ViewConfig | null;
  visualConfig: VisualConfig;
  expandedGraph: ExpandedGraph;
  selectedPersonId: string | null;
  focusHistory: string[];
  focusIndex: number;
  fitNonce: number;
  restoreAvailable: boolean;
  parseErrors: string[];
  parseWarnings: string[];
  recentFiles: RecentFileEntry[];
  recentPayloads: Record<string, GeneaDocument>;
  mergeDraft: MergeDraftSnapshot | null;
  aiSettings: AiSettings;
  setDocument: (doc: GeneaDocument) => void;
  applyDiagnosticDocument: (nextDoc: GeneaDocument) => void;
  createNewTreeDoc: () => void;
  setSelectedPerson: (personId: string | null) => void;
  inspectPerson: (personId: string | null) => void;
  setFocusFamilyId: (familyId: string | null) => void;
  updatePersonById: (personId: string, patch: PersonPatch) => void;
  updateSelectedPerson: (patch: PersonPatch) => void;
  createStandalonePerson: (input: PersonInput) => void;
  createPersonRecord: (input: PersonInput) => string | null;
  updateFamilyById: (familyId: string, patch: FamilyPatch) => void;
  linkExistingRelation: (anchorId: string, existingPersonId: string, type: PendingRelationType) => void;
  unlinkRelation: (personId: string, relatedId: string, type: "parent" | "child" | "spouse") => void;
  addRelationFromAnchor: (anchorId: string, type: PendingRelationType, input: PersonInput, targetFamilyId?: string) => void;
  addRelationFromSelected: (type: PendingRelationType, input: PersonInput, targetFamilyId?: string) => void;
  setMode: (mode: ViewMode) => void;
  setPreset: (preset: ViewConfig["preset"]) => void;
  setDepth: (kind: keyof ViewConfig["depth"], depth: number) => void;
  setInclude: (key: "spouses", value: boolean) => void;
  setRightPanelView: (view: RightPanelView) => void;
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
  setDTreeLayoutEngine: (engine: "legacy" | "vnext" | "v2") => void;
  toggleDTreeNodeCollapse: (nodeId: string) => void;
  setOverlay: (overlay: ActiveOverlay) => void;
  removeOverlay: (id: string) => void;
  clearOverlayType: (type: OverlayType) => void;
  clearAllOverlays: () => void;
  goBack: () => void;
  goForward: () => void;
  fitToScreen: () => void;
  setParseErrors: (errors: string[]) => void;
  setParseWarnings: (warnings: string[]) => void;
  addRecentFile: (entry: Omit<RecentFileEntry, "id" | "lastUsedAt">, payload: GeneaDocument) => string;
  removeRecentFile: (id: string) => void;
  clearRecentFiles: () => void;
  openRecentFile: (id: string) => { entry: RecentFileEntry; payload: GeneaDocument } | null;
  setMergeDraft: (draft: MergeDraftSnapshot | null) => void;
  clearMergeDraft: () => void;
  setAiSettings: (settings: Partial<AiSettings>) => void;
  saveAutosessionNow: () => Promise<void>;
  checkRestoreAvailability: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearSession: () => Promise<void>;
};

function defaultViewConfig(focusPersonId: string): ViewConfig {
  return {
    mode: "tree",
    preset: "all_direct_ancestors",
    focusPersonId,
    focusFamilyId: null,
    homePersonId: focusPersonId,
    rightPanelView: "details",
    timeline: { scope: "visible", view: "list", scaleZoom: 1, scaleOffset: 0 },
    depth: { ancestors: 5, descendants: 3, unclesGreatUncles: 0, siblingsNephews: 0, unclesCousins: 0 },
    showSpouses: true,
    dtree: { isVertical: true, layoutEngine: "vnext", collapsedNodeIds: [], overlays: [] }
  };
}

function defaultVisualConfig(): VisualConfig {
  return { nodePositions: {}, gridEnabled: false, gridSize: 20, canonicalOverrides: {} };
}

function ensureExpanded(document: GeneaDocument | null, viewConfig: ViewConfig | null): ExpandedGraph {
  if (!document || !viewConfig) return { nodes: [], edges: [] };
  return expandGraph(document, viewConfig);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeTimelineOverlay(overlay: ActiveOverlay): ActiveOverlay {
  if (overlay.type !== "timeline") return overlay;
  const config = { ...(overlay.config || {}) };
  if (config.year === undefined && typeof config.currentYear === "number") config.year = config.currentYear;
  delete config.currentYear;
  if (!Array.isArray(config.eventPersonIds)) config.eventPersonIds = [];
  return { ...overlay, config };
}

function normalizeLegacyDocumentFields(document: GeneaDocument | null): GeneaDocument | null {
  if (!document) return null;
  const next = structuredClone(document) as GeneaDocument;
  for (const person of Object.values(next.persons)) {
    if (!person.sex) person.sex = "U";
    if (!person.lifeStatus) person.lifeStatus = "alive";
    if (!Array.isArray(person.events)) person.events = [];
    if (!Array.isArray(person.famc)) person.famc = [];
    if (!Array.isArray(person.fams)) person.fams = [];
    if (!Array.isArray(person.mediaRefs)) person.mediaRefs = [];
    if (!Array.isArray(person.sourceRefs)) person.sourceRefs = [];
  }
  for (const family of Object.values(next.families)) {
    if (!Array.isArray(family.childrenIds)) family.childrenIds = [];
    if (!Array.isArray(family.events)) family.events = [];
  }
  if (!next.metadata) next.metadata = { sourceFormat: "GED", gedVersion: "7.0.x" };
  if (!next.metadata.sourceFormat) next.metadata.sourceFormat = "GED";
  if (!next.metadata.gedVersion) next.metadata.gedVersion = "7.0.x";
  return next;
}

function normalizeLegacyViewConfig(raw: ViewConfig | LegacyViewConfigLike | null | undefined, fallbackFocus: string | null): ViewConfig | null {
  if (!raw && !fallbackFocus) return null;
  const defaults = defaultViewConfig(fallbackFocus || raw?.focusPersonId || raw?.homePersonId || "@I1@");
  if (!raw) return defaults;
  const showSpouses =
    typeof raw.showSpouses === "boolean" ? raw.showSpouses : typeof raw.include?.spouses === "boolean" ? raw.include.spouses : defaults.showSpouses;
  const depth = { ...defaults.depth, ...(raw.depth || {}) };
  const dtree = raw.dtree || defaults.dtree!;
  const overlays = (dtree.overlays || []).map((overlay) => normalizeTimelineOverlay({ ...overlay }));
  const focusPersonId = raw.focusPersonId || fallbackFocus || defaults.focusPersonId;
  const safeHomePersonId = raw.homePersonId || focusPersonId || defaults.homePersonId;
  return {
    mode: raw.mode || defaults.mode,
    preset: raw.preset || defaults.preset,
    focusPersonId,
    focusFamilyId: raw.focusFamilyId ?? null,
    homePersonId: safeHomePersonId,
    rightPanelView: raw.rightPanelView || defaults.rightPanelView,
    timeline: { ...defaults.timeline, ...(raw.timeline || {}) },
    depth: {
      ancestors: clamp(Number(depth.ancestors || defaults.depth.ancestors), 0, 10),
      descendants: clamp(Number(depth.descendants || defaults.depth.descendants), 0, 10),
      unclesGreatUncles: clamp(Number(depth.unclesGreatUncles || 0), 0, 10),
      siblingsNephews: clamp(Number(depth.siblingsNephews || 0), 0, 10),
      unclesCousins: clamp(Number(depth.unclesCousins || 0), 0, 10)
    },
    showSpouses,
    dtree: {
      isVertical: dtree.isVertical ?? defaults.dtree!.isVertical,
      layoutEngine: dtree.layoutEngine || defaults.dtree!.layoutEngine,
      collapsedNodeIds: asStringArray(dtree.collapsedNodeIds),
      overlays
    }
  };
}

function chooseProviderModel(catalog: AiModelCatalogEntry[], current: string): string {
  if (catalog.some((entry) => entry.id === current)) return current;
  const recommended = catalog.find((entry) => entry.recommended)?.id;
  if (recommended) return recommended;
  return catalog[0]?.id || current;
}

function normalizeAiSettings(base: AiSettings): AiSettings {
  const next: AiSettings = {
    ...base,
    fallbackEnabled: base.fallbackEnabled !== false,
    deterministicMode: base.deterministicMode !== false,
    providerModels: { ...base.providerModels },
    useCaseModels: {
      extraction: { ...base.useCaseModels.extraction },
      resolution: { ...base.useCaseModels.resolution },
      narration: { ...base.useCaseModels.narration }
    },
    modelCatalog: {
      chatgpt: [...(base.modelCatalog.chatgpt || [])],
      gemini: [...(base.modelCatalog.gemini || [])]
    }
  };
  next.providerModels.chatgpt = chooseProviderModel(next.modelCatalog.chatgpt, next.providerModels.chatgpt);
  next.providerModels.gemini = chooseProviderModel(next.modelCatalog.gemini, next.providerModels.gemini);
  (["extraction", "resolution", "narration"] as const).forEach((useCase) => {
    const model = next.useCaseModels[useCase];
    const provider = model?.provider || "chatgpt";
    const fallbackModel = provider === "chatgpt" ? next.providerModels.chatgpt : next.providerModels.gemini;
    const catalog = provider === "chatgpt" ? next.modelCatalog.chatgpt : next.modelCatalog.gemini;
    next.useCaseModels[useCase] = {
      provider,
      model: chooseProviderModel(catalog, model?.model || fallbackModel)
    };
  });
  return next;
}

function mergeAiSettings(prev: AiSettings, patch: Partial<AiSettings>): AiSettings {
  const merged: AiSettings = {
    ...prev,
    ...patch,
    providerModels: { ...prev.providerModels, ...(patch.providerModels || {}) },
    useCaseModels: { ...prev.useCaseModels, ...(patch.useCaseModels || {}) },
    modelCatalog: { ...prev.modelCatalog, ...(patch.modelCatalog || {}) },
    tokenLimits: { ...prev.tokenLimits, ...(patch.tokenLimits || {}) },
    retryPolicy: { ...prev.retryPolicy, ...(patch.retryPolicy || {}) },
    costFlags: { ...prev.costFlags, ...(patch.costFlags || {}) }
  };
  return normalizeAiSettings(merged);
}

function overlaysEqual(left: ActiveOverlay, right: ActiveOverlay): boolean {
  if (left.id !== right.id || left.type !== right.type || left.priority !== right.priority) return false;
  return JSON.stringify(left.config || {}) === JSON.stringify(right.config || {});
}

function withoutTransientOverlays(viewConfig: ViewConfig | null): ViewConfig | null {
  if (!viewConfig?.dtree?.overlays?.length) return viewConfig;
  const overlays = viewConfig.dtree.overlays;
  const filtered = overlays.filter((overlay) => overlay.type !== "merge_focus");
  if (filtered.length === overlays.length) return viewConfig;
  return { ...viewConfig, dtree: { ...viewConfig.dtree, overlays: filtered } };
}

function normalizeVisualConfig(value: VisualConfig | null | undefined): VisualConfig {
  return { ...defaultVisualConfig(), ...(value || {}), nodePositions: value?.nodePositions || {}, canonicalOverrides: value?.canonicalOverrides || {} };
}

function withFocusHistory(state: AppState, personId: string | null): { focusHistory: string[]; focusIndex: number } {
  if (!personId) return { focusHistory: state.focusHistory, focusIndex: state.focusIndex };
  const history = state.focusHistory.slice(0, state.focusIndex + 1);
  if (history[history.length - 1] === personId) return { focusHistory: state.focusHistory, focusIndex: state.focusIndex };
  history.push(personId);
  return { focusHistory: history, focusIndex: history.length - 1 };
}

function newRecentId(): string {
  return `recent_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

const initialDoc = createNewTree();
const initialFocus = Object.keys(initialDoc.persons)[0] || "@I1@";
const initialView = defaultViewConfig(initialFocus);

export const useAppStore = create<AppState>((set, get) => ({
  document: initialDoc,
  viewConfig: initialView,
  visualConfig: defaultVisualConfig(),
  expandedGraph: ensureExpanded(initialDoc, initialView),
  selectedPersonId: initialFocus,
  focusHistory: [initialFocus],
  focusIndex: 0,
  fitNonce: 0,
  restoreAvailable: false,
  parseErrors: [],
  parseWarnings: [],
  recentFiles: [],
  recentPayloads: {},
  mergeDraft: null,
  aiSettings: createDefaultAiSettings(),

  setDocument: (doc) =>
    set((state) => {
      const normalizedDoc = normalizeLegacyDocumentFields(doc);
      const firstPerson = normalizedDoc ? Object.keys(normalizedDoc.persons)[0] || null : null;
      const selectedPersonId =
        (state.selectedPersonId && normalizedDoc?.persons[state.selectedPersonId] ? state.selectedPersonId : null) || firstPerson;
      const nextView = normalizeLegacyViewConfig(state.viewConfig, selectedPersonId);
      const viewConfig = nextView ? { ...nextView, focusPersonId: selectedPersonId } : null;
      return {
        document: normalizedDoc,
        selectedPersonId,
        viewConfig,
        expandedGraph: ensureExpanded(normalizedDoc, viewConfig),
        focusHistory: selectedPersonId ? [selectedPersonId] : [],
        focusIndex: selectedPersonId ? 0 : -1
      };
    }),

  applyDiagnosticDocument: (nextDoc) =>
    set((state) => {
      const normalizedDoc = normalizeLegacyDocumentFields(nextDoc);
      return {
        document: normalizedDoc,
        expandedGraph: ensureExpanded(normalizedDoc, state.viewConfig)
      };
    }),

  createNewTreeDoc: () => {
    const nextDoc = createNewTree();
    const focus = Object.keys(nextDoc.persons)[0] || "@I1@";
    const viewConfig = defaultViewConfig(focus);
    set({
      document: nextDoc,
      viewConfig,
      visualConfig: defaultVisualConfig(),
      selectedPersonId: focus,
      focusHistory: [focus],
      focusIndex: 0,
      expandedGraph: ensureExpanded(nextDoc, viewConfig),
      parseErrors: [],
      parseWarnings: [],
      mergeDraft: null
    });
  },

  setSelectedPerson: (personId) =>
    set((state) => {
      if (!state.document) return {};
      if (personId && !state.document.persons[personId]) return {};
      const viewConfig = state.viewConfig ? { ...state.viewConfig, focusPersonId: personId } : null;
      return {
        selectedPersonId: personId,
        viewConfig,
        expandedGraph: ensureExpanded(state.document, viewConfig),
        ...withFocusHistory(state, personId)
      };
    }),

  inspectPerson: (personId) => get().setSelectedPerson(personId),

  setFocusFamilyId: (familyId) =>
    set((state) => {
      if (!state.viewConfig) return {};
      const viewConfig = { ...state.viewConfig, focusFamilyId: familyId };
      return {
        viewConfig,
        expandedGraph: ensureExpanded(state.document, viewConfig)
      };
    }),

  updatePersonById: (personId, patch) =>
    set((state) => {
      if (!state.document) return {};
      const nextDoc = updatePerson(state.document, personId, patch);
      return {
        document: nextDoc,
        expandedGraph: ensureExpanded(nextDoc, state.viewConfig)
      };
    }),

  updateSelectedPerson: (patch) => {
    const selectedPersonId = get().selectedPersonId;
    if (!selectedPersonId) return;
    get().updatePersonById(selectedPersonId, patch);
  },

  createStandalonePerson: (input) =>
    set((state) => {
      if (!state.document) return {};
      const created = createPerson(state.document, input);
      return {
        document: created.next,
        selectedPersonId: created.personId,
        expandedGraph: ensureExpanded(created.next, state.viewConfig)
      };
    }),

  createPersonRecord: (input) => {
    const state = get();
    if (!state.document) return null;
    const created = createPerson(state.document, input);
    set({
      document: created.next,
      expandedGraph: ensureExpanded(created.next, state.viewConfig)
    });
    return created.personId;
  },

  updateFamilyById: (familyId, patch) =>
    set((state) => {
      if (!state.document) return {};
      const nextDoc = updateFamily(state.document, familyId, patch);
      return {
        document: nextDoc,
        expandedGraph: ensureExpanded(nextDoc, state.viewConfig)
      };
    }),

  linkExistingRelation: (anchorId, existingPersonId, type) =>
    set((state) => {
      if (!state.document) return {};
      const nextDoc = linkExistingRelation(state.document, anchorId, existingPersonId, type);
      return {
        document: nextDoc,
        expandedGraph: ensureExpanded(nextDoc, state.viewConfig)
      };
    }),

  unlinkRelation: (personId, relatedId, type) =>
    set((state) => {
      if (!state.document) return {};
      const nextDoc =
        type === "parent"
          ? unlinkParent(state.document, personId, relatedId)
          : type === "child"
          ? unlinkChild(state.document, personId, relatedId)
          : unlinkSpouse(state.document, personId, relatedId);
      return {
        document: nextDoc,
        expandedGraph: ensureExpanded(nextDoc, state.viewConfig)
      };
    }),

  addRelationFromAnchor: (anchorId, type, input, targetFamilyId) =>
    set((state) => {
      if (!state.document) return {};
      const created = addRelation(state.document, anchorId, type, input, targetFamilyId);
      return {
        document: created.next,
        selectedPersonId: created.personId,
        expandedGraph: ensureExpanded(created.next, state.viewConfig)
      };
    }),

  addRelationFromSelected: (type, input, targetFamilyId) => {
    const state = get();
    if (!state.selectedPersonId) return;
    state.addRelationFromAnchor(state.selectedPersonId, type, input, targetFamilyId);
  },

  setMode: (mode) =>
    set((state) => {
      if (!state.viewConfig) return {};
      const viewConfig = { ...state.viewConfig, mode };
      return { viewConfig, expandedGraph: ensureExpanded(state.document, viewConfig) };
    }),

  setPreset: (preset) =>
    set((state) => {
      if (!state.viewConfig) return {};
      const viewConfig = { ...state.viewConfig, preset };
      return { viewConfig, expandedGraph: ensureExpanded(state.document, viewConfig) };
    }),

  setDepth: (kind, depth) =>
    set((state) => {
      if (!state.viewConfig) return {};
      const nextDepth = { ...state.viewConfig.depth, [kind]: depth };
      if (kind === "unclesGreatUncles" && depth === 0) nextDepth.unclesCousins = 0;
      if (kind === "unclesCousins" && depth > 0 && nextDepth.unclesGreatUncles === 0) nextDepth.unclesGreatUncles = 1;
      const viewConfig = { ...state.viewConfig, depth: nextDepth };
      return { viewConfig, expandedGraph: ensureExpanded(state.document, viewConfig) };
    }),

  setInclude: (_key, value) =>
    set((state) => {
      if (!state.viewConfig) return {};
      const viewConfig = { ...state.viewConfig, showSpouses: value };
      return { viewConfig, expandedGraph: ensureExpanded(state.document, viewConfig) };
    }),

  setRightPanelView: (view) =>
    set((state) => (state.viewConfig ? { viewConfig: { ...state.viewConfig, rightPanelView: view } } : {})),

  setTimelineScope: (scope) =>
    set((state) =>
      state.viewConfig
        ? { viewConfig: { ...state.viewConfig, timeline: { ...state.viewConfig.timeline, scope } } }
        : {}
    ),

  setTimelineView: (view) =>
    set((state) =>
      state.viewConfig ? { viewConfig: { ...state.viewConfig, timeline: { ...state.viewConfig.timeline, view } } } : {}
    ),

  setTimelineScaleZoom: (zoom) =>
    set((state) =>
      state.viewConfig
        ? { viewConfig: { ...state.viewConfig, timeline: { ...state.viewConfig.timeline, scaleZoom: zoom } } }
        : {}
    ),

  setTimelineScaleOffset: (offset) =>
    set((state) =>
      state.viewConfig
        ? { viewConfig: { ...state.viewConfig, timeline: { ...state.viewConfig.timeline, scaleOffset: offset } } }
        : {}
    ),

  setTimelineStatus: (livingIds, deceasedIds, year, eventPersonIds = []) =>
    set((state) => {
      if (!state.viewConfig?.dtree) return {};
      const overlays = state.viewConfig.dtree.overlays || [];
      const nextOverlay: ActiveOverlay = {
        id: "timeline-status",
        type: "timeline",
        priority: 60,
        config: { livingIds, deceasedIds, year, eventPersonIds }
      };
      const index = overlays.findIndex((overlay) => overlay.id === nextOverlay.id);
      if (index >= 0 && overlaysEqual(overlays[index], nextOverlay)) return {};
      const nextOverlays =
        index >= 0
          ? overlays.map((overlay, itemIndex) => (itemIndex === index ? nextOverlay : overlay))
          : [...overlays, nextOverlay];
      return {
        viewConfig: {
          ...state.viewConfig,
          dtree: { ...state.viewConfig.dtree, overlays: nextOverlays }
        }
      };
    }),

  setNodePosition: (nodeId, x, y) =>
    set((state) => ({
      visualConfig: {
        ...state.visualConfig,
        nodePositions: { ...state.visualConfig.nodePositions, [nodeId]: { x, y } }
      }
    })),

  clearNodePositions: () =>
    set((state) => ({
      visualConfig: { ...state.visualConfig, nodePositions: {} }
    })),

  setGridEnabled: (enabled) =>
    set((state) => ({
      visualConfig: { ...state.visualConfig, gridEnabled: enabled }
    })),

  setGridSize: (size) =>
    set((state) => ({
      visualConfig: { ...state.visualConfig, gridSize: size }
    })),

  setDTreeOrientation: (isVertical) =>
    set((state) =>
      state.viewConfig?.dtree
        ? { viewConfig: { ...state.viewConfig, dtree: { ...state.viewConfig.dtree, isVertical } } }
        : {}
    ),

  setDTreeLayoutEngine: (engine) =>
    set((state) =>
      state.viewConfig?.dtree
        ? { viewConfig: { ...state.viewConfig, dtree: { ...state.viewConfig.dtree, layoutEngine: engine } } }
        : {}
    ),

  toggleDTreeNodeCollapse: (nodeId) =>
    set((state) => {
      if (!state.viewConfig?.dtree) return {};
      const current = state.viewConfig.dtree.collapsedNodeIds || [];
      const collapsedNodeIds = current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId];
      return {
        viewConfig: {
          ...state.viewConfig,
          dtree: { ...state.viewConfig.dtree, collapsedNodeIds }
        }
      };
    }),

  setOverlay: (overlay) =>
    set((state) => {
      if (!state.viewConfig?.dtree) return {};
      const normalizedOverlay = normalizeTimelineOverlay(overlay);
      const overlays = state.viewConfig.dtree.overlays || [];
      const index = overlays.findIndex((item) => item.id === normalizedOverlay.id);
      if (index >= 0 && overlaysEqual(overlays[index], normalizedOverlay)) return {};
      const nextOverlays =
        index >= 0
          ? overlays.map((item, itemIndex) => (itemIndex === index ? normalizedOverlay : item))
          : [...overlays, normalizedOverlay];
      return {
        viewConfig: {
          ...state.viewConfig,
          dtree: { ...state.viewConfig.dtree, overlays: nextOverlays }
        }
      };
    }),

  removeOverlay: (id) =>
    set((state) => {
      if (!state.viewConfig?.dtree) return {};
      const overlays = state.viewConfig.dtree.overlays || [];
      if (!overlays.some((overlay) => overlay.id === id)) return {};
      return {
        viewConfig: {
          ...state.viewConfig,
          dtree: { ...state.viewConfig.dtree, overlays: overlays.filter((overlay) => overlay.id !== id) }
        }
      };
    }),

  clearOverlayType: (type) =>
    set((state) => {
      if (!state.viewConfig?.dtree) return {};
      const overlays = state.viewConfig.dtree.overlays || [];
      if (!overlays.some((overlay) => overlay.type === type)) return {};
      return {
        viewConfig: {
          ...state.viewConfig,
          dtree: { ...state.viewConfig.dtree, overlays: overlays.filter((overlay) => overlay.type !== type) }
        }
      };
    }),

  clearAllOverlays: () =>
    set((state) => {
      if (!state.viewConfig?.dtree) return {};
      if ((state.viewConfig.dtree.overlays || []).length === 0) return {};
      return {
        viewConfig: {
          ...state.viewConfig,
          dtree: { ...state.viewConfig.dtree, overlays: [] }
        }
      };
    }),

  goBack: () =>
    set((state) => {
      if (state.focusIndex <= 0 || state.focusHistory.length === 0) return {};
      const focusIndex = state.focusIndex - 1;
      const nextPersonId = state.focusHistory[focusIndex];
      if (!nextPersonId || (state.document && !state.document.persons[nextPersonId])) return { focusIndex };
      const viewConfig = state.viewConfig ? { ...state.viewConfig, focusPersonId: nextPersonId } : state.viewConfig;
      return {
        focusIndex,
        selectedPersonId: nextPersonId,
        viewConfig,
        expandedGraph: ensureExpanded(state.document, viewConfig)
      };
    }),

  goForward: () =>
    set((state) => {
      if (state.focusIndex >= state.focusHistory.length - 1) return {};
      const focusIndex = state.focusIndex + 1;
      const nextPersonId = state.focusHistory[focusIndex];
      if (!nextPersonId || (state.document && !state.document.persons[nextPersonId])) return { focusIndex };
      const viewConfig = state.viewConfig ? { ...state.viewConfig, focusPersonId: nextPersonId } : state.viewConfig;
      return {
        focusIndex,
        selectedPersonId: nextPersonId,
        viewConfig,
        expandedGraph: ensureExpanded(state.document, viewConfig)
      };
    }),

  fitToScreen: () => set((state) => ({ fitNonce: state.fitNonce + 1 })),
  setParseErrors: (errors) => set({ parseErrors: errors }),
  setParseWarnings: (warnings) => set({ parseWarnings: warnings }),

  addRecentFile: (entry, payload) => {
    const id = newRecentId();
    const nextEntry: RecentFileEntry = { ...entry, id, lastUsedAt: new Date().toISOString() };
    set((state) => {
      const deduped = state.recentFiles.filter((item) => !(item.name === entry.name && item.kind === entry.kind));
      return {
        recentFiles: [nextEntry, ...deduped].slice(0, 30),
        recentPayloads: { ...state.recentPayloads, [id]: payload }
      };
    });
    return id;
  },

  removeRecentFile: (id) =>
    set((state) => {
      const nextPayloads = { ...state.recentPayloads };
      delete nextPayloads[id];
      return {
        recentFiles: state.recentFiles.filter((item) => item.id !== id),
        recentPayloads: nextPayloads
      };
    }),

  clearRecentFiles: () => set({ recentFiles: [], recentPayloads: {} }),

  openRecentFile: (id) => {
    const state = get();
    const entry = state.recentFiles.find((item) => item.id === id);
    const payload = state.recentPayloads[id];
    if (!entry || !payload) return null;
    const updated: RecentFileEntry = { ...entry, lastUsedAt: new Date().toISOString() };
    set({ recentFiles: [updated, ...state.recentFiles.filter((item) => item.id !== id)] });
    return { entry: updated, payload };
  },

  setMergeDraft: (draft) => set({ mergeDraft: draft }),
  clearMergeDraft: () => set({ mergeDraft: null }),
  setAiSettings: (settings) => set((state) => ({ aiSettings: mergeAiSettings(state.aiSettings, settings) })),

  saveAutosessionNow: async () => {
    const state = get();
    const snapshot: SessionSnapshot = {
      schemaVersion: 4,
      document: state.document,
      viewConfig: withoutTransientOverlays(state.viewConfig),
      visualConfig: state.visualConfig,
      focusHistory: state.focusHistory,
      focusIndex: state.focusIndex,
      recentFiles: state.recentFiles,
      recentPayloads: state.recentPayloads,
      mergeDraft: state.mergeDraft,
      aiSettings: state.aiSettings
    };
    await SessionService.saveAutosession(snapshot);
  },

  checkRestoreAvailability: async () => {
    const restored = await SessionService.restoreAutosession();
    set({ restoreAvailable: Boolean(restored) });
  },

  restoreSession: async () => {
    const restored = await SessionService.restoreAutosession();
    if (!restored) {
      set({ restoreAvailable: false });
      return;
    }

    const document = normalizeLegacyDocumentFields(restored.document);
    const firstPerson = document ? Object.keys(document.persons)[0] || null : null;
    const viewConfig = normalizeLegacyViewConfig(restored.viewConfig as LegacyViewConfigLike, restored.viewConfig?.focusPersonId || firstPerson);
    const selectedPersonId =
      (viewConfig?.focusPersonId && document?.persons[viewConfig.focusPersonId] ? viewConfig.focusPersonId : firstPerson) || null;

    const validViewConfig = viewConfig && selectedPersonId ? { ...viewConfig, focusPersonId: selectedPersonId } : viewConfig;
    const mergeDraft = sanitizeMergeDraftSnapshot(restored.mergeDraft) || null;
    const aiSettings = mergeAiSettings(createDefaultAiSettings(), restored.aiSettings || {});
    const focusHistory = asStringArray(restored.focusHistory).filter((id) => Boolean(document?.persons[id]));
    const effectiveHistory = focusHistory.length > 0 ? focusHistory : selectedPersonId ? [selectedPersonId] : [];
    const focusIndex = clamp(
      typeof restored.focusIndex === "number" ? restored.focusIndex : effectiveHistory.length - 1,
      effectiveHistory.length > 0 ? 0 : -1,
      effectiveHistory.length > 0 ? effectiveHistory.length - 1 : -1
    );

    set({
      document,
      viewConfig: validViewConfig,
      visualConfig: normalizeVisualConfig(restored.visualConfig),
      selectedPersonId,
      focusHistory: effectiveHistory,
      focusIndex,
      recentFiles: restored.recentFiles || [],
      recentPayloads: restored.recentPayloads || {},
      mergeDraft,
      aiSettings,
      expandedGraph: ensureExpanded(document, validViewConfig),
      restoreAvailable: false
    });
  },

  clearSession: async () => {
    await SessionService.clearAutosession();
    set({ restoreAvailable: false });
  }
}));

