import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mergeFocusKey, normalizeMergeFocus, type MergeFocusPayload } from "@/core/edit/mergeFocus";
import { resolveNodeClickRouting } from "@/core/dtree/nodeClickRouting";
import { TreeGenerator, type GeneratorScenario } from "@/core/testing/generator";
import { useNodeActions } from "@/hooks/useNodeActions";
import type { GraphDocument, GraphSource } from "@/core/read-model/types";
import type { ActiveOverlay, OverlayType, PendingRelationType, ViewConfig } from "@/types/domain";
import type {
  ColorThemeConfig,
  NodeInteraction,
  PersonEditorState,
  TimelineHighlightPayload,
} from "@/types/editor";

const THEME = {
  dark: { personNode: "#1e293b", text: "#f8fafc", edges: "#475569" },
  light: { personNode: "#ffffff", text: "#0f172a", edges: "#94a3b8" },
} as const;

export const DEFAULT_COLOR_THEME: ColorThemeConfig = {
  background: "transparent",
  personNode: THEME.dark.personNode,
  text: THEME.dark.text,
  edges: THEME.dark.edges,
  nodeFontSize: 18,
  edgeThickness: 2.5,
  nodeWidth: 210,
  nodeHeight: 92,
};

export type ThemeMode = "dark" | "light";
export type MenuLayout = "frequency" | "role" | "hybrid";
export type PickerState = {
  anchorId: string;
  type: PendingRelationType | "kinship";
};

type AppShellControllerParams = {
  document: GraphDocument | null;
  viewConfig: ViewConfig | null;
  selectedPersonId: string | null;
  clearOverlayType: (type: OverlayType) => void;
  setOverlay: (overlay: ActiveOverlay) => void;
  inspectPerson: (personId: string) => void;
  setSelectedPerson: (personId: string) => void;
  fitToScreen: () => void;
  setStatus: (status: string) => void;
  applyProjectedDocument: (doc: GraphDocument, source: GraphSource) => void;
  toggleDTreeNodeCollapse: (id: string) => void;
  setFocusFamilyId: (id: string | null) => void;
  openLocalAiAssistant: (id: string) => void;
};

export function useAppShellController(params: AppShellControllerParams) {
  const mergeFocusKeyRef = useRef<string | null>(null);

  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [colorTheme, setColorTheme] = useState<ColorThemeConfig>(DEFAULT_COLOR_THEME);
  const [menuLayout, setMenuLayout] = useState<MenuLayout>(() => {
    const saved = localStorage.getItem("gsk_menu_layout");
    return saved === "frequency" || saved === "role" || saved === "hybrid" ? saved : "frequency";
  });
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showColorThemeMenu, setShowColorThemeMenu] = useState(false);
  const [showPdfExport, setShowPdfExport] = useState(false);
  const [branchAnchorId, setBranchAnchorId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [pendingKinshipSourceId, setPendingKinshipSourceId] = useState<string | null>(null);
  const [personDetailModal, setPersonDetailModal] = useState<PersonEditorState>(null);
  const [workspacePersonId, setWorkspacePersonId] = useState<string | null>(null);
  const [workspacePersonIdV3, setWorkspacePersonIdV3] = useState<string | null>(null);
  const [nodeMenu, setNodeMenu] = useState<NodeInteraction | null>(null);
  const [showPersonStatsPersonId, setShowPersonStatsPersonId] = useState<string | null>(null);
  const [showGlobalStatsPanel, setShowGlobalStatsPanel] = useState(false);
  const [showAboutModalV3, setShowAboutModalV3] = useState(false);
  const [showWikiPanel, setShowWikiPanel] = useState(false);
  const [showFamilySearchPanel, setShowFamilySearchPanel] = useState(false);
  const [showMockTools, setShowMockTools] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);

  useEffect(() => {
    localStorage.setItem("gsk_menu_layout", menuLayout);
  }, [menuLayout]);

  useEffect(() => {
    window.document.documentElement.setAttribute("data-theme", themeMode);
    setColorTheme((current) => {
      const preset = themeMode === "light" ? THEME.light : THEME.dark;
      return { ...current, personNode: preset.personNode, text: preset.text, edges: preset.edges };
    });
  }, [themeMode]);

  const clearMergeFocusOverlay = useCallback(() => {
    mergeFocusKeyRef.current = null;
    params.clearOverlayType("merge_focus");
  }, [params]);

  const openPersonEditor = useCallback(
    (id: string) => {
      if (!params.document) return;
      const person = params.document.persons[id];
      if (!person) return;
      setPersonDetailModal({ type: "edit", personId: id, person });
    },
    [params.document],
  );

  const openAddRelationEditor = useCallback(
    (anchorId: string, type: PendingRelationType | "kinship") => {
      if (!params.document) return;
      if (type === "kinship") {
        setPicker({ anchorId, type });
        return;
      }
      const anchorPerson = params.document.persons[anchorId];
      if (!anchorPerson) return;
      setPersonDetailModal({ type: "add_relation", anchorId, anchorPerson, relationType: type });
    },
    [params.document],
  );

  const focusPersonInCanvas = useCallback(
    (personId: string) => {
      params.setSelectedPerson(personId);
      setNodeMenu(null);
      setTimeout(() => params.fitToScreen(), 0);
    },
    [params],
  );

  const selectPersonSoft = useCallback(
    (personId: string) => {
      params.inspectPerson(personId);
      setNodeMenu(null);
    },
    [params],
  );

  const handleTimelineHighlight = useCallback(
    (payload: TimelineHighlightPayload | null) => {
      if (!payload) {
        params.clearOverlayType("timeline");
        return;
      }
      params.setOverlay({
        id: "timeline-simulation",
        type: "timeline",
        priority: 100,
        config: {
          sourceItemId: payload.sourceItemId,
          primaryId: payload.primaryPersonId,
          secondaryIds: payload.secondaryPersonIds,
        },
      });
    },
    [params],
  );

  const handleNodeClick = useCallback(
    (interaction: NodeInteraction) => {
      const heatmapOverlayCandidate = params.viewConfig?.dtree?.overlays.find((overlay) => overlay.type === "heatmap");
      const heatmapOverlay = heatmapOverlayCandidate?.type === "heatmap" ? heatmapOverlayCandidate : null;
      const decision = resolveNodeClickRouting({
        interaction,
        pendingKinshipSourceId,
        heatmapOverlay,
      });

      if (decision.nextOverlay) params.setOverlay(decision.nextOverlay);
      if (decision.inspectPersonId) params.inspectPerson(decision.inspectPersonId);
      if (decision.statusMessage) params.setStatus(decision.statusMessage);
      if (decision.clearPendingKinship) setPendingKinshipSourceId(null);
      if (decision.consume) return;
      setNodeMenu(interaction);
    },
    [params, pendingKinshipSourceId],
  );

  const handleNodeContextMenu = useCallback(
    (interaction: NodeInteraction) => {
      if (interaction.nodeKind === "person") params.inspectPerson(interaction.nodeId);
      setNodeMenu(interaction);
    },
    [params],
  );

  const handleMergeFocusChange = useCallback(
    (focus: MergeFocusPayload | null) => {
      const normalized = normalizeMergeFocus(focus);
      const nextKey = mergeFocusKey(normalized);
      if (!normalized) {
        clearMergeFocusOverlay();
        return;
      }
      if (nextKey && nextKey === mergeFocusKeyRef.current) return;
      mergeFocusKeyRef.current = nextKey;
      params.setOverlay({
        id: "merge-focus-review",
        type: "merge_focus",
        priority: 95,
        config: {
          primaryIds: normalized.primaryIds,
          secondaryIds: normalized.secondaryIds,
          secondaryLevel1Ids: normalized.secondaryLevel1Ids || normalized.secondaryIds,
          secondaryLevel2Ids: normalized.secondaryLevel2Ids || [],
        },
      });
    },
    [clearMergeFocusOverlay, params],
  );

  const generateScenario = useCallback(
    (scenario: GeneratorScenario) => {
      const generator = new TreeGenerator({ seed: Date.now() });
      const nextDoc =
        scenario === "standard"
          ? generator.generateStandard(5)
          : scenario === "cousin_marriage"
            ? generator.generateCousinMarriage()
            : scenario === "pedigree_collapse"
              ? generator.generatePedigreeCollapse()
              : generator.generateEndogamy(12, 5);
      params.applyProjectedDocument(nextDoc, "mock");
      params.setStatus(`Árbol de prueba generado (${scenario})`);
    },
    [params],
  );

  const nodeMenuState = useNodeActions({
    nodeMenu,
    document: params.document,
    viewConfig: params.viewConfig,
    setWorkspacePersonId,
    focusPersonInCanvas,
    openPersonEditor,
    openAddRelationEditor,
    clearOverlayType: params.clearOverlayType,
    setOverlay: params.setOverlay,
    setStatus: params.setStatus,
    toggleDTreeNodeCollapse: params.toggleDTreeNodeCollapse,
    setBranchAnchorId,
    openLocalAiAssistant: params.openLocalAiAssistant,
    setPendingKinshipSourceId,
    setPicker,
    selectPersonSoft,
    setFocusFamilyId: params.setFocusFamilyId,
    inspectPerson: params.inspectPerson,
  });

  return useMemo(
    () => ({
      themeMode,
      setThemeMode,
      colorTheme,
      setColorTheme,
      menuLayout,
      setMenuLayout,
      showDiagnostics,
      setShowDiagnostics,
      showColorThemeMenu,
      setShowColorThemeMenu,
      showPdfExport,
      setShowPdfExport,
      branchAnchorId,
      setBranchAnchorId,
      picker,
      setPicker,
      pendingKinshipSourceId,
      setPendingKinshipSourceId,
      personDetailModal,
      setPersonDetailModal,
      workspacePersonId,
      setWorkspacePersonId,
      workspacePersonIdV3,
      setWorkspacePersonIdV3,
      nodeMenu,
      setNodeMenu,
      nodeMenuState,
      showPersonStatsPersonId,
      setShowPersonStatsPersonId,
      showGlobalStatsPanel,
      setShowGlobalStatsPanel,
      showAboutModalV3,
      setShowAboutModalV3,
      showWikiPanel,
      setShowWikiPanel,
      showFamilySearchPanel,
      setShowFamilySearchPanel,
      showMockTools,
      setShowMockTools,
      showSearchPanel,
      setShowSearchPanel,
      clearMergeFocusOverlay,
      openPersonEditor,
      openAddRelationEditor,
      handleTimelineHighlight,
      focusPersonInCanvas,
      selectPersonSoft,
      handleNodeClick,
      handleNodeContextMenu,
      handleMergeFocusChange,
      generateScenario,
    }),
    [
      branchAnchorId,
      clearMergeFocusOverlay,
      colorTheme,
      focusPersonInCanvas,
      generateScenario,
      handleMergeFocusChange,
      handleNodeClick,
      handleNodeContextMenu,
      handleTimelineHighlight,
      menuLayout,
      nodeMenu,
      nodeMenuState,
      openAddRelationEditor,
      openPersonEditor,
      pendingKinshipSourceId,
      personDetailModal,
      picker,
      selectPersonSoft,
      showAboutModalV3,
      showColorThemeMenu,
      showDiagnostics,
      showFamilySearchPanel,
      showGlobalStatsPanel,
      showMockTools,
      showPdfExport,
      showPersonStatsPersonId,
      showSearchPanel,
      showWikiPanel,
      themeMode,
      workspacePersonId,
      workspacePersonIdV3,
    ],
  );
}
