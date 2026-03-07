import { lazy, Suspense } from "react";
import type { ShellFeaturesFacade, ShellWorkspaceFacade } from "@/app-shell/facade/types";
import { MergeReviewErrorBoundary } from "@/ui/MergeReviewErrorBoundary";

const ImportReviewPanel = lazy(() => import("@/ui/ImportReviewPanel").then((module) => ({ default: module.ImportReviewPanel })));
const PersonDetailPanel = lazy(() => import("@/ui/PersonDetailPanel").then((module) => ({ default: module.PersonDetailPanel })));
const PersonWorkspacePanel = lazy(() => import("@/ui/PersonWorkspacePanel").then((module) => ({ default: module.PersonWorkspacePanel })));
const PersonWorkspacePanelV3 = lazy(() => import("@/ui/PersonWorkspacePanelV3").then((module) => ({ default: module.PersonWorkspacePanelV3 })));

type Props = {
  workspace: Pick<ShellWorkspaceFacade, "hiddenInputs" | "pdfExport" | "importReview">;
  personEditor: ShellFeaturesFacade["personEditor"];
  personWorkspace: ShellFeaturesFacade["personWorkspace"];
  personWorkspaceV3: ShellFeaturesFacade["personWorkspaceV3"];
};

const PDF_PANEL_STYLE = { width: 520 } as const;
const PDF_ACTIONS_STYLE = { justifyContent: "flex-end", marginTop: 24 } as const;
const PDF_BUILDER_STYLE = { marginTop: 8 } as const;

export function ShellWorkspaceOverlays({
  workspace,
  personEditor,
  personWorkspace,
  personWorkspaceV3,
}: Props) {
  return (
    <>
      <input
        ref={workspace.hiddenInputs.openFile.ref}
        type="file"
        accept=".gsk,.ged"
        className="hidden"
        onChange={workspace.hiddenInputs.openFile.onChange}
      />
      <input
        ref={workspace.hiddenInputs.importFile.ref}
        type="file"
        accept=".gsk,.ged"
        className="hidden"
        onChange={workspace.hiddenInputs.importFile.onChange}
      />

      {workspace.pdfExport.open ? (
        <div className="modal-overlay" onClick={workspace.pdfExport.onClose}>
          <div className="modal-panel" style={PDF_PANEL_STYLE} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Exportar PDF</h3>
              <button onClick={workspace.pdfExport.onClose}>Cerrar</button>
            </div>
            <div className="builder" style={PDF_BUILDER_STYLE}>
              <label>
                Alcance
                <select
                  value={workspace.pdfExport.options.scope}
                  onChange={(event) => workspace.pdfExport.onScopeChange(event.target.value as "viewport" | "full")}
                >
                  <option value="viewport">Viewport actual</option>
                  <option value="full">Todo lo visible</option>
                </select>
              </label>
              <label>
                Tamano de papel
                <select
                  value={workspace.pdfExport.options.paperSize}
                  onChange={(event) => workspace.pdfExport.onPaperSizeChange(event.target.value as typeof workspace.pdfExport.options.paperSize)}
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="A2">A2</option>
                  <option value="A1">A1</option>
                  <option value="A0">A0</option>
                </select>
              </label>
              <div className="builder-actions" style={PDF_ACTIONS_STYLE}>
                <button className="primary" onClick={() => void workspace.pdfExport.onExportNow()}>Exportar ahora</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Suspense fallback={null}>
        {workspace.importReview.open
        && workspace.importReview.viewModel.baseDocument
        && workspace.importReview.viewModel.incomingDocument ? (
          <MergeReviewErrorBoundary onClearDraft={workspace.importReview.onClearDraft} onClose={workspace.importReview.onClose}>
            <ImportReviewPanel
              viewModel={workspace.importReview.viewModel}
              onDraftChange={workspace.importReview.onDraftChange}
              onFocusChange={workspace.importReview.onFocusChange}
              onApply={workspace.importReview.onApply}
              onClose={workspace.importReview.onClose}
            />
          </MergeReviewErrorBoundary>
        ) : null}

        {personEditor.viewModel.editorState ? (
          <PersonDetailPanel viewModel={personEditor.viewModel} commands={personEditor.commands} />
        ) : null}

        {personWorkspaceV3.open && personWorkspaceV3.viewModel ? (
          <PersonWorkspacePanelV3 viewModel={personWorkspaceV3.viewModel} commands={personWorkspaceV3.commands} />
        ) : null}

        {personWorkspace.open && personWorkspace.viewModel ? (
          <PersonWorkspacePanel viewModel={personWorkspace.viewModel} commands={personWorkspace.commands} />
        ) : null}
      </Suspense>
    </>
  );
}
