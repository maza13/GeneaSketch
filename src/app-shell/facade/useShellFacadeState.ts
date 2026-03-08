import { useAppStore } from "@/state/store";
import { useShallow } from "zustand/react/shallow";

export function useShellFacadeState() {
  const baseState = useAppStore(
    useShallow((state) => ({
      genraphGraph: state.genraphGraph,
      graphRevision: state.graphRevision,
      viewConfig: state.viewConfig,
      visualConfig: state.visualConfig,
      expandedGraph: state.expandedGraph,
      selectedPersonId: state.selectedPersonId,
      fitNonce: state.fitNonce,
      recentFiles: state.recentFiles,
      mergeDraft: state.mergeDraft,
      aiSettings: state.aiSettings,
      bootStatus: state.bootStatus,
      restoreNoticeVisible: state.restoreNoticeVisible,
      parseErrors: state.parseErrors,
      parseWarnings: state.parseWarnings,
    })),
  );

  return baseState;
}
