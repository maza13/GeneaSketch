import { useAppShellShortcuts } from "@/hooks/useAppShellShortcuts";
import { useWorkspacePersistenceEffects } from "@/hooks/useWorkspacePersistenceEffects";
import type { GraphDocument } from "@/core/read-model/types";
import type { GenraphGraph } from "@/core/genraph";
import type { AiSettings } from "@/types/ai";
import type { MergeDraftSnapshot } from "@/types/merge-draft";
import type { ViewConfig, VisualConfig } from "@/types/domain";
import type { ShellFacadeRuntime } from "./runtimeTypes";
import { useShellSessionFlow } from "./useShellSessionFlow";

type Params = {
  document: GraphDocument | null;
  genraphGraph: GenraphGraph | null;
  viewConfig: ViewConfig | null;
  visualConfig: VisualConfig;
  selectedPersonId: string | null;
  aiSettings: AiSettings;
  mergeDraft: MergeDraftSnapshot | null;
  bootStatus: "checking" | "restoring" | "ready";
  restoreNoticeVisible: boolean;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  graphId: string | undefined;
  runtime: ShellFacadeRuntime;
  actions: {
    goBack: () => void;
    goForward: () => void;
    fitToScreen: () => void;
    toggleShellPanel: (side: "left" | "right") => void;
    setTimelinePanelOpen: (open: boolean) => void;
    bootstrapSession: () => Promise<void>;
    dismissRestoreNotice: () => void;
    clearSession: () => Promise<void>;
    createNewTreeDoc: () => void;
    setSelectedPerson: (personId: string | null) => void;
    saveAutosessionNow: () => Promise<void>;
  };
};

export function useShellFacadeEffects(params: Params) {
  useAppShellShortcuts({
    colorTheme: params.runtime.shellController.colorTheme,
    document: params.document,
    selectedPersonId: params.selectedPersonId,
    viewConfig: params.viewConfig,
    saveGsk: params.runtime.gsk.saveGsk,
    openFilePicker: () => params.runtime.refs.openFileInputRef.current?.click(),
    goBack: params.actions.goBack,
    goForward: params.actions.goForward,
    fitToScreen: params.actions.fitToScreen,
    focusPersonInCanvas: params.runtime.shellController.focusPersonInCanvas,
    onOpenAiSettings: () => params.runtime.ai.setShowAiSettingsModal(true),
    toggleShellPanel: params.actions.toggleShellPanel,
    setTimelinePanelOpen: params.actions.setTimelinePanelOpen,
    onEscape: () => {
      params.runtime.shellController.setNodeMenu(null);
      params.runtime.shellController.setShowSearchPanel(false);
    },
    onFocusSearch: () => {
      params.runtime.shellController.setShowSearchPanel(true);
      const search = window.document.getElementById("search-center-input") as HTMLInputElement | null;
      search?.focus();
    },
  });

  useWorkspacePersistenceEffects({
    document: params.document,
    viewConfig: params.viewConfig,
    visualConfig: params.visualConfig,
    aiSettings: params.aiSettings,
    leftCollapsed: params.leftCollapsed,
    rightCollapsed: params.rightCollapsed,
    saveAutosessionNow: params.actions.saveAutosessionNow,
    graphId: params.graphId,
    colorTheme: params.runtime.shellController.colorTheme,
  });

  return useShellSessionFlow({
    bootStatus: params.bootStatus,
    restoreNoticeVisible: params.restoreNoticeVisible,
    document: params.document,
    genraphGraph: params.genraphGraph,
    bootstrapSession: params.actions.bootstrapSession,
    dismissRestoreNotice: params.actions.dismissRestoreNotice,
    clearSession: params.actions.clearSession,
    createNewTreeDoc: params.actions.createNewTreeDoc,
    setSelectedPerson: params.actions.setSelectedPerson,
    fitToScreen: params.actions.fitToScreen,
    openPersonEditor: params.runtime.shellController.openPersonEditor,
    setStatus: params.runtime.gsk.setStatus,
  });
}
