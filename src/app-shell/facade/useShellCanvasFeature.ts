import type { AppShellFacade } from "./types";
import type { GraphDocument } from "@/core/read-model/types";
import type { ExpandedGraph, ViewConfig } from "@/types/domain";
import type { ColorThemeConfig, NodeInteraction } from "@/types/editor";

type Params = {
  expandedGraph: ExpandedGraph;
  document: GraphDocument | null;
  fitNonce: number;
  selectedPersonId: string | null;
  focusPersonId: string | null;
  focusFamilyId: string | null;
  colorTheme: ColorThemeConfig;
  normalizedKindraConfig: NonNullable<ViewConfig["kindra"]> | undefined;
  showMockTools: boolean;
  setNodeMenu: (state: null) => void;
  clearVisualModes: () => void;
  onNodeClick: (interaction: NodeInteraction) => void;
  onNodeContextMenu: (interaction: NodeInteraction) => void;
  onSvgReady: (svg: SVGSVGElement | null) => void;
};

export function useShellCanvasFeature(params: Params): AppShellFacade["features"]["canvas"] {
  return {
    graph: params.expandedGraph,
    documentView: params.document,
    fitNonce: params.fitNonce,
    selectedPersonId: params.selectedPersonId,
    focusPersonId: params.focusPersonId,
    focusFamilyId: params.focusFamilyId,
    colorTheme: params.colorTheme,
    kindraConfig: params.normalizedKindraConfig,
    modeBadge: params.document ? "Kindra" : null,
    showMockTools: params.showMockTools,
    commands: {
      onNodeClick: params.onNodeClick,
      onNodeContextMenu: params.onNodeContextMenu,
      onBgClick: () => params.setNodeMenu(null),
      onBgDoubleClick: params.clearVisualModes,
      onSvgReady: params.onSvgReady,
    },
  };
}
