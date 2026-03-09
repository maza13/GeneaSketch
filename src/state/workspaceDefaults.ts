import { createDefaultAiSettings } from "@/core/ai/defaults";
import type { VisualConfig, ViewConfig } from "@/types/domain";
import type { AiSettings } from "@/types/ai";

export function createDefaultVisualConfig(): VisualConfig {
  return {
    nodePositions: {},
    gridEnabled: false,
    gridSize: 20,
    canonicalOverrides: {},
  };
}

export function createDefaultViewConfig(homePersonId = ""): ViewConfig {
  const kindra = {
    isVertical: true,
    layoutEngine: "vnext" as const,
    collapsedNodeIds: [],
    overlays: [],
  };
  return {
    mode: "tree",
    preset: "family_origin",
    focusPersonId: homePersonId || null,
    focusFamilyId: null,
    homePersonId,
    rightPanelView: "details",
    timelinePanelOpen: false,
    showSpouses: true,
    depth: {
      ancestors: 3,
      descendants: 2,
      unclesGreatUncles: 0,
      siblingsNephews: 1,
      unclesCousins: 0,
    },
    shellPanels: {
      leftCollapsed: false,
      rightCollapsed: false,
    },
    leftSections: {
      layersOpen: true,
      treeConfigOpen: true,
      canvasToolsOpen: false,
      timelineExpanded: true,
    },
    timeline: {
      scope: "visible",
      view: "list",
      scaleZoom: 1,
      scaleOffset: 0,
    },
    kindra,
  };
}

export function normalizeVisualConfig(value: VisualConfig | null | undefined): VisualConfig {
  if (!value) return createDefaultVisualConfig();
  return {
    nodePositions: value.nodePositions || {},
    gridEnabled: !!value.gridEnabled,
    gridSize: value.gridSize || 20,
    canonicalOverrides: value.canonicalOverrides || {},
  };
}

export function mergeAiSettings(previous: AiSettings, patch: Partial<AiSettings>): AiSettings {
  if (!previous) return createDefaultAiSettings();
  return {
    ...previous,
    ...patch,
  };
}
