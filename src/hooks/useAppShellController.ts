import { useMemo } from "react";
import { useShellChromeState } from "@/hooks/app-shell-controller/useShellChromeState";
import { useShellWorkspaceState } from "@/hooks/app-shell-controller/useShellWorkspaceState";
import { useShellOverlayInteraction } from "@/hooks/app-shell-controller/useShellOverlayInteraction";
import { useShellNodeInteraction } from "@/hooks/app-shell-controller/useShellNodeInteraction";
import { useShellScenarioTools } from "@/hooks/app-shell-controller/useShellScenarioTools";
import type { AppShellControllerParams } from "@/hooks/app-shell-controller/types";

export { DEFAULT_COLOR_THEME } from "@/hooks/app-shell-controller/types";
export type { MenuLayout, PickerState, ThemeMode } from "@/hooks/app-shell-controller/types";

export function useAppShellController(params: AppShellControllerParams) {
  const chromeState = useShellChromeState();
  const workspaceState = useShellWorkspaceState();
  const overlayInteraction = useShellOverlayInteraction(params);
  const nodeInteraction = useShellNodeInteraction(params, workspaceState, {
    clearMergeFocusOverlay: overlayInteraction.clearMergeFocusOverlay,
  });
  const scenarioTools = useShellScenarioTools(params);

  return useMemo(
    () => ({
      ...chromeState,
      ...workspaceState,
      nodeMenuState: nodeInteraction.nodeMenuState,
      clearMergeFocusOverlay: overlayInteraction.clearMergeFocusOverlay,
      openPersonEditor: nodeInteraction.openPersonEditor,
      openAddRelationEditor: nodeInteraction.openAddRelationEditor,
      handleTimelineHighlight: overlayInteraction.handleTimelineHighlight,
      focusPersonInCanvas: nodeInteraction.focusPersonInCanvas,
      selectPersonSoft: nodeInteraction.selectPersonSoft,
      handleNodeClick: nodeInteraction.handleNodeClick,
      handleNodeContextMenu: nodeInteraction.handleNodeContextMenu,
      handleMergeFocusChange: overlayInteraction.handleMergeFocusChange,
      generateScenario: scenarioTools.generateScenario,
    }),
    [chromeState, workspaceState, nodeInteraction, overlayInteraction, scenarioTools],
  );
}
