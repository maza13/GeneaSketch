import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { UiEngine } from "@/core/engine/UiEngine";
import { createDefaultAiSettings } from "@/core/ai/defaults";
import type { ActiveOverlay, GeneaDocument } from "@/types/domain";

const mockController = vi.hoisted(() => ({
  colorTheme: {
    background: "transparent",
    personNode: "#111827",
    text: "#f8fafc",
    edges: "#475569",
    nodeFontSize: 18,
    edgeThickness: 2.5,
    nodeWidth: 210,
    nodeHeight: 92,
  },
  menuLayout: "frequency" as const,
  setMenuLayout: vi.fn(),
  showDiagnostics: false,
  setShowDiagnostics: vi.fn(),
  showColorThemeMenu: false,
  setShowColorThemeMenu: vi.fn(),
  showPdfExport: false,
  setShowPdfExport: vi.fn(),
  branchAnchorId: null as string | null,
  setBranchAnchorId: vi.fn(),
  picker: null as { anchorId: string; type: "child" | "kinship" } | null,
  setPicker: vi.fn(),
  pendingKinshipSourceId: null as string | null,
  setPendingKinshipSourceId: vi.fn(),
  personDetailModal: null as any,
  setPersonDetailModal: vi.fn(),
  workspacePersonId: null as string | null,
  setWorkspacePersonId: vi.fn(),
  workspacePersonIdV3: null as string | null,
  setWorkspacePersonIdV3: vi.fn(),
  nodeMenuState: null as any,
  setNodeMenu: vi.fn(),
  showPersonStatsPersonId: null as string | null,
  setShowPersonStatsPersonId: vi.fn(),
  showGlobalStatsPanel: false,
  setShowGlobalStatsPanel: vi.fn(),
  showAboutModalV3: false,
  setShowAboutModalV3: vi.fn(),
  showWikiPanel: false,
  setShowWikiPanel: vi.fn(),
  showFamilySearchPanel: false,
  setShowFamilySearchPanel: vi.fn(),
  showMockTools: false,
  setShowMockTools: vi.fn(),
  showSearchPanel: false,
  setShowSearchPanel: vi.fn(),
  themeMode: "dark" as const,
  setThemeMode: vi.fn(),
  clearMergeFocusOverlay: vi.fn(),
  openPersonEditor: vi.fn(),
  openAddRelationEditor: vi.fn(),
  focusPersonInCanvas: vi.fn(),
  handleMergeFocusChange: vi.fn(),
  generateScenario: vi.fn(),
  handleTimelineHighlight: vi.fn(),
  handleNodeClick: vi.fn(),
  handleNodeContextMenu: vi.fn(),
  setColorTheme: vi.fn(),
}));

const mockGskFile = vi.hoisted(() => ({
  status: "Listo",
  setStatus: vi.fn(),
  exportWarnings: [] as string[],
  setExportWarnings: vi.fn(),
  importIncomingDoc: null as GeneaDocument | null,
  setImportIncomingDoc: vi.fn(),
  pdfOptions: { scope: "viewport" as const, paperSize: "A4" as const },
  setPdfOptions: vi.fn(),
  openAndReplace: vi.fn(),
  importForMerge: vi.fn(),
  saveGsk: vi.fn(),
  exportGed: vi.fn(),
  exportBranchGsk: vi.fn(),
  exportRaster: vi.fn(),
  exportPdfNow: vi.fn(),
  openRecentItem: vi.fn(),
  handleMergeApply: vi.fn(),
}));

const mockAiAssistant = vi.hoisted(() => ({
  showAiAssistantModal: false,
  setShowAiAssistantModal: vi.fn(),
  showAiSettingsModal: false,
  setShowAiSettingsModal: vi.fn(),
  aiContext: null as any,
  aiUndoSnapshot: null as GeneaDocument | null,
  openGlobalAiAssistant: vi.fn(),
  openLocalAiAssistant: vi.fn(),
  applyAiBatch: vi.fn(),
  undoAiBatch: vi.fn(),
}));

const mockMenuConfig = vi.hoisted(() => ({
  menus: [],
  actions: [],
}));

const fakeState = vi.hoisted(() => ({ current: {} as any }));

vi.mock("@/hooks/useAppShellController", () => ({
  DEFAULT_COLOR_THEME: mockController.colorTheme,
  useAppShellController: () => mockController,
}));

vi.mock("@/hooks/useGskFile", () => ({
  useGskFile: () => mockGskFile,
  hasMeaningfulTree: () => true,
}));

vi.mock("@/hooks/useAiAssistant", () => ({
  useAiAssistant: () => mockAiAssistant,
}));

vi.mock("@/hooks/useMenuConfig", () => ({
  useMenuConfig: () => mockMenuConfig,
}));

vi.mock("@/hooks/useWorkspacePersistenceEffects", () => ({
  useWorkspacePersistenceEffects: () => undefined,
}));

vi.mock("@/hooks/useFileLoadRuntime", () => ({
  useFileLoadRuntime: () => ({ applyLoadedPayload: vi.fn() }),
}));

vi.mock("@/hooks/useAppShellShortcuts", () => ({
  useAppShellShortcuts: () => undefined,
}));

vi.mock("@/core/read-model/selectors", () => ({
  projectGraphDocument: () => fakeState.current.__document ?? null,
}));

vi.mock("@/state/store", () => {
  const useAppStore = ((selector: (state: any) => any) => selector(fakeState.current)) as any;
  useAppStore.setState = vi.fn();
  useAppStore.getState = () => fakeState.current;
  return { useAppStore };
});

function buildDoc(): GeneaDocument {
  return {
    persons: {
      "@I1@": { id: "@I1@", name: "Juan", surname: "Perez", sex: "M", lifeStatus: "alive", events: [], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
      "@I2@": { id: "@I2@", name: "Maria", surname: "Lopez", sex: "F", lifeStatus: "alive", events: [], famc: [], fams: ["@F1@"], mediaRefs: [], sourceRefs: [] },
    },
    families: {
      "@F1@": { id: "@F1@", husbandId: "@I1@", wifeId: "@I2@", childrenIds: [], events: [] },
    },
    sources: {},
    notes: {},
    media: {},
    metadata: { sourceFormat: "GSK", gedVersion: "7.0.x" },
  };
}

function createActions() {
  return {
    applyProjectedDocument: vi.fn(),
    createNewTreeDoc: vi.fn(),
    setSelectedPerson: vi.fn(),
    updatePersonById: vi.fn(),
    updateFamilyById: vi.fn(),
    addRelationFromAnchor: vi.fn(),
    createStandalonePerson: vi.fn(),
    createPersonRecord: vi.fn(),
    linkExistingRelation: vi.fn(),
    unlinkRelation: vi.fn(),
    setPreset: vi.fn(),
    setDepth: vi.fn(),
    setInclude: vi.fn(),
    toggleShellPanel: vi.fn(),
    toggleLeftSection: vi.fn(),
    setLeftSectionState: vi.fn(),
    setTimelinePanelOpen: vi.fn(),
    toggleRightStackSection: vi.fn(),
    setTimelineScope: vi.fn(),
    setTimelineView: vi.fn(),
    setTimelineScaleZoom: vi.fn(),
    setTimelineScaleOffset: vi.fn(),
    setTimelineStatus: vi.fn(),
    clearNodePositions: vi.fn(),
    setGridEnabled: vi.fn(),
    setDTreeOrientation: vi.fn(),
    setDTreeLayoutEngine: vi.fn(),
    toggleDTreeNodeCollapse: vi.fn(),
    setOverlay: vi.fn<(overlay: ActiveOverlay) => void>(),
    clearOverlayType: vi.fn(),
    clearVisualModes: vi.fn(),
    goBack: vi.fn(),
    goForward: vi.fn(),
    fitToScreen: vi.fn(),
    clearRecentFiles: vi.fn(),
    setMergeDraft: vi.fn(),
    clearMergeDraft: vi.fn(),
    setAiSettings: vi.fn(),
    bootstrapSession: vi.fn(),
    clearSession: vi.fn(),
    dismissRestoreNotice: vi.fn(),
    setFocusFamilyId: vi.fn(),
    inspectPerson: vi.fn(),
    saveAutosessionNow: vi.fn(),
  };
}

describe("useAppShellFacade contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const doc = buildDoc();
    const actions = createActions();
    fakeState.current = {
      __document: doc,
      gschemaGraph: { graphId: "graph-1", journalLength: 1, persons: doc.persons, families: doc.families },
      viewConfig: UiEngine.createDefaultViewConfig("@I1@"),
      visualConfig: UiEngine.createDefaultVisualConfig(),
      expandedGraph: { nodes: [{ id: "@I1@", canonicalId: "@I1@", type: "person" }], edges: [] },
      selectedPersonId: "@I1@",
      fitNonce: 0,
      bootStatus: "ready",
      restoreAvailable: false,
      restoreNoticeVisible: false,
      recentFiles: [],
      mergeDraft: null,
      aiSettings: createDefaultAiSettings(),
      parseErrors: [],
      parseWarnings: [],
      ...actions,
    };
    mockController.personDetailModal = {
      type: "edit",
      personId: "@I1@",
      person: doc.persons["@I1@"],
    };
    mockController.workspacePersonId = "@I1@";
    mockController.workspacePersonIdV3 = "@I1@";
    mockGskFile.importIncomingDoc = doc;
    mockAiAssistant.showAiAssistantModal = true;
    mockAiAssistant.aiContext = { kind: "local", anchorPersonId: "@I1@" };
  });

  it("exposes person editor and workspace view models with wired commands", async () => {
    const { useAppShellFacade } = await import("@/app-shell/facade/useAppShellFacade");
    let facade: ReturnType<typeof useAppShellFacade> | null = null;

    function Harness() {
      facade = useAppShellFacade();
      return null;
    }

    renderToStaticMarkup(<Harness />);
    expect(facade).not.toBeNull();
    expect(facade!.features.personEditor.viewModel.documentView?.persons["@I1@"].name).toBe("Juan");
    expect(facade!.features.personEditor.viewModel.birthRefinement?.personId).toBe("@I1@");
    facade!.features.personEditor.commands.onSaveEdit("@I1@", { name: "Juan Carlos" });
    expect(fakeState.current.updatePersonById).toHaveBeenCalledWith("@I1@", { name: "Juan Carlos" });
    facade!.features.personEditor.commands.onClose();
    expect(mockController.setPersonDetailModal).toHaveBeenCalledWith(null);

    expect(facade!.features.personWorkspace.viewModel?.sections.identity.person.id).toBe("@I1@");
    expect(facade!.features.personWorkspace.viewModel?.sections.timeline.personId).toBe("@I1@");
    facade!.features.personWorkspace.commands.onQuickAddRelation("@I1@", "child");
    expect(mockController.setWorkspacePersonId).toHaveBeenCalledWith(null);
    expect(mockController.openAddRelationEditor).toHaveBeenCalledWith("@I1@", "child");
  });

  it("exposes import review and ai assistant contracts with delegated commands", async () => {
    const { useAppShellFacade } = await import("@/app-shell/facade/useAppShellFacade");
    let facade: ReturnType<typeof useAppShellFacade> | null = null;

    function Harness() {
      facade = useAppShellFacade();
      return null;
    }

    renderToStaticMarkup(<Harness />);
    expect(facade).not.toBeNull();
    expect(facade!.workspace.importReview.viewModel.baseDocument?.persons["@I1@"]).toBeDefined();
    expect(facade!.workspace.importReview.viewModel.incomingDocument?.families["@F1@"]).toBeDefined();
    expect(facade!.features.ai.assistantModal.viewModel.open).toBe(true);
    expect(facade!.features.ai.assistantModal.viewModel.context).toEqual({ kind: "local", anchorPersonId: "@I1@" });
    expect(facade!.features.ai.assistantModal.viewModel.documentView?.persons["@I1@"]).toBeDefined();

    facade!.workspace.importReview.onClose();
    expect(mockController.clearMergeFocusOverlay).toHaveBeenCalled();
    expect(mockGskFile.setImportIncomingDoc).toHaveBeenCalledWith(null);

    facade!.features.ai.assistantModal.onApplyBatch(buildDoc(), "applied");
    expect(mockAiAssistant.applyAiBatch).toHaveBeenCalledWith(expect.objectContaining({ persons: expect.any(Object) }), "applied");
    facade!.features.ai.assistantModal.onOpenSettings();
    expect(mockAiAssistant.setShowAiSettingsModal).toHaveBeenCalledWith(true);
  });

  it("uses a guarded fresh-session flow before clearing autosave", async () => {
    const confirmSpy = vi.fn();
    vi.stubGlobal("confirm", confirmSpy);
    confirmSpy.mockReturnValueOnce(false);
    fakeState.current.restoreNoticeVisible = true;

    const { useAppShellFacade } = await import("@/app-shell/facade/useAppShellFacade");
    let facade: ReturnType<typeof useAppShellFacade> | null = null;

    function Harness() {
      facade = useAppShellFacade();
      return null;
    }

    renderToStaticMarkup(<Harness />);
    expect(facade).not.toBeNull();

    await facade!.workspace.restoreBanner.onStartFresh();
    expect(fakeState.current.clearSession).not.toHaveBeenCalled();
    expect(fakeState.current.createNewTreeDoc).not.toHaveBeenCalled();

    confirmSpy.mockReturnValueOnce(true);
    await facade!.workspace.restoreBanner.onStartFresh();
    expect(fakeState.current.clearSession).toHaveBeenCalledOnce();
    expect(fakeState.current.createNewTreeDoc).toHaveBeenCalledOnce();
  });

  it("exposes a lightweight restore notice after automatic bootstrap", async () => {
    fakeState.current.restoreNoticeVisible = true;

    const { useAppShellFacade } = await import("@/app-shell/facade/useAppShellFacade");
    let facade: ReturnType<typeof useAppShellFacade> | null = null;

    function Harness() {
      facade = useAppShellFacade();
      return null;
    }

    renderToStaticMarkup(<Harness />);
    expect(facade).not.toBeNull();
    expect(facade!.workspace.restoreBanner.visible).toBe(true);
    expect(facade!.workspace.restoreBanner.message).toContain("restaurada automaticamente");

    facade!.workspace.restoreBanner.onDismiss();
    expect(fakeState.current.dismissRestoreNotice).toHaveBeenCalledOnce();
  });
});
