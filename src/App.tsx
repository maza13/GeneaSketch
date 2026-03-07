import { useAppShellFacade } from "@/app-shell/facade/useAppShellFacade";
import { ShellBranchExtractionModal } from "@/app-shell/components/ShellBranchExtractionModal";
import { ShellDiagnosticPanel } from "@/app-shell/components/ShellDiagnosticPanel";
import { ShellGlobalStatsPanel } from "@/app-shell/components/ShellGlobalStatsPanel";
import { ShellPersonPickerModal } from "@/app-shell/components/ShellPersonPickerModal";
import { ShellPersonStatsPanel } from "@/app-shell/components/ShellPersonStatsPanel";
import { ShellSearchCenterPanel } from "@/app-shell/components/ShellSearchCenterPanel";
import { ShellTimelineRightPanel } from "@/app-shell/components/ShellTimelineRightPanel";
import { AboutReleaseModalV3 } from "@/ui/AboutReleaseModalV3";
import { AiAssistantModal } from "@/ui/ai/AiAssistantModal";
import { AiSettingsModal } from "@/ui/ai/AiSettingsModal";
import { ColorThemeMenu } from "@/ui/ColorThemeMenu";
import { FamilySearchPanel } from "@/ui/external/FamilySearchPanel";
import { ImportReviewPanel } from "@/ui/ImportReviewPanel";
import { LeftPanel } from "@/ui/LeftPanel";
import { MergeReviewErrorBoundary } from "@/ui/MergeReviewErrorBoundary";
import { MockToolsPanel } from "@/ui/MockToolsPanel";
import { NodeActionMenu } from "@/ui/NodeActionMenu";
import { PersonDetailPanel } from "@/ui/PersonDetailPanel";
import { PersonWorkspacePanel } from "@/ui/PersonWorkspacePanel";
import { PersonWorkspacePanelV3 } from "@/ui/PersonWorkspacePanelV3";
import { RightPanel } from "@/ui/RightPanel";
import { AppFooter } from "@/ui/shell/AppFooter";
import { AppShell } from "@/ui/shell/AppShell";
import { PanelErrorBoundary } from "@/ui/common/PanelErrorBoundary";
import { TopMenuBar } from "@/ui/TopMenuBar";
import { WikiPanel } from "@/ui/WikiPanel";
import { DTreeViewV3 } from "@/views/DTreeViewV3";

export function App() {
  const facade = useAppShellFacade();

  return (
    <div className="app-root-wrapper" style={facade.chrome.appRootStyle}>
      <AppShell
        leftCollapsed={facade.chrome.leftCollapsed}
        rightCollapsed={facade.chrome.rightCollapsed}
        detailsMode={facade.chrome.detailsMode}
        timelineMode={facade.chrome.timelineMode}
        onToggleLeft={facade.chrome.shellCommands.onToggleLeft}
        onToggleRight={facade.chrome.shellCommands.onToggleRight}
        topbar={
          <TopMenuBar
            menus={facade.chrome.topbar.menus}
            actions={facade.chrome.topbar.actions}
            menuLayout={facade.chrome.topbar.menuLayout}
            onChangeLayout={facade.chrome.topbar.onChangeLayout}
          />
        }
        footer={
          <AppFooter
            statusMessage={facade.chrome.footer.statusMessage}
            personCount={facade.chrome.footer.personCount}
            familyCount={facade.chrome.footer.familyCount}
            sourceCount={facade.chrome.footer.sourceCount}
            engineMode={facade.chrome.footer.engineMode}
            isSaved={facade.chrome.footer.isSaved}
            appVersion={facade.chrome.footer.appVersion}
          />
        }
        leftPanel={
          <PanelErrorBoundary panelName="Panel izquierdo">
            <LeftPanel viewModel={facade.chrome.leftPanel.viewModel} commands={facade.chrome.leftPanel.commands} />
          </PanelErrorBoundary>
        }
        rightPanel={
          <PanelErrorBoundary panelName="Panel derecho">
            <>
              <RightPanel
                viewModel={facade.chrome.rightPanel.viewModel}
                detailsMode={facade.chrome.detailsMode}
                onToggleDetailsExpanded={facade.chrome.rightPanel.commands.onToggleDetailsExpanded}
                onEditPerson={facade.chrome.rightPanel.commands.onEditPerson}
                onViewPersonDetail={facade.chrome.rightPanel.commands.onViewPersonDetail}
                onAddRelation={facade.chrome.rightPanel.commands.onAddRelation}
                onLinkExistingRelation={facade.chrome.rightPanel.commands.onLinkExistingRelation}
                onUnlinkRelation={facade.chrome.rightPanel.commands.onUnlinkRelation}
              />
              {facade.features.timeline.viewModel.isOpen ? (
                <ShellTimelineRightPanel viewModel={facade.features.timeline.viewModel} commands={facade.features.timeline.commands} />
              ) : null}
            </>
          </PanelErrorBoundary>
        }
        canvas={
          <PanelErrorBoundary panelName="Canvas principal">
            <>
              {facade.workspace.restoreBanner.visible ? (
                <div className="restore-banner">
                  <span>Se encontro sesion previa.</span>
                  <button onClick={() => void facade.workspace.restoreBanner.onRestore()}>Continuar sesion</button>
                  <button onClick={() => void facade.workspace.restoreBanner.onClear()}>Nueva sesion</button>
                </div>
              ) : null}

              {facade.workspace.exportWarningsBanner.visible ? (
                <div className="restore-banner" style={{ marginTop: 6, justifyContent: "space-between" }}>
                  <span>Exportacion legacy con advertencias: {facade.workspace.exportWarningsBanner.count}</span>
                  <button onClick={facade.workspace.exportWarningsBanner.onDismiss}>Ocultar</button>
                </div>
              ) : null}

              {facade.workspace.banners.aiUndo.visible ? (
                <div className="restore-banner" style={{ marginTop: 6, justifyContent: "space-between" }}>
                  <span>Ultimo lote IA disponible para deshacer.</span>
                  <button onClick={facade.workspace.banners.aiUndo.onUndo}>Deshacer lote IA</button>
                </div>
              ) : null}

              {facade.workspace.banners.kinship.visible ? (
                <div
                  onClick={facade.workspace.banners.kinship.onDismiss}
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
                  {facade.workspace.banners.kinship.message}
                </div>
              ) : null}

              {facade.features.canvas.documentView ? null : <div className="empty-state">Crea un arbol nuevo o abre un archivo .gsk o .ged.</div>}
              {facade.features.canvas.modeBadge ? <div className="mode-badge">{facade.features.canvas.modeBadge}</div> : null}
              {facade.features.canvas.showMockTools ? (
                <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, width: 300 }}>
                  <MockToolsPanel />
                </div>
              ) : null}

              <DTreeViewV3
                graph={facade.features.canvas.graph}
                document={facade.features.canvas.documentView}
                fitNonce={facade.features.canvas.fitNonce}
                onNodeClick={facade.features.canvas.commands.onNodeClick}
                onNodeContextMenu={facade.features.canvas.commands.onNodeContextMenu}
                focusPersonId={facade.features.canvas.focusPersonId}
                focusFamilyId={facade.features.canvas.focusFamilyId}
                selectedPersonId={facade.features.canvas.selectedPersonId}
                colorTheme={facade.features.canvas.colorTheme}
                dtreeConfig={facade.features.canvas.dtreeConfig}
                onBgClick={facade.features.canvas.commands.onBgClick}
                onBgDoubleClick={facade.features.canvas.commands.onBgDoubleClick}
                onSvgReady={facade.features.canvas.commands.onSvgReady}
              />
            </>
          </PanelErrorBoundary>
        }
      />

      <input ref={facade.workspace.hiddenInputs.openFile.ref} type="file" accept=".gsk,.ged" className="hidden" onChange={facade.workspace.hiddenInputs.openFile.onChange} />
      <input ref={facade.workspace.hiddenInputs.importFile.ref} type="file" accept=".gsk,.ged" className="hidden" onChange={facade.workspace.hiddenInputs.importFile.onChange} />

      <PanelErrorBoundary panelName="Buscador">
        <ShellSearchCenterPanel viewModel={facade.navigation.search.viewModel} commands={facade.navigation.search.commands} />
      </PanelErrorBoundary>

      {facade.features.diagnostics.open ? <ShellDiagnosticPanel viewModel={facade.features.diagnostics.viewModel} commands={facade.features.diagnostics.commands} /> : null}
      {facade.features.personStats.open ? <ShellPersonStatsPanel viewModel={facade.features.personStats.viewModel} onClose={facade.features.personStats.onClose} /> : null}
      {facade.features.globalStats.open ? <ShellGlobalStatsPanel viewModel={facade.features.globalStats.viewModel} onClose={facade.features.globalStats.onClose} /> : null}

      {facade.workspace.pdfExport.open ? (
        <div className="modal-overlay" onClick={facade.workspace.pdfExport.onClose}>
          <div className="modal-panel" style={{ width: 520 }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Exportar PDF</h3>
              <button onClick={facade.workspace.pdfExport.onClose}>Cerrar</button>
            </div>
            <div className="builder" style={{ marginTop: 8 }}>
              <label>
                Alcance
                <select value={facade.workspace.pdfExport.options.scope} onChange={(event) => facade.workspace.pdfExport.onScopeChange(event.target.value as "viewport" | "full")}>
                  <option value="viewport">Viewport actual</option>
                  <option value="full">Todo lo visible</option>
                </select>
              </label>
              <label>
                Tamano de papel
                <select value={facade.workspace.pdfExport.options.paperSize} onChange={(event) => facade.workspace.pdfExport.onPaperSizeChange(event.target.value as typeof facade.workspace.pdfExport.options.paperSize)}>
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="A2">A2</option>
                  <option value="A1">A1</option>
                  <option value="A0">A0</option>
                </select>
              </label>
              <div className="builder-actions" style={{ justifyContent: "flex-end", marginTop: 24 }}>
                <button className="primary" onClick={() => void facade.workspace.pdfExport.onExportNow()}>Exportar ahora</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {facade.workspace.importReview.open && facade.workspace.importReview.baseDocument && facade.workspace.importReview.incomingDocument ? (
        <MergeReviewErrorBoundary onClearDraft={facade.workspace.importReview.onClearDraft} onClose={facade.workspace.importReview.onClose}>
          <ImportReviewPanel
            baseDoc={facade.workspace.importReview.baseDocument}
            incomingDoc={facade.workspace.importReview.incomingDocument}
            initialDraft={facade.workspace.importReview.initialDraft}
            onDraftChange={facade.workspace.importReview.onDraftChange}
            onFocusChange={facade.workspace.importReview.onFocusChange}
            onApply={facade.workspace.importReview.onApply}
            onClose={facade.workspace.importReview.onClose}
          />
        </MergeReviewErrorBoundary>
      ) : null}

      {facade.navigation.nodeMenu.state ? (
        <NodeActionMenu
          open={facade.navigation.nodeMenu.state.open}
          x={facade.navigation.nodeMenu.state.x}
          y={facade.navigation.nodeMenu.state.y}
          nodeKind={facade.navigation.nodeMenu.state.nodeKind}
          title={facade.navigation.nodeMenu.state.title}
          items={facade.navigation.nodeMenu.state.items}
          onClose={facade.navigation.nodeMenu.onClose}
        />
      ) : null}

      <ColorThemeMenu
        open={facade.chrome.colorThemeMenu.open}
        value={facade.chrome.colorThemeMenu.value}
        onChange={facade.chrome.colorThemeMenu.onChange}
        onReset={facade.chrome.colorThemeMenu.onReset}
        onClose={facade.chrome.colorThemeMenu.onClose}
      />

      <AiSettingsModal
        open={facade.features.ai.settingsModal.open}
        settings={facade.features.ai.settingsModal.settings}
        onSave={facade.features.ai.settingsModal.onSave}
        onClose={facade.features.ai.settingsModal.onClose}
        onStatus={facade.features.ai.settingsModal.onStatus}
      />

      <AiAssistantModal
        open={facade.features.ai.assistantModal.open}
        context={facade.features.ai.assistantModal.context}
        document={facade.features.ai.assistantModal.documentView}
        settings={facade.features.ai.assistantModal.settings}
        onClose={facade.features.ai.assistantModal.onClose}
        onStatus={facade.features.ai.assistantModal.onStatus}
        onApplyBatch={facade.features.ai.assistantModal.onApplyBatch}
        onOpenSettings={facade.features.ai.assistantModal.onOpenSettings}
      />

      <AboutReleaseModalV3 open={facade.chrome.dialogs.about.open} onClose={facade.chrome.dialogs.about.onClose} />
      <PanelErrorBoundary panelName="Wiki">
        <WikiPanel open={facade.chrome.dialogs.wiki.open} onClose={facade.chrome.dialogs.wiki.onClose} />
      </PanelErrorBoundary>

      {facade.chrome.dialogs.familySearch.open ? (
        <PanelErrorBoundary panelName="FamilySearch">
          <FamilySearchPanel onClose={facade.chrome.dialogs.familySearch.onClose} onImport={facade.chrome.dialogs.familySearch.onImport} />
        </PanelErrorBoundary>
      ) : null}

      <PersonDetailPanel
        editorState={facade.features.personEditor.viewModel.editorState}
        document={facade.features.personEditor.viewModel.documentView}
        aiSettings={facade.features.personEditor.viewModel.aiSettings}
        onClose={facade.features.personEditor.commands.onClose}
        onSaveEdit={facade.features.personEditor.commands.onSaveEdit}
        onSaveRelation={facade.features.personEditor.commands.onSaveRelation}
        onCreateStandalone={facade.features.personEditor.commands.onCreateStandalone}
      />

      {facade.features.personWorkspaceV3.open && facade.features.personWorkspaceV3.viewModel ? (
        <PersonWorkspacePanelV3
          document={facade.features.personWorkspaceV3.viewModel.documentView}
          personId={facade.features.personWorkspaceV3.viewModel.personId}
          aiSettings={facade.features.personWorkspaceV3.viewModel.aiSettings}
          onClose={facade.features.personWorkspaceV3.commands.onClose}
          onSelectPerson={facade.features.personWorkspaceV3.commands.onSelectPerson}
          onSetAsFocus={facade.features.personWorkspaceV3.commands.onSetAsFocus}
          onSavePerson={facade.features.personWorkspaceV3.commands.onSavePerson}
          onSaveFamily={facade.features.personWorkspaceV3.commands.onSaveFamily}
          onCreatePerson={facade.features.personWorkspaceV3.commands.onCreatePerson}
          onQuickAddRelation={facade.features.personWorkspaceV3.commands.onQuickAddRelation}
        />
      ) : null}

      {facade.features.personWorkspace.open && facade.features.personWorkspace.viewModel ? (
        <PersonWorkspacePanel
          document={facade.features.personWorkspace.viewModel.documentView}
          personId={facade.features.personWorkspace.viewModel.personId}
          aiSettings={facade.features.personWorkspace.viewModel.aiSettings}
          onClose={facade.features.personWorkspace.commands.onClose}
          onSelectPerson={facade.features.personWorkspace.commands.onSelectPerson}
          onSetAsFocus={facade.features.personWorkspace.commands.onSetAsFocus}
          onSavePerson={facade.features.personWorkspace.commands.onSavePerson}
          onSaveFamily={facade.features.personWorkspace.commands.onSaveFamily}
          onCreatePerson={facade.features.personWorkspace.commands.onCreatePerson}
          onQuickAddRelation={facade.features.personWorkspace.commands.onQuickAddRelation}
        />
      ) : null}

      <ShellPersonPickerModal viewModel={facade.features.personPicker.viewModel} onLink={facade.features.personPicker.onLink} onClose={facade.features.personPicker.onClose} />
      <ShellBranchExtractionModal viewModel={facade.features.branchExport.viewModel} onExport={facade.features.branchExport.onExport} onClose={facade.features.branchExport.onClose} />
    </div>
  );
}
