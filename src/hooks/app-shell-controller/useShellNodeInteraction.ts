import { useCallback } from "react";
import { resolveNodeClickRouting } from "@/core/kindra/nodeClickRouting";
import { useNodeActions } from "@/hooks/useNodeActions";
import type { PendingRelationType } from "@/types/domain";
import type { NodeInteraction, PersonEditorState } from "@/types/editor";
import type { AppShellControllerParams, PickerState } from "./types";

type WorkspaceState = {
  nodeMenu: NodeInteraction | null;
  setNodeMenu: (interaction: NodeInteraction | null) => void;
  pendingKinshipSourceId: string | null;
  setPendingKinshipSourceId: (id: string | null) => void;
  setPersonDetailModal: (state: PersonEditorState) => void;
  setPicker: (picker: PickerState | null) => void;
  setWorkspacePersonId: (id: string | null) => void;
  setBranchAnchorId: (id: string | null) => void;
};

type OverlayActions = {
  clearMergeFocusOverlay: () => void;
};

export function useShellNodeInteraction(
  params: AppShellControllerParams,
  workspaceState: WorkspaceState,
  overlayActions: OverlayActions,
) {
  const openPersonEditor = useCallback(
    (id: string) => {
      if (!params.document) return;
      const person = params.document.persons[id];
      if (!person) return;
      workspaceState.setPersonDetailModal({ type: "edit", personId: id, person });
    },
    [params.document, workspaceState],
  );

  const openAddRelationEditor = useCallback(
    (anchorId: string, type: PendingRelationType | "kinship") => {
      if (!params.document) return;
      if (type === "kinship") {
        workspaceState.setPicker({ anchorId, type });
        return;
      }
      const anchorPerson = params.document.persons[anchorId];
      if (!anchorPerson) return;
      workspaceState.setPersonDetailModal({ type: "add_relation", anchorId, anchorPerson, relationType: type });
    },
    [params.document, workspaceState],
  );

  const focusPersonInCanvas = useCallback(
    (personId: string) => {
      params.setSelectedPerson(personId);
      workspaceState.setNodeMenu(null);
      setTimeout(() => params.fitToScreen(), 0);
    },
    [params, workspaceState],
  );

  const selectPersonSoft = useCallback(
    (personId: string) => {
      params.inspectPerson(personId);
      workspaceState.setNodeMenu(null);
    },
    [params, workspaceState],
  );

  const handleNodeClick = useCallback(
    (interaction: NodeInteraction) => {
      const heatmapOverlayCandidate = params.viewConfig?.kindra?.overlays.find((overlay) => overlay.type === "heatmap");
      const heatmapOverlay = heatmapOverlayCandidate?.type === "heatmap" ? heatmapOverlayCandidate : null;
      const decision = resolveNodeClickRouting({
        interaction,
        pendingKinshipSourceId: workspaceState.pendingKinshipSourceId,
        heatmapOverlay,
      });

      if (decision.nextOverlay) params.setOverlay(decision.nextOverlay);
      if (decision.inspectPersonId) params.inspectPerson(decision.inspectPersonId);
      if (decision.statusMessage) params.setStatus(decision.statusMessage);
      if (decision.clearPendingKinship) workspaceState.setPendingKinshipSourceId(null);
      if (decision.consume) return;
      workspaceState.setNodeMenu(interaction);
    },
    [params, workspaceState],
  );

  const handleNodeContextMenu = useCallback(
    (interaction: NodeInteraction) => {
      if (interaction.nodeKind === "person") params.inspectPerson(interaction.nodeId);
      workspaceState.setNodeMenu(interaction);
    },
    [params, workspaceState],
  );

  const nodeMenuState = useNodeActions({
    nodeMenu: workspaceState.nodeMenu,
    document: params.document,
    viewConfig: params.viewConfig,
    setWorkspacePersonId: workspaceState.setWorkspacePersonId,
    focusPersonInCanvas,
    openPersonEditor,
    openAddRelationEditor,
    clearOverlayType: params.clearOverlayType,
    setOverlay: params.setOverlay,
    setStatus: params.setStatus,
    toggleKindraNodeCollapse: params.toggleKindraNodeCollapse,
    setBranchAnchorId: workspaceState.setBranchAnchorId,
    openLocalAiAssistant: params.openLocalAiAssistant,
    setPendingKinshipSourceId: workspaceState.setPendingKinshipSourceId,
    setPicker: workspaceState.setPicker,
    selectPersonSoft,
    setFocusFamilyId: params.setFocusFamilyId,
    inspectPerson: params.inspectPerson,
  });

  return {
    openPersonEditor,
    openAddRelationEditor,
    focusPersonInCanvas,
    selectPersonSoft,
    handleNodeClick,
    handleNodeContextMenu,
    nodeMenuState,
    clearMergeFocusOverlay: overlayActions.clearMergeFocusOverlay,
  };
}
