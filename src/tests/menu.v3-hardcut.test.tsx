import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useMenuConfig, type MenuConfigParams } from "@/hooks/useMenuConfig";
import { createDefaultViewConfig } from "@/state/workspaceDefaults";
import type { MenuGroup } from "@/ui/TopMenuBar";

function collectIds(items: any[] = []): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (!item) continue;
    if (typeof item.id === "string") ids.push(item.id);
    if (Array.isArray(item.children)) ids.push(...collectIds(item.children));
  }
  return ids;
}

function collectLabels(items: any[] = []): string[] {
  const labels: string[] = [];
  for (const item of items) {
    if (!item) continue;
    if (typeof item.label === "string") labels.push(item.label);
    if (Array.isArray(item.children)) labels.push(...collectLabels(item.children));
  }
  return labels;
}

function buildParams(): MenuConfigParams {
  const viewConfig = createDefaultViewConfig("P1");
  return {
    document: null,
    viewConfig,
    recentFiles: [],
    selectedPersonId: null,
    colorTheme: {
      background: "#111",
      personNode: "#222",
      text: "#fff",
      edges: "#777",
      nodeFontSize: 16,
      edgeThickness: 2,
      nodeWidth: 210,
      nodeHeight: 92
    },
    themeMode: "dark",
    aiUndoSnapshot: null,
    leftCollapsed: false,
    rightCollapsed: false,
    timelineOpen: false,
    menuLayout: "frequency",
    createNewTreeDoc: () => {},
    openFileInput: () => {},
    importFileInput: () => {},
    openAndReplace: () => {},
    openRecentItem: () => {},
    saveGsk: async () => {},
    exportGed: async () => {},
    setShowPdfExport: () => {},
    exportRaster: () => {},
    openPersonEditor: () => {},
    openAddRelationEditor: () => {},
    openLocalAiAssistant: () => {},
    openGlobalAiAssistant: () => {},
    setShowAiSettingsModal: () => {},
    undoAiBatch: () => {},
    fitToScreen: () => {},
    setThemeMode: () => {},
    setShowColorThemeMenu: () => {},
    toggleShellPanel: () => {},
    setTimelinePanelOpen: () => {},
    setTimelineScope: () => {},
    setTimelineView: () => {},
    setKindraLayoutEngine: () => {},
    setShowDiagnostics: () => {},
    setShowPersonStatsPersonId: () => {},
    setShowGlobalStatsPanel: () => {},
    clearNodePositions: () => {},
    generateScenario: () => {},
    setShowMockTools: () => {},
    setShowFamilySearchPanel: () => {},
    setShowWikiPanel: () => {},
    setShowAboutModalV3: () => {},
    openPersonWorkspaceV3: () => {},
    setColorTheme: () => {},
    clearRecentFiles: () => {},
    setMenuLayout: () => {}
  };
}

describe("menu hard-cut v3", () => {
  it("does not expose v2 layout or v2 about entries", () => {
    const resultRef: { current: ReturnType<typeof useMenuConfig> | null } = { current: null };
    function Harness() {
      resultRef.current = useMenuConfig(buildParams());
      return null;
    }

    renderToStaticMarkup(<Harness />);
    const menus: MenuGroup[] = resultRef.current ? resultRef.current.menus : [];
    const items = menus.flatMap((menu: MenuGroup) => menu.items);
    const ids = collectIds(items);
    const labels = collectLabels(items);

    expect(ids).not.toContain("layout-v2");
    expect(ids).not.toContain("about-v2");
    expect(labels).not.toContain("Acerca de (V2)");
  });
});
