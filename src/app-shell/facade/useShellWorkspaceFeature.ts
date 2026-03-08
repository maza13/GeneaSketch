import type { ChangeEventHandler, RefObject } from "react";
import type { AppShellFacade, ImportReviewViewModel } from "./types";
import type { GraphDocument } from "@/core/read-model/types";
import type { MergeDraftSnapshot } from "@/types/merge-draft";
import type { MergeFocusPayload } from "@/core/edit/mergeFocus";

type Params = {
  bootStatus: AppShellFacade["workspace"]["boot"]["status"];
  openFileInputRef: RefObject<HTMLInputElement>;
  importFileInputRef: RefObject<HTMLInputElement>;
  openAndReplace: (file: File) => Promise<unknown>;
  importForMerge: (file: File) => Promise<unknown>;
  restoreBanner: AppShellFacade["workspace"]["restoreBanner"];
  exportWarningsCount: number;
  dismissExportWarnings: () => void;
  showPdfExport: boolean;
  pdfOptions: AppShellFacade["workspace"]["pdfExport"]["options"];
  setPdfScope: (scope: AppShellFacade["workspace"]["pdfExport"]["options"]["scope"]) => void;
  setPdfPaperSize: (paperSize: AppShellFacade["workspace"]["pdfExport"]["options"]["paperSize"]) => void;
  exportPdfNow: AppShellFacade["workspace"]["pdfExport"]["onExportNow"];
  closePdfExport: () => void;
  importIncomingDoc: GraphDocument | null;
  document: GraphDocument | null;
  importReviewViewModel: ImportReviewViewModel;
  clearMergeFocus: () => void;
  setMergeDraft: (draft: MergeDraftSnapshot | null) => void;
  onFocusChange: (focus: MergeFocusPayload | null) => void;
  onApply: AppShellFacade["workspace"]["importReview"]["onApply"];
  onClearImportIncomingDoc: () => void;
  clearMergeDraft: () => void;
  aiUndoVisible: boolean;
  undoAiBatch: () => void;
  kinshipVisible: boolean;
  kinshipMessage: string;
  dismissKinship: () => void;
};

function makeHiddenInputHandler(handler: (file: File) => Promise<unknown>): ChangeEventHandler<HTMLInputElement> {
  return (event) => {
    const file = event.currentTarget.files?.[0];
    if (file) void handler(file);
    event.currentTarget.value = "";
  };
}

export function useShellWorkspaceFeature(params: Params): AppShellFacade["workspace"] {
  return {
    boot: {
      status: params.bootStatus,
    },
    hiddenInputs: {
      openFile: {
        ref: params.openFileInputRef,
        onChange: makeHiddenInputHandler(params.openAndReplace),
      },
      importFile: {
        ref: params.importFileInputRef,
        onChange: makeHiddenInputHandler(params.importForMerge),
      },
    },
    restoreBanner: params.restoreBanner,
    exportWarningsBanner: {
      visible: params.exportWarningsCount > 0,
      count: params.exportWarningsCount,
      onDismiss: params.dismissExportWarnings,
    },
    pdfExport: {
      open: params.showPdfExport,
      options: params.pdfOptions,
      onScopeChange: params.setPdfScope,
      onPaperSizeChange: params.setPdfPaperSize,
      onExportNow: params.exportPdfNow,
      onClose: params.closePdfExport,
    },
    importReview: {
      open: Boolean(params.importIncomingDoc && params.document),
      viewModel: params.importReviewViewModel,
      clearMergeFocus: params.clearMergeFocus,
      onDraftChange: params.setMergeDraft,
      onFocusChange: params.onFocusChange,
      onApply: params.onApply,
      onClose: () => {
        params.clearMergeFocus();
        params.onClearImportIncomingDoc();
      },
      onClearDraft: params.clearMergeDraft,
    },
    banners: {
      aiUndo: {
        visible: params.aiUndoVisible,
        onUndo: params.undoAiBatch,
      },
      kinship: {
        visible: params.kinshipVisible,
        message: params.kinshipMessage,
        onDismiss: params.dismissKinship,
      },
    },
  };
}
