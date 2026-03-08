import { useState } from "react";
import type { NodeInteraction, PersonEditorState } from "@/types/editor";
import type { PickerState } from "./types";

export function useShellWorkspaceState() {
  const [branchAnchorId, setBranchAnchorId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [pendingKinshipSourceId, setPendingKinshipSourceId] = useState<string | null>(null);
  const [personDetailModal, setPersonDetailModal] = useState<PersonEditorState>(null);
  const [workspacePersonId, setWorkspacePersonId] = useState<string | null>(null);
  const [workspacePersonIdV3, setWorkspacePersonIdV3] = useState<string | null>(null);
  const [nodeMenu, setNodeMenu] = useState<NodeInteraction | null>(null);
  const [showPersonStatsPersonId, setShowPersonStatsPersonId] = useState<string | null>(null);
  const [showGlobalStatsPanel, setShowGlobalStatsPanel] = useState(false);

  return {
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
    showPersonStatsPersonId,
    setShowPersonStatsPersonId,
    showGlobalStatsPanel,
    setShowGlobalStatsPanel,
  };
}
