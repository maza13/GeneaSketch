import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mergeFocusKey, normalizeMergeFocus, type MergeFocusPayload } from "@/core/edit/mergeFocus";
import { TreeGenerator, type GeneratorScenario } from "@/core/testing/generator";
import { useAppStore } from "@/state/store";
import type { PendingRelationType } from "@/types/domain";
import type { ColorThemeConfig, NodeInteraction, PersonEditorState } from "@/types/editor";
import { createGlobalShortcutHandler, type ShortcutActions } from "@/utils/globalShortcuts";
import { documentToGSchema } from "@/core/gschema/GedcomBridge";
import { projectGraphDocument } from "@/core/read-model/selectors";
import { useGskFile } from "@/hooks/useGskFile";
import { WorkspaceProfileService } from "@/io/workspaceProfileService";
import { useMenuConfig } from "@/hooks/useMenuConfig";
import { useNodeActions } from "@/hooks/useNodeActions";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { resolveNodeClickRouting } from "@/core/dtree/nodeClickRouting";
import { normalizeDtreeConfig } from "@/core/dtree/dtreeConfig";

import { DTreeViewV3 } from "@/views/DTreeViewV3";
import { DiagnosticPanel } from "@/views/DiagnosticPanel";
import { GlobalStatsPanel } from "@/views/GlobalStatsPanel";
import { PersonStatsPanel } from "@/views/PersonStatsPanel";
import { AboutReleaseModalV3 } from "@/ui/AboutReleaseModalV3";
import { BranchExtractionModal } from "@/ui/BranchExtractionModal";
import { ColorThemeMenu } from "@/ui/ColorThemeMenu";
import { ImportReviewPanel } from "@/ui/ImportReviewPanel";
import { LeftPanel } from "@/ui/LeftPanel";
import { MergeReviewErrorBoundary } from "@/ui/MergeReviewErrorBoundary";
import { MockToolsPanel } from "@/ui/MockToolsPanel";
import { NodeActionMenu } from "@/ui/NodeActionMenu";
import { PersonWorkspacePanelV3 } from "@/ui/PersonWorkspacePanelV3";
import { PersonWorkspacePanel } from "@/ui/PersonWorkspacePanel";
import { PersonDetailPanel } from "@/ui/PersonDetailPanel";
import { PersonPickerModal } from "@/ui/PersonPickerModal";
import { RightPanel } from "@/ui/RightPanel";
import { TimelineRightPanel } from "@/ui/TimelineRightPanel";
import { TopMenuBar } from "@/ui/TopMenuBar";
import { AppFooter } from "@/ui/shell/AppFooter";
import { PanelErrorBoundary } from "@/ui/common/PanelErrorBoundary";
import { SearchCenterPanel } from "@/ui/search/SearchCenterPanel";
import { AiAssistantModal } from "@/ui/ai/AiAssistantModal";
import { AiSettingsModal } from "@/ui/ai/AiSettingsModal";
import { FamilySearchPanel } from "@/ui/external/FamilySearchPanel";
import { AppShell } from "@/ui/shell/AppShell";
import { WikiPanel } from "@/ui/WikiPanel";
import { WORKSPACE_PROFILE_SCHEMA_VERSION } from "@/types/workspaceProfile";


const THEME = {
    dark: { personNode: "#1e293b", text: "#f8fafc", edges: "#475569" },
    light: { personNode: "#ffffff", text: "#0f172a", edges: "#94a3b8" }
} as const;

const DEFAULT_COLOR_THEME: ColorThemeConfig = {
    background: "transparent",
    personNode: THEME.dark.personNode,
    text: THEME.dark.text,
    edges: THEME.dark.edges,
    nodeFontSize: 18,
    edgeThickness: 2.5,
    nodeWidth: 210,
    nodeHeight: 92
};

type ThemeMode = "dark" | "light";


type PickerState = {

    anchorId: string;
    type: PendingRelationType | "kinship";
};

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}


import { useShallow } from 'zustand/react/shallow';

export function App() {
    // -- Reactive State (Granular Subscriptions) ------------------------------
    const gschemaGraph = useAppStore(state => state.gschemaGraph);
    const document = useMemo(() => projectGraphDocument(gschemaGraph), [gschemaGraph?.graphId, gschemaGraph?.journalLength]);
    const viewConfig = useAppStore(state => state.viewConfig);
    const visualConfig = useAppStore(state => state.visualConfig);
    const expandedGraph = useAppStore(state => state.expandedGraph);
    const selectedPersonId = useAppStore(state => state.selectedPersonId);
    const fitNonce = useAppStore(state => state.fitNonce);
    const restoreAvailable = useAppStore(state => state.restoreAvailable);

    // Group complex objects with useShallow
    const { parseErrors, parseWarnings } = useAppStore(useShallow(state => ({
        parseErrors: state.parseErrors,
        parseWarnings: state.parseWarnings
    })));

    const recentFiles = useAppStore(state => state.recentFiles);
    const mergeDraft = useAppStore(state => state.mergeDraft);
    const aiSettings = useAppStore(state => state.aiSettings);

    // -- Actions (Stable Functions) ------------------------------------------
    const actions = useAppStore(useShallow(state => ({
        loadGraph: state.loadGraph,
        createNewTreeDoc: state.createNewTreeDoc,
        setSelectedPerson: state.setSelectedPerson,
        updatePersonById: state.updatePersonById,
        updateFamilyById: state.updateFamilyById,
        addRelationFromAnchor: state.addRelationFromAnchor,
        createStandalonePerson: state.createStandalonePerson,
        createPersonRecord: state.createPersonRecord,
        linkExistingRelation: state.linkExistingRelation,
        unlinkRelation: state.unlinkRelation,
        setPreset: state.setPreset,
        setDepth: state.setDepth,
        setInclude: state.setInclude,
        toggleShellPanel: state.toggleShellPanel,
        toggleLeftSection: state.toggleLeftSection,
        setLeftSectionState: state.setLeftSectionState,
        setTimelinePanelOpen: state.setTimelinePanelOpen,
        toggleRightStackSection: state.toggleRightStackSection,
        setTimelineScope: state.setTimelineScope,
        setTimelineView: state.setTimelineView,
        setTimelineScaleZoom: state.setTimelineScaleZoom,
        setTimelineScaleOffset: state.setTimelineScaleOffset,
        setTimelineStatus: state.setTimelineStatus,
        clearNodePositions: state.clearNodePositions,
        setGridEnabled: state.setGridEnabled,
        setDTreeOrientation: state.setDTreeOrientation,
        setDTreeLayoutEngine: state.setDTreeLayoutEngine,
        toggleDTreeNodeCollapse: state.toggleDTreeNodeCollapse,
        setOverlay: state.setOverlay,
        clearOverlayType: state.clearOverlayType,
        clearVisualModes: state.clearVisualModes,
        goBack: state.goBack,
        goForward: state.goForward,
        fitToScreen: state.fitToScreen,
        clearRecentFiles: state.clearRecentFiles,
        setMergeDraft: state.setMergeDraft,
        clearMergeDraft: state.clearMergeDraft,
        setAiSettings: state.setAiSettings,
        checkRestoreAvailability: state.checkRestoreAvailability,
        restoreSession: state.restoreSession,
        clearSession: state.clearSession,
        setFocusFamilyId: state.setFocusFamilyId,
        inspectPerson: state.inspectPerson,
        saveAutosessionNow: state.saveAutosessionNow
    })));

    const {
        loadGraph,
        createNewTreeDoc,
        setSelectedPerson,
        updatePersonById,
        updateFamilyById,
        addRelationFromAnchor,
        createStandalonePerson,
        createPersonRecord,
        linkExistingRelation,
        unlinkRelation,
        setPreset,
        setDepth,
        setInclude,
        toggleShellPanel,
        toggleLeftSection,
        setLeftSectionState,
        setTimelinePanelOpen,
        toggleRightStackSection,
        setTimelineScope,
        setTimelineView,
        setTimelineScaleZoom,
        setTimelineScaleOffset,
        setTimelineStatus,
        clearNodePositions,
        setGridEnabled,
        setDTreeOrientation,
        setDTreeLayoutEngine,
        toggleDTreeNodeCollapse,
        setOverlay,
        clearOverlayType,
        clearVisualModes,
        goBack,
        goForward,
        fitToScreen,
        clearRecentFiles,
        setMergeDraft,
        clearMergeDraft,
        setAiSettings,
        checkRestoreAvailability,
        restoreSession,
        clearSession,
        setFocusFamilyId,
        inspectPerson,
        saveAutosessionNow
    } = actions;

    const openFileInputRef = useRef<HTMLInputElement>(null);
    const importFileInputRef = useRef<HTMLInputElement>(null);
    const graphSvgRef = useRef<SVGSVGElement | null>(null);
    const mergeFocusKeyRef = useRef<string | null>(null);

    const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
    const [colorTheme, setColorTheme] = useState<ColorThemeConfig>(DEFAULT_COLOR_THEME);

    const [menuLayout, setMenuLayout] = useState<"frequency" | "role" | "hybrid">(() => {
        const saved = localStorage.getItem("gsk_menu_layout");
        return (saved === "frequency" || saved === "role" || saved === "hybrid") ? saved : "frequency";
    });

    useEffect(() => {
        localStorage.setItem("gsk_menu_layout", menuLayout);
    }, [menuLayout]);

    const clearMergeFocusOverlay = useCallback(() => {
        mergeFocusKeyRef.current = null;
        clearOverlayType("merge_focus");
    }, [clearOverlayType]);

    const shortcutActionsRef = useRef<ShortcutActions>({
        onEscape: () => { },
        focusSearch: () => { },
        save: () => { },
        open: () => { },
        goBack: () => { },
        goForward: () => { },
        fitToScreen: () => { },
        centerFocus: () => { },
        openAiSettings: () => { },
        toggleLeftPanel: () => { },
        toggleRightPanel: () => { },
        toggleTimelinePanel: () => { }
    });

    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [showColorThemeMenu, setShowColorThemeMenu] = useState(false);
    const [showPdfExport, setShowPdfExport] = useState(false);
    const [branchAnchorId, setBranchAnchorId] = useState<string | null>(null);
    const [picker, setPicker] = useState<PickerState | null>(null);
    const [pendingKinshipSourceId, setPendingKinshipSourceId] = useState<string | null>(null);

    const {
        status,
        setStatus,
        exportWarnings,
        setExportWarnings,
        importIncomingDoc,
        setImportIncomingDoc,
        pdfOptions,
        setPdfOptions,
        openAndReplace,
        importForMerge,
        saveGsk,
        exportGed,
        exportBranchGsk,
        exportRaster,
        exportPdfNow,
        openRecentItem,
        handleMergeApply
    } = useGskFile(graphSvgRef, colorTheme, clearMergeFocusOverlay);

    const [personDetailModal, setPersonDetailModal] = useState<PersonEditorState>(null);
    const [workspacePersonId, setWorkspacePersonId] = useState<string | null>(null);
    const [workspacePersonIdV3, setWorkspacePersonIdV3] = useState<string | null>(null);
    const [nodeMenu, setNodeMenu] = useState<NodeInteraction | null>(null);
    const [showPersonStatsPersonId, setShowPersonStatsPersonId] = useState<string | null>(null);
    const [showGlobalStatsPanel, setShowGlobalStatsPanel] = useState(false);

    const {
        showAiAssistantModal,
        setShowAiAssistantModal,
        showAiSettingsModal,
        setShowAiSettingsModal,
        aiContext,
        aiUndoSnapshot,
        openGlobalAiAssistant,
        openLocalAiAssistant,
        applyAiBatch,
        undoAiBatch
    } = useAiAssistant({
        document,
        applyDiagnosticDocument: (doc) => {
            const gedVersion = doc.metadata?.gedVersion?.startsWith("7") ? "7.0.x" : "5.5.1";
            loadGraph({ graph: documentToGSchema(doc, gedVersion).graph, source: "merge" });
        },
        setStatus
    });

    const [showAboutModalV3, setShowAboutModalV3] = useState(false);
    const [showWikiPanel, setShowWikiPanel] = useState(false);
    const [showFamilySearchPanel, setShowFamilySearchPanel] = useState(false);
    const [showMockTools, setShowMockTools] = useState(false);
    const [showSearchPanel, setShowSearchPanel] = useState(false);

    const visiblePersonIds = useMemo(() => {
        const ids = new Set<string>();
        for (const node of expandedGraph.nodes) {
            if (node.type !== "person" && node.type !== "personAlias") continue;
            const canonicalId = node.canonicalId || node.id;
            if (document?.persons[canonicalId]) ids.add(canonicalId);
        }
        return Array.from(ids);
    }, [expandedGraph.nodes, document]);

    const {
        leftCollapsed,
        rightCollapsed
    } = viewConfig?.shellPanels || { leftCollapsed: false, rightCollapsed: false };

    const timelineOpen = viewConfig?.timelinePanelOpen ?? false;
    const { detailsMode, timelineMode } = viewConfig?.rightStack || { detailsMode: "expanded", timelineMode: "compact" };

    useEffect(() => {
        if (!document) return;
        const timer = setTimeout(() => {
            void saveAutosessionNow();
        }, 1500);
        return () => clearTimeout(timer);
    }, [document, viewConfig, visualConfig, aiSettings, saveAutosessionNow, leftCollapsed, rightCollapsed]);

    useEffect(() => {
        if (!gschemaGraph?.graphId || !viewConfig) return;
        const timer = setTimeout(() => {
            const sanitizedViewConfig = viewConfig.dtree
                ? {
                    ...viewConfig,
                    dtree: {
                        ...viewConfig.dtree,
                        overlays: (viewConfig.dtree.overlays || []).filter((overlay) => overlay.type !== "merge_focus")
                    }
                }
                : viewConfig;
            void WorkspaceProfileService.save({
                profileSchemaVersion: WORKSPACE_PROFILE_SCHEMA_VERSION,
                graphId: gschemaGraph.graphId,
                viewConfig: sanitizedViewConfig,
                visualConfig,
                colorTheme,
                updatedAt: new Date().toISOString(),
                source: "local-autosave"
            });
        }, 1200);
        return () => clearTimeout(timer);
    }, [gschemaGraph?.graphId, viewConfig, visualConfig, colorTheme]);

    useEffect(() => {
        checkRestoreAvailability();
    }, [checkRestoreAvailability]);

    useEffect(() => {
        window.document.documentElement.setAttribute("data-theme", themeMode);
        setColorTheme((current) => {
            const preset = themeMode === "light" ? THEME.light : THEME.dark;
            return { ...current, personNode: preset.personNode, text: preset.text, edges: preset.edges };
        });
    }, [themeMode]);

    useEffect(() => {
        shortcutActionsRef.current = {
            onEscape: () => {
                setNodeMenu(null);
                setShowSearchPanel(false);
            },
            focusSearch: () => {
                setShowSearchPanel(true);
                const search = window.document.getElementById("search-center-input") as HTMLInputElement | null;
                search?.focus();
            },
            save: () => saveGsk(colorTheme),
            open: () => openFileInputRef.current?.click(),
            goBack: () => goBack(),
            goForward: () => goForward(),
            fitToScreen: () => fitToScreen(),
            centerFocus: () => {
                const targetId = selectedPersonId || (document ? Object.keys(document.persons)[0] : null);
                if (targetId) focusPersonInCanvas(targetId);
            },
            openAiSettings: () => setShowAiSettingsModal(true),
            toggleLeftPanel: () => toggleShellPanel("left"),
            toggleRightPanel: () => toggleShellPanel("right"),
            toggleTimelinePanel: () => setTimelinePanelOpen(!(viewConfig?.timelinePanelOpen ?? false))
        };
    }, [saveGsk, colorTheme, goBack, goForward, fitToScreen, toggleShellPanel, viewConfig?.timelinePanelOpen, setTimelinePanelOpen]);

    useEffect(() => {
        const handler = createGlobalShortcutHandler(shortcutActionsRef, isTypingTarget);
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    function openPersonEditor(id: string) {
        if (!document) return;
        const person = document.persons[id];
        if (!person) return;
        setPersonDetailModal({ type: "edit", personId: id, person });
    }

    const openAddRelationEditor = useCallback((anchorId: string, type: PendingRelationType | "kinship") => {
        if (!document) return;
        if (type === "kinship") {
            setPicker({ anchorId, type });
        } else {
            const anchorPerson = document.persons[anchorId];
            if (!anchorPerson) return;
            setPersonDetailModal({ type: "add_relation", anchorId, anchorPerson, relationType: type });
        }
    }, [setPicker, setPersonDetailModal, document]);

    const handleTimelineHighlight = (payload: { sourceItemId: string; primaryPersonId: string | null; secondaryPersonIds: string[] } | null) => {
        if (!payload) {
            clearOverlayType("timeline");
            return;
        }
        setOverlay({
            id: "timeline-simulation",
            type: "timeline",
            priority: 100,
            config: {
                sourceItemId: payload.sourceItemId,
                primaryId: payload.primaryPersonId,
                secondaryIds: payload.secondaryPersonIds
            }
        });
    };

    function focusPersonInCanvas(personId: string) {
        setSelectedPerson(personId);
        setNodeMenu(null);
        setTimeout(() => fitToScreen(), 0);
    }

    function selectPersonSoft(personId: string) {
        inspectPerson(personId);
        setNodeMenu(null);
    }

    const handleNodeClick = (interaction: NodeInteraction) => {
        const heatmapOverlayCandidate = viewConfig?.dtree?.overlays.find((overlay) => overlay.type === "heatmap");
        const heatmapOverlay = heatmapOverlayCandidate?.type === "heatmap" ? heatmapOverlayCandidate : null;

        const decision = resolveNodeClickRouting({
            interaction,
            pendingKinshipSourceId,
            heatmapOverlay
        });

        if (decision.nextOverlay) {
            setOverlay(decision.nextOverlay);
        }
        if (decision.inspectPersonId) {
            inspectPerson(decision.inspectPersonId);
        }
        if (decision.statusMessage) {
            setStatus(decision.statusMessage);
        }
        if (decision.clearPendingKinship) {
            setPendingKinshipSourceId(null);
        }
        if (decision.consume) {
            return;
        }
        setNodeMenu(interaction);
    };

    const handleNodeContextMenu = (interaction: NodeInteraction) => {
        if (interaction.nodeKind === "person") inspectPerson(interaction.nodeId);
        setNodeMenu(interaction);
    };

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
            setOverlay({
                id: "merge-focus-review",
                type: "merge_focus",
                priority: 95,
                config: {
                    primaryIds: normalized.primaryIds,
                    secondaryIds: normalized.secondaryIds,
                    secondaryLevel1Ids: normalized.secondaryLevel1Ids || normalized.secondaryIds,
                    secondaryLevel2Ids: normalized.secondaryLevel2Ids || []
                }
            });
        },
        [clearMergeFocusOverlay, setOverlay]
    );

    function generateScenario(scenario: GeneratorScenario) {
        const generator = new TreeGenerator({ seed: Date.now() });
        const nextDoc =
            scenario === "standard"
                ? generator.generateStandard(5)
                : scenario === "cousin_marriage"
                    ? generator.generateCousinMarriage()
                    : scenario === "pedigree_collapse"
                        ? generator.generatePedigreeCollapse()
                        : generator.generateEndogamy(12, 5);
        loadGraph({ graph: documentToGSchema(nextDoc, "7.0.x").graph, source: "mock" });
        setStatus(`Árbol de prueba generado (${scenario})`);
    }

    const nodeMenuState = useNodeActions({
        nodeMenu,
        document,
        viewConfig,
        setWorkspacePersonId,
        focusPersonInCanvas,
        openPersonEditor,
        openAddRelationEditor,
        clearOverlayType,
        setOverlay,
        setStatus,
        toggleDTreeNodeCollapse,
        setBranchAnchorId,
        openLocalAiAssistant,
        setPendingKinshipSourceId,
        setPicker,
        selectPersonSoft,
        setFocusFamilyId,
        inspectPerson
    });

    const { menus, actions: menuActions } = useMenuConfig({
        document,
        viewConfig,
        recentFiles,
        selectedPersonId,
        colorTheme,
        themeMode,
        aiUndoSnapshot,
        leftCollapsed,
        rightCollapsed,
        timelineOpen,
        createNewTreeDoc,
        openFileInput: () => openFileInputRef.current?.click(),
        importFileInput: () => importFileInputRef.current?.click(),
        openAndReplace,
        openRecentItem,
        saveGsk,
        exportGed,
        setShowPdfExport,
        exportRaster,
        openPersonEditor,
        openAddRelationEditor,
        openLocalAiAssistant,
        openGlobalAiAssistant,
        setShowAiSettingsModal,
        undoAiBatch,
        fitToScreen,
        setThemeMode,
        setShowColorThemeMenu,
        toggleShellPanel,
        setTimelinePanelOpen,
        setTimelineScope,
        setTimelineView,
        setDTreeLayoutEngine,
        setShowDiagnostics,
        setShowPersonStatsPersonId,
        setShowGlobalStatsPanel,
        clearNodePositions,
        generateScenario,
        setShowMockTools,
        setShowFamilySearchPanel,
        setShowWikiPanel,
        setShowAboutModalV3: () => setShowAboutModalV3(true),
        openPersonWorkspaceV3: (id) => setWorkspacePersonIdV3(id),
        setColorTheme,
        clearRecentFiles,
        menuLayout,
        setMenuLayout
    });


    const normalizedDtreeConfig = useMemo(
        () => (viewConfig ? normalizeDtreeConfig(viewConfig.dtree) : undefined),
        [viewConfig]
    );

    const modeBadge = viewConfig ? "DTree V3" : null;

    return (
        <div className="app-root-wrapper" style={{ "--canvas-bg-custom": colorTheme.background, "--node-fill-custom": colorTheme.personNode, "--node-text-custom": colorTheme.text, "--edge-color-custom": colorTheme.edges } as React.CSSProperties}>
            <AppShell
                leftCollapsed={leftCollapsed}
                rightCollapsed={rightCollapsed}
                detailsMode={detailsMode}
                timelineMode={timelineMode}
                onToggleLeft={() => toggleShellPanel("left")}
                onToggleRight={() => toggleShellPanel("right")}
                topbar={
                    <TopMenuBar
                        menus={menus}
                        actions={menuActions}
                        menuLayout={menuLayout}
                        onChangeLayout={setMenuLayout}
                    />
                }

                footer={
                    <AppFooter
                        statusMessage={status}
                        personCount={document ? Object.keys(document.persons).length : null}
                        familyCount={document ? Object.keys(document.families).length : null}
                        sourceCount={document ? Object.keys(document.sources ?? {}).length : null}
                        engineMode={viewConfig ? "DTree V3" : null}
                        isSaved={false}
                        appVersion="0.4.4"
                    />
                }
                leftPanel={
                    <PanelErrorBoundary panelName="Panel izquierdo">
                        <LeftPanel
                            document={document}
                            viewConfig={viewConfig}
                            visualConfig={visualConfig}
                            sections={viewConfig?.leftSections}
                            onToggleSection={toggleLeftSection}
                            onSetSections={setLeftSectionState}
                            onDTreeOrientation={setDTreeOrientation}
                            onPreset={setPreset}
                            onDepth={setDepth}
                            onInclude={setInclude}
                            onGridEnabled={setGridEnabled}
                            onClearPositions={clearNodePositions}
                        />
                    </PanelErrorBoundary>
                }
                rightPanel={
                    <PanelErrorBoundary
                        panelName="Panel derecho"
                        onReset={() => {
                            clearOverlayType("timeline");
                            setTimelinePanelOpen(false);
                        }}
                    >
                        <>
                            <RightPanel
                                document={document}
                                selectedPersonId={workspacePersonId || selectedPersonId}
                                detailsMode={detailsMode}
                                onToggleDetailsExpanded={() => toggleRightStackSection("details")}
                                onEditPerson={openPersonEditor}
                                onViewPersonDetail={(personId) => setWorkspacePersonId(personId)}
                                onAddRelation={openAddRelationEditor}
                                onLinkExistingRelation={(anchorId, type) => setPicker({ anchorId, type })}
                                onUnlinkRelation={(personId, relatedId, type) => {
                                    unlinkRelation(personId, relatedId, type);
                                    setStatus(`Relación desvinculada: ${type}`);
                                }}
                            />
                            {timelineOpen ? (
                                <TimelineRightPanel
                                    document={document}
                                    expandedGraph={expandedGraph}
                                    viewConfig={viewConfig}
                                    onTimelineView={setTimelineView}
                                    onTimelineScaleZoom={setTimelineScaleZoom}
                                    onTimelineScaleOffset={setTimelineScaleOffset}
                                    onTimelineHighlight={handleTimelineHighlight}
                                    onTimelineStatus={setTimelineStatus}
                                    timelineMode={timelineMode}
                                    onToggleTimelineExpanded={() => toggleRightStackSection("timeline")}
                                    onClosePanel={() => {
                                        clearOverlayType("timeline");
                                        setTimelinePanelOpen(false);
                                    }}
                                />
                            ) : null}
                        </>
                    </PanelErrorBoundary>
                }
                canvas={
                    <PanelErrorBoundary
                        panelName="Canvas principal"
                        onReset={() => {
                            clearVisualModes();
                            setStatus("Panel de canvas reiniciado.");
                        }}
                    >
                        <>
                            {restoreAvailable ? (
                                <div className="restore-banner">
                                    <span>Se encontró sesión previa.</span>
                                    <button onClick={() => void restoreSession()}>Continuar sesión</button>
                                    <button onClick={() => void clearSession()}>Nueva sesión</button>
                                </div>
                            ) : null}

                            {exportWarnings.length > 0 ? (
                                <div className="restore-banner" style={{ marginTop: 6, justifyContent: "space-between" }}>
                                    <span>Exportación legacy con advertencias: {exportWarnings.length}</span>
                                    <button onClick={() => setExportWarnings([])}>Ocultar</button>
                                </div>
                            ) : null}

                            {aiUndoSnapshot ? (
                                <div className="restore-banner" style={{ marginTop: 6, justifyContent: "space-between" }}>
                                    <span>Último lote IA disponible para deshacer.</span>
                                    <button onClick={undoAiBatch}>Deshacer lote IA</button>
                                </div>
                            ) : null}

                            {pendingKinshipSourceId && document ? (
                                <div
                                    onClick={() => setPendingKinshipSourceId(null)}
                                    style={{
                                        position: "absolute",
                                        top: 10,
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        background: "var(--overlay-panel-bg-soft)",
                                        color: "var(--tree-kinship-accent)",
                                        border: "1px solid var(--border)",
                                        padding: "12px 24px",
                                        borderRadius: 8,
                                        zIndex: 100,
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        boxShadow: "var(--overlay-shadow)"
                                    }}
                                >
                                    Selecciona a otra persona para calcular parentesco con {document.persons[pendingKinshipSourceId]?.name}
                                </div>
                            ) : null}

                            {viewConfig ? null : <div className="empty-state">Crea un árbol nuevo o abre un archivo .gsk o .ged.</div>}
                            {modeBadge ? <div className="mode-badge">{modeBadge}</div> : null}
                            {showMockTools ? <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, width: 300 }}><MockToolsPanel /></div> : null}

                            <DTreeViewV3
                                graph={expandedGraph}
                                document={document}
                                fitNonce={fitNonce}
                                onNodeClick={handleNodeClick}
                                onNodeContextMenu={handleNodeContextMenu}
                                focusPersonId={viewConfig?.focusPersonId ?? null}
                                focusFamilyId={viewConfig?.focusFamilyId ?? null}
                                selectedPersonId={selectedPersonId}
                                colorTheme={colorTheme}
                                dtreeConfig={normalizedDtreeConfig}
                                onBgClick={() => setNodeMenu(null)}
                                onBgDoubleClick={() => clearVisualModes()}
                                onSvgReady={(svg) => { graphSvgRef.current = svg; }}
                            />
                        </>
                    </PanelErrorBoundary>
                }
            />

            {/* Hidden file inputs */}
            <input ref={openFileInputRef} type="file" accept=".gsk,.ged" className="hidden" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void openAndReplace(file); event.currentTarget.value = ""; }} />
            <input ref={importFileInputRef} type="file" accept=".gsk,.ged" className="hidden" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void importForMerge(file); event.currentTarget.value = ""; }} />

            {/* Modals & Overlays */}
            <PanelErrorBoundary panelName="Buscador" onReset={() => setShowSearchPanel(false)}>
                <SearchCenterPanel
                    open={showSearchPanel}
                    document={document}
                    onClose={() => setShowSearchPanel(false)}
                    onSelectPerson={(personId) => {
                        inspectPerson(personId);
                        setWorkspacePersonId(personId);
                    }}
                />
            </PanelErrorBoundary>

            {showDiagnostics ? <DiagnosticPanel document={document} parseErrors={parseErrors} parseWarnings={parseWarnings} onApplyDocument={(doc) => { const gedVersion = doc.metadata?.gedVersion?.startsWith("7") ? "7.0.x" : "5.5.1"; loadGraph({ graph: documentToGSchema(doc, gedVersion).graph, source: "merge" }); }} onClose={() => setShowDiagnostics(false)} onSelectPerson={(personId) => { setSelectedPerson(personId); setShowDiagnostics(false); }} onSelectFamily={(familyId) => { const family = document?.families[familyId]; const candidate = family?.husbandId || family?.wifeId || family?.childrenIds[0]; if (candidate) setSelectedPerson(candidate); setShowDiagnostics(false); }} /> : null}
            {showPersonStatsPersonId && document ? <PersonStatsPanel document={document} personId={showPersonStatsPersonId} onClose={() => setShowPersonStatsPersonId(null)} /> : null}
            {showGlobalStatsPanel && document ? <GlobalStatsPanel document={document} visiblePersonIds={visiblePersonIds} onClose={() => setShowGlobalStatsPanel(false)} /> : null}

            {showPdfExport ? (
                <div className="modal-overlay" onClick={() => setShowPdfExport(false)}>
                    <div className="modal-panel" style={{ width: 520 }} onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header"><h3>Exportar PDF</h3><button onClick={() => setShowPdfExport(false)}>Cerrar</button></div>
                        <div className="builder" style={{ marginTop: 8 }}>
                            <label>Alcance<select value={pdfOptions.scope} onChange={(event) => setPdfOptions((prev) => ({ ...prev, scope: event.target.value as "viewport" | "full" }))}><option value="viewport">Viewport actual</option><option value="full">Todo lo visible</option></select></label>
                            <label>Tamaño de papel<select value={pdfOptions.paperSize} onChange={(event) => setPdfOptions((prev) => ({ ...prev, paperSize: event.target.value as "A4" | "A3" | "A2" | "A1" | "A0" }))}><option value="A4">A4</option><option value="A3">A3</option><option value="A2">A2</option><option value="A1">A1</option><option value="A0">A0</option></select></label>
                            <div className="builder-actions" style={{ justifyContent: "flex-end", marginTop: 24 }}><button className="primary" onClick={() => void exportPdfNow()}>Exportar ahora</button></div>
                        </div>
                    </div>
                </div>
            ) : null}

            {importIncomingDoc && document ? (
                <MergeReviewErrorBoundary onClearDraft={clearMergeDraft} onClose={() => { clearMergeFocusOverlay(); setImportIncomingDoc(null); }}>
                    <ImportReviewPanel baseDoc={document} incomingDoc={importIncomingDoc} initialDraft={mergeDraft} onDraftChange={setMergeDraft} onFocusChange={handleMergeFocusChange} onApply={handleMergeApply} onClose={() => { clearMergeFocusOverlay(); setImportIncomingDoc(null); }} />
                </MergeReviewErrorBoundary>
            ) : null}

            {nodeMenuState ? <NodeActionMenu open={Boolean(nodeMenuState)} x={nodeMenuState.x} y={nodeMenuState.y} nodeKind={nodeMenuState.nodeKind} title={nodeMenuState.title} items={nodeMenuState.items} onClose={() => setNodeMenu(null)} /> : null}

            <ColorThemeMenu open={showColorThemeMenu} value={colorTheme} onChange={setColorTheme} onReset={() => setColorTheme(DEFAULT_COLOR_THEME)} onClose={() => setShowColorThemeMenu(false)} />

            <AiSettingsModal
                open={showAiSettingsModal}
                settings={aiSettings}
                onSave={(next) => {
                    setAiSettings(next);
                    setStatus("Ajustes IA guardados.");
                }}
                onClose={() => setShowAiSettingsModal(false)}
                onStatus={setStatus}
            />

            <AiAssistantModal
                open={showAiAssistantModal}
                context={aiContext}
                document={document}
                settings={aiSettings}
                onClose={() => setShowAiAssistantModal(false)}
                onStatus={setStatus}
                onApplyBatch={applyAiBatch}
                onOpenSettings={() => setShowAiSettingsModal(true)}
            />

            <AboutReleaseModalV3 open={showAboutModalV3} onClose={() => setShowAboutModalV3(false)} />
            <PanelErrorBoundary panelName="Wiki" onReset={() => setShowWikiPanel(false)}>
                <WikiPanel open={showWikiPanel} onClose={() => setShowWikiPanel(false)} />
            </PanelErrorBoundary>

            {showFamilySearchPanel ? (
                <PanelErrorBoundary panelName="FamilySearch" onReset={() => setShowFamilySearchPanel(false)}>
                    <FamilySearchPanel
                        onClose={() => setShowFamilySearchPanel(false)}
                        onImport={() => setShowFamilySearchPanel(false)}
                    />
                </PanelErrorBoundary>
            ) : null}

            <PersonDetailPanel
                editorState={personDetailModal}
                document={document}
                aiSettings={aiSettings}
                onClose={() => setPersonDetailModal(null)}
                onSaveEdit={updatePersonById}
                onSaveRelation={addRelationFromAnchor}
                onCreateStandalone={createStandalonePerson}
            />

            {workspacePersonIdV3 && document ? (
                <PersonWorkspacePanelV3
                    document={document}
                    personId={workspacePersonIdV3}
                    aiSettings={aiSettings}
                    onClose={() => setWorkspacePersonIdV3(null)}
                    onSelectPerson={(id) => {
                        setSelectedPerson(id);
                        setWorkspacePersonIdV3(id);
                    }}
                    onSetAsFocus={focusPersonInCanvas}
                    onSavePerson={updatePersonById}
                    onSaveFamily={updateFamilyById}
                    onCreatePerson={createPersonRecord}
                    onQuickAddRelation={(anchorId, type) => {
                        setWorkspacePersonIdV3(null);
                        openAddRelationEditor(anchorId, type);
                    }}
                />
            ) : null}

            {workspacePersonId && document ? (
                <PersonWorkspacePanel
                    document={document}
                    personId={workspacePersonId}
                    aiSettings={aiSettings}
                    onClose={() => setWorkspacePersonId(null)}
                    onSelectPerson={setSelectedPerson}
                    onSetAsFocus={focusPersonInCanvas}
                    onSavePerson={updatePersonById}
                    onSaveFamily={updateFamilyById}
                    onCreatePerson={createPersonRecord}
                    onQuickAddRelation={(anchorId, type) => {
                        setWorkspacePersonId(null);
                        openAddRelationEditor(anchorId, type);
                    }}
                />
            ) : null}

            {picker && document ? (
                <PersonPickerModal
                    document={document}
                    anchorId={picker.anchorId}
                    relationType={picker.type}
                    onLink={(existingPersonId) => {
                        if (picker.type === "kinship") {
                            setOverlay({ id: "kinship-standard", type: "kinship", priority: 90, config: { person1Id: picker.anchorId, person2Id: existingPersonId } });
                            setStatus("Calculando parentesco...");
                        } else {
                            linkExistingRelation(picker.anchorId, existingPersonId, picker.type);
                            setStatus("Persona vinculada");
                        }
                    }}
                    onClose={() => setPicker(null)}
                />
            ) : null}

            {branchAnchorId && document ? (
                <BranchExtractionModal
                    document={document}
                    personId={branchAnchorId}
                    onClose={() => setBranchAnchorId(null)}
                    onExport={(direction) => {
                        void exportBranchGsk(branchAnchorId, direction);
                        setBranchAnchorId(null);
                    }}
                />
            ) : null}
        </div>
    );
}




