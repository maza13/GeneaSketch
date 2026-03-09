import { useEffect, useState } from "react";
import type { NodeInteraction, PersonEditorState } from "@/types/editor";
import type { PickerState } from "./types";
import type { WorkspaceWindowState } from "@/app-shell/facade/types";

const WORKSPACE_WINDOW_STORAGE_KEY = "geneasketch.shell.workspaceWindowState";
const DEFAULT_WORKSPACE_WINDOW_STATE: WorkspaceWindowState = {
  x: 56,
  y: 40,
  width: 1120,
  height: 760,
};

function readWorkspaceWindowState(): WorkspaceWindowState {
  try {
    const raw = globalThis.localStorage?.getItem(WORKSPACE_WINDOW_STORAGE_KEY);
    if (!raw) return DEFAULT_WORKSPACE_WINDOW_STATE;
    const parsed = JSON.parse(raw) as Partial<WorkspaceWindowState>;
    if (
      typeof parsed.x === "number"
      && typeof parsed.y === "number"
      && typeof parsed.width === "number"
      && typeof parsed.height === "number"
    ) {
      return {
        x: parsed.x,
        y: parsed.y,
        width: parsed.width,
        height: parsed.height,
      };
    }
  } catch {
    // noop
  }
  return DEFAULT_WORKSPACE_WINDOW_STATE;
}

export function useShellWorkspaceState() {
  const [branchAnchorId, setBranchAnchorId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [pendingKinshipSourceId, setPendingKinshipSourceId] = useState<string | null>(null);
  const [personDetailModal, setPersonDetailModal] = useState<PersonEditorState>(null);
  const [workspacePersonIdV3, setWorkspacePersonIdV3] = useState<string | null>(null);
  const [workspaceWindowState, setWorkspaceWindowState] = useState<WorkspaceWindowState>(readWorkspaceWindowState);
  const [nodeMenu, setNodeMenu] = useState<NodeInteraction | null>(null);
  const [showPersonStatsPersonId, setShowPersonStatsPersonId] = useState<string | null>(null);
  const [showGlobalStatsPanel, setShowGlobalStatsPanel] = useState(false);

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(WORKSPACE_WINDOW_STORAGE_KEY, JSON.stringify(workspaceWindowState));
    } catch {
      // noop
    }
  }, [workspaceWindowState]);

  return {
    branchAnchorId,
    setBranchAnchorId,
    picker,
    setPicker,
    pendingKinshipSourceId,
    setPendingKinshipSourceId,
    personDetailModal,
    setPersonDetailModal,
    workspacePersonIdV3,
    setWorkspacePersonIdV3,
    workspaceWindowState,
    setWorkspaceWindowState,
    nodeMenu,
    setNodeMenu,
    showPersonStatsPersonId,
    setShowPersonStatsPersonId,
    showGlobalStatsPanel,
    setShowGlobalStatsPanel,
  };
}
