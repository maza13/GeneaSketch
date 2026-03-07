import { useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { projectGraphDocument } from "@/core/read-model/selectors";
import { normalizeDtreeConfig } from "@/core/dtree/dtreeConfig";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { DEFAULT_COLOR_THEME, useAppShellController } from "@/hooks/useAppShellController";
import { useAppShellShortcuts } from "@/hooks/useAppShellShortcuts";
import { useFileLoadRuntime } from "@/hooks/useFileLoadRuntime";
import { useGskFile } from "@/hooks/useGskFile";
import { useMenuConfig } from "@/hooks/useMenuConfig";
import { useWorkspacePersistenceEffects } from "@/hooks/useWorkspacePersistenceEffects";
import { useAppStore } from "@/state/store";
import { AboutReleaseModalV3 } from "@/ui/AboutReleaseModalV3";
import { AiAssistantModal } from "@/ui/ai/AiAssistantModal";
import { AiSettingsModal } from "@/ui/ai/AiSettingsModal";
import { BranchExtractionModal } from "@/ui/BranchExtractionModal";
import { ColorThemeMenu } from "@/ui/ColorThemeMenu";
import { FamilySearchPanel } from "@/ui/external/FamilySearchPanel";
import { ImportReviewPanel } from "@/ui/ImportReviewPanel";
import { LeftPanel } from "@/ui/LeftPanel";
import { MergeReviewErrorBoundary } from "@/ui/MergeReviewErrorBoundary";
import { MockToolsPanel } from "@/ui/MockToolsPanel";
import { NodeActionMenu } from "@/ui/NodeActionMenu";
import { PersonDetailPanel } from "@/ui/PersonDetailPanel";
import { PersonPickerModal } from "@/ui/PersonPickerModal";
import { PersonWorkspacePanel } from "@/ui/PersonWorkspacePanel";
import { PersonWorkspacePanelV3 } from "@/ui/PersonWorkspacePanelV3";
import { RightPanel } from "@/ui/RightPanel";
import { SearchCenterPanel } from "@/ui/search/SearchCenterPanel";
import { AppFooter } from "@/ui/shell/AppFooter";
import { AppShell } from "@/ui/shell/AppShell";
import { PanelErrorBoundary } from "@/ui/common/PanelErrorBoundary";
import { TimelineRightPanel } from "@/ui/TimelineRightPanel";
import { TopMenuBar } from "@/ui/TopMenuBar";
import { WikiPanel } from "@/ui/WikiPanel";
import { DiagnosticPanel } from "@/views/DiagnosticPanel";
import { DTreeViewV3 } from "@/views/DTreeViewV3";
import { GlobalStatsPanel } from "@/views/GlobalStatsPanel";
import { PersonStatsPanel } from "@/views/PersonStatsPanel";

export function App() {
  const gschemaGraph = useAppStore((state) => state.gschemaGraph);
  const document = useMemo(
    () => projectGraphDocument(gschemaGraph),
    [gschemaGraph?.graphId, gschemaGraph?.journalLength],
  );
  const viewConfig = useAppStore((state) => state.viewConfig);
  const visualConfig = useAppStore((state) => state.visualConfig);
  const expandedGraph = useAppStore((state) => state.expandedGraph);
  const selectedPersonId = useAppStore((state) => state.selectedPersonId);
  const fitNonce = useAppStore((state) => state.fitNonce);
  const restoreAvailable = useAppStore((state) => state.restoreAvailable);
  const recentFiles = useAppStore((state) => state.recentFiles);
  const mergeDraft = useAppStore((state) => state.mergeDraft);
  const aiSettings = useAppStore((state) => state.aiSettings);
  const { parseErrors, parseWarnings } = useAppStore(
    useShallow((state) => ({
      parseErrors: state.parseErrors,
      parseWarnings: state.parseWarnings,
    })),
  );

  const actions = useAppStore(
    useShallow((state) => ({
      applyProjectedDocument: state.applyProjectedDocument,
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
      saveAutosessionNow: state.saveAutosessionNow,
    })),
  );

  const {
    applyProjectedDocument,
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
    saveAutosessionNow,
  } = actions;

  const openFileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const clearMergeFocusOverlayRef = useRef<() => void>(() => {});
  const fileLoadRuntime = useFileLoadRuntime(() => clearMergeFocusOverlayRef.current());

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
    handleMergeApply,
  } = useGskFile(graphSvgRef, shell.colorTheme, fileLoadRuntime);

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
    undoAiBatch,
  } = useAiAssistant({
    document,
    applyDocumentChange: (doc, source) => applyProjectedDocument(doc, source),
    setStatus,
  });

  const shellController = useAppShellController({
    document,
    viewConfig,
    selectedPersonId,
    clearOverlayType,
    setOverlay,
    inspectPerson,
    setSelectedPerson,
    fitToScreen,
    setStatus,
    applyProjectedDocument,
    toggleDTreeNodeCollapse,
    setFocusFamilyId,
    openLocalAiAssistant,
  });
  clearMergeFocusOverlayRef.current = shellController.clearMergeFocusOverlay;

  useAppShellShortcuts({
    colorTheme: shellController.colorTheme,
    document,
    selectedPersonId,
    viewConfig,
    saveGsk,
    openFilePicker: () => openFileInputRef.current?.click(),
    goBack,
    goForward,
    fitToScreen,
    focusPersonInCanvas: shellController.focusPersonInCanvas,
    onOpenAiSettings: () => setShowAiSettingsModal(true),
    toggleShellPanel,
    setTimelinePanelOpen,
    onEscape: () => {
      shellController.setNodeMenu(null);
      shellController.setShowSearchPanel(false);
    },
    onFocusSearch: () => {
      shellController.setShowSearchPanel(true);
      const search = window.document.getElementById("search-center-input") as HTMLInputElement | null;
      search?.focus();
    },
  });

  const visiblePersonIds = useMemo(() => {
    const ids = new Set<string>();
    for (const node of expandedGraph.nodes) {
      if (node.type !== "person" && node.type !== "personAlias") continue;
      const canonicalId = node.canonicalId || node.id;
      if (document?.persons[canonicalId]) ids.add(canonicalId);
    }
    return Array.from(ids);
  }, [expandedGraph.nodes, document]);

  const { leftCollapsed, rightCollapsed } = viewConfig?.shellPanels || {
    leftCollapsed: false,
    rightCollapsed: false,
  };
  const timelineOpen = viewConfig?.timelinePanelOpen ?? false;
  const { detailsMode, timelineMode } = viewConfig?.rightStack || {
    detailsMode: "expanded",
    timelineMode: "compact",
  };

  useWorkspacePersistenceEffects({
    document,
    viewConfig,
    visualConfig,
    aiSettings,
    leftCollapsed,
    rightCollapsed,
    saveAutosessionNow,
    graphId: gschemaGraph?.graphId,
    colorTheme: shellController.colorTheme,
  });

  useEffect(() => {
    checkRestoreAvailability();
  }, [checkRestoreAvailability]);

  const { menus, actions: menuActions } = useMenuConfig({
    document,
    viewConfig,
    recentFiles,
    selectedPersonId,
    colorTheme: shellController.colorTheme,
    themeMode: shellController.themeMode,
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
    setShowPdfExport: shellController.setShowPdfExport,
    exportRaster,
    openPersonEditor: shellController.openPersonEditor,
    openAddRelationEditor: shellController.openAddRelationEditor,
    openLocalAiAssistant,
    openGlobalAiAssistant,
    setShowAiSettingsModal,
    undoAiBatch,
    fitToScreen,
    setThemeMode: shellController.setThemeMode,
    setShowColorThemeMenu: shellController.setShowColorThemeMenu,
    toggleShellPanel,
    setTimelinePanelOpen,
    setTimelineScope,
    setTimelineView,
    setDTreeLayoutEngine,
    setShowDiagnostics: shellController.setShowDiagnostics,
    setShowPersonStatsPersonId: shellController.setShowPersonStatsPersonId,
    setShowGlobalStatsPanel: shellController.setShowGlobalStatsPanel,
    clearNodePositions,
    generateScenario: shellController.generateScenario,
    setShowMockTools: shellController.setShowMockTools,
    setShowFamilySearchPanel: shellController.setShowFamilySearchPanel,
    setShowWikiPanel: shellController.setShowWikiPanel,
    setShowAboutModalV3: () => shellController.setShowAboutModalV3(true),
    openPersonWorkspaceV3: (id) => shellController.setWorkspacePersonIdV3(id),
    setColorTheme: shellController.setColorTheme,
    clearRecentFiles,
    menuLayout: shellController.menuLayout,
    setMenuLayout: shellController.setMenuLayout,
  });

  const normalizedDtreeConfig = useMemo(
    () => (viewConfig ? normalizeDtreeConfig(viewConfig.dtree) : undefined),
    [viewConfig],
  );

  const modeBadge = viewConfig ? "DTree V3" : null;

  return (
    <div
      className="app-root-wrapper"
      style={
        {
          "--canvas-bg-custom": shellController.colorTheme.background,
          "--node-fill-custom": shellController.colorTheme.personNode,
          "--node-text-custom": shellController.colorTheme.text,
          "--edge-color-custom": shellController.colorTheme.edges,
        } as React.CSSProperties
      }
    >
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
            menuLayout={shellController.menuLayout}
            onChangeLayout={shellController.setMenuLayout}
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
            appVersion="0.4.5"
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
                selectedPersonId={shellController.workspacePersonId || selectedPersonId}
                detailsMode={detailsMode}
                onToggleDetailsExpanded={() => toggleRightStackSection("details")}
                onEditPerson={shellController.openPersonEditor}
                onViewPersonDetail={(personId) => shellController.setWorkspacePersonId(personId)}
                onAddRelation={shellController.openAddRelationEditor}
                onLinkExistingRelation={(anchorId, type) => shellController.setPicker({ anchorId, type })}
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
                  onTimelineHighlight={shellController.handleTimelineHighlight}
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

              {shellController.pendingKinshipSourceId && document ? (
                <div
                  onClick={() => shellController.setPendingKinshipSourceId(null)}
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
                    boxShadow: "var(--overlay-shadow)",
                  }}
                >
                  Selecciona a otra persona para calcular parentesco con{" "}
                  {document.persons[shellController.pendingKinshipSourceId]?.name}
                </div>
              ) : null}

              {viewConfig ? null : <div className="empty-state">Crea un árbol nuevo o abre un archivo .gsk o .ged.</div>}
              {modeBadge ? <div className="mode-badge">{modeBadge}</div> : null}
              {shellController.showMockTools ? (
                <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, width: 300 }}>
                  <MockToolsPanel />
                </div>
              ) : null}

              <DTreeViewV3
                graph={expandedGraph}
                document={document}
                fitNonce={fitNonce}
                onNodeClick={shellController.handleNodeClick}
                onNodeContextMenu={shellController.handleNodeContextMenu}
                focusPersonId={viewConfig?.focusPersonId ?? null}
                focusFamilyId={viewConfig?.focusFamilyId ?? null}
                selectedPersonId={selectedPersonId}
                colorTheme={shellController.colorTheme}
                dtreeConfig={normalizedDtreeConfig}
                onBgClick={() => shellController.setNodeMenu(null)}
                onBgDoubleClick={() => clearVisualModes()}
                onSvgReady={(svg) => {
                  graphSvgRef.current = svg;
                }}
              />
            </>
          </PanelErrorBoundary>
        }
      />

      <input
        ref={openFileInputRef}
        type="file"
        accept=".gsk,.ged"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void openAndReplace(file);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={importFileInputRef}
        type="file"
        accept=".gsk,.ged"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void importForMerge(file);
          event.currentTarget.value = "";
        }}
      />

      <PanelErrorBoundary panelName="Buscador" onReset={() => shellController.setShowSearchPanel(false)}>
        <SearchCenterPanel
          open={shellController.showSearchPanel}
          document={document}
          onClose={() => shellController.setShowSearchPanel(false)}
          onSelectPerson={(personId) => {
            inspectPerson(personId);
            shellController.setWorkspacePersonId(personId);
          }}
        />
      </PanelErrorBoundary>

      {shellController.showDiagnostics ? (
        <DiagnosticPanel
          document={document}
          parseErrors={parseErrors}
          parseWarnings={parseWarnings}
          onApplyDocument={(doc) => applyProjectedDocument(doc, "merge")}
          onClose={() => shellController.setShowDiagnostics(false)}
          onSelectPerson={(personId) => {
            setSelectedPerson(personId);
            shellController.setShowDiagnostics(false);
          }}
          onSelectFamily={(familyId) => {
            const family = document?.families[familyId];
            const candidate = family?.husbandId || family?.wifeId || family?.childrenIds[0];
            if (candidate) setSelectedPerson(candidate);
            shellController.setShowDiagnostics(false);
          }}
        />
      ) : null}
      {shellController.showPersonStatsPersonId && document ? (
        <PersonStatsPanel
          document={document}
          personId={shellController.showPersonStatsPersonId}
          onClose={() => shellController.setShowPersonStatsPersonId(null)}
        />
      ) : null}
      {shellController.showGlobalStatsPanel && document ? (
        <GlobalStatsPanel
          document={document}
          visiblePersonIds={visiblePersonIds}
          onClose={() => shellController.setShowGlobalStatsPanel(false)}
        />
      ) : null}

      {shellController.showPdfExport ? (
        <div className="modal-overlay" onClick={() => shellController.setShowPdfExport(false)}>
          <div className="modal-panel" style={{ width: 520 }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Exportar PDF</h3>
              <button onClick={() => shellController.setShowPdfExport(false)}>Cerrar</button>
            </div>
            <div className="builder" style={{ marginTop: 8 }}>
              <label>
                Alcance
                <select
                  value={pdfOptions.scope}
                  onChange={(event) =>
                    setPdfOptions((prev) => ({ ...prev, scope: event.target.value as "viewport" | "full" }))
                  }
                >
                  <option value="viewport">Viewport actual</option>
                  <option value="full">Todo lo visible</option>
                </select>
              </label>
              <label>
                Tamaño de papel
                <select
                  value={pdfOptions.paperSize}
                  onChange={(event) =>
                    setPdfOptions((prev) => ({
                      ...prev,
                      paperSize: event.target.value as "A4" | "A3" | "A2" | "A1" | "A0",
                    }))
                  }
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="A2">A2</option>
                  <option value="A1">A1</option>
                  <option value="A0">A0</option>
                </select>
              </label>
              <div className="builder-actions" style={{ justifyContent: "flex-end", marginTop: 24 }}>
                <button className="primary" onClick={() => void exportPdfNow()}>
                  Exportar ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {importIncomingDoc && document ? (
        <MergeReviewErrorBoundary
          onClearDraft={clearMergeDraft}
          onClose={() => {
            shellController.clearMergeFocusOverlay();
            setImportIncomingDoc(null);
          }}
        >
          <ImportReviewPanel
            baseDoc={document}
            incomingDoc={importIncomingDoc}
            initialDraft={mergeDraft}
            onDraftChange={setMergeDraft}
            onFocusChange={shellController.handleMergeFocusChange}
            onApply={handleMergeApply}
            onClose={() => {
              shellController.clearMergeFocusOverlay();
              setImportIncomingDoc(null);
            }}
          />
        </MergeReviewErrorBoundary>
      ) : null}

      {shellController.nodeMenuState ? (
        <NodeActionMenu
          open={Boolean(shellController.nodeMenuState)}
          x={shellController.nodeMenuState.x}
          y={shellController.nodeMenuState.y}
          nodeKind={shellController.nodeMenuState.nodeKind}
          title={shellController.nodeMenuState.title}
          items={shellController.nodeMenuState.items}
          onClose={() => shellController.setNodeMenu(null)}
        />
      ) : null}

      <ColorThemeMenu
        open={shellController.showColorThemeMenu}
        value={shellController.colorTheme}
        onChange={shellController.setColorTheme}
        onReset={() => shellController.setColorTheme(DEFAULT_COLOR_THEME)}
        onClose={() => shellController.setShowColorThemeMenu(false)}
      />

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

      <AboutReleaseModalV3 open={shellController.showAboutModalV3} onClose={() => shellController.setShowAboutModalV3(false)} />
      <PanelErrorBoundary panelName="Wiki" onReset={() => shellController.setShowWikiPanel(false)}>
        <WikiPanel open={shellController.showWikiPanel} onClose={() => shellController.setShowWikiPanel(false)} />
      </PanelErrorBoundary>

      {shellController.showFamilySearchPanel ? (
        <PanelErrorBoundary panelName="FamilySearch" onReset={() => shellController.setShowFamilySearchPanel(false)}>
          <FamilySearchPanel
            onClose={() => shellController.setShowFamilySearchPanel(false)}
            onImport={() => shellController.setShowFamilySearchPanel(false)}
          />
        </PanelErrorBoundary>
      ) : null}

      <PersonDetailPanel
        editorState={shellController.personDetailModal}
        document={document}
        aiSettings={aiSettings}
        onClose={() => shellController.setPersonDetailModal(null)}
        onSaveEdit={updatePersonById}
        onSaveRelation={addRelationFromAnchor}
        onCreateStandalone={createStandalonePerson}
      />

      {shellController.workspacePersonIdV3 && document ? (
        <PersonWorkspacePanelV3
          document={document}
          personId={shellController.workspacePersonIdV3}
          aiSettings={aiSettings}
          onClose={() => shellController.setWorkspacePersonIdV3(null)}
          onSelectPerson={(id) => {
            setSelectedPerson(id);
            shellController.setWorkspacePersonIdV3(id);
          }}
          onSetAsFocus={shellController.focusPersonInCanvas}
          onSavePerson={updatePersonById}
          onSaveFamily={updateFamilyById}
          onCreatePerson={createPersonRecord}
          onQuickAddRelation={(anchorId, type) => {
            shellController.setWorkspacePersonIdV3(null);
            shellController.openAddRelationEditor(anchorId, type);
          }}
        />
      ) : null}

      {shellController.workspacePersonId && document ? (
        <PersonWorkspacePanel
          document={document}
          personId={shellController.workspacePersonId}
          aiSettings={aiSettings}
          onClose={() => shellController.setWorkspacePersonId(null)}
          onSelectPerson={setSelectedPerson}
          onSetAsFocus={shellController.focusPersonInCanvas}
          onSavePerson={updatePersonById}
          onSaveFamily={updateFamilyById}
          onCreatePerson={createPersonRecord}
          onQuickAddRelation={(anchorId, type) => {
            shellController.setWorkspacePersonId(null);
            shellController.openAddRelationEditor(anchorId, type);
          }}
        />
      ) : null}

      {shellController.picker && document ? (
        <PersonPickerModal
          document={document}
          anchorId={shellController.picker.anchorId}
          relationType={shellController.picker.type}
          onLink={(existingPersonId) => {
            if (shellController.picker?.type === "kinship") {
              setOverlay({
                id: "kinship-standard",
                type: "kinship",
                priority: 90,
                config: { person1Id: shellController.picker.anchorId, person2Id: existingPersonId },
              });
              setStatus("Calculando parentesco...");
            } else if (shellController.picker) {
              linkExistingRelation(shellController.picker.anchorId, existingPersonId, shellController.picker.type);
              setStatus("Persona vinculada");
            }
          }}
          onClose={() => shellController.setPicker(null)}
        />
      ) : null}

      {shellController.branchAnchorId && document ? (
        <BranchExtractionModal
          document={document}
          personId={shellController.branchAnchorId}
          onClose={() => shellController.setBranchAnchorId(null)}
          onExport={(direction) => {
            void exportBranchGsk(shellController.branchAnchorId!, direction);
            shellController.setBranchAnchorId(null);
          }}
        />
      ) : null}
    </div>
  );
}
