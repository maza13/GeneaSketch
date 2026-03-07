import { describe, expect, it } from "vitest";
import { UiEngine } from "@/core/engine/UiEngine";
import { resolveProfileHydration } from "@/hooks/useFileLoadRuntime";
import type { AppState } from "@/state/types";

function baseState(): AppState {
  const viewConfig = UiEngine.createDefaultViewConfig("root");
  const visualConfig = UiEngine.createDefaultVisualConfig();
  return {
    viewConfig,
    visualConfig
  } as AppState;
}

describe("workspace profile hydration precedence", () => {
  it("prefers local workspace profile over legacy gskMeta", () => {
    const state = baseState();
    const result = resolveProfileHydration(
      state,
      {
        viewConfig: { ...state.viewConfig!, focusPersonId: "local-person", homePersonId: "local-person" },
        visualConfig: { ...state.visualConfig, gridEnabled: true },
        colorTheme: { background: "#111", personNode: "#222", text: "#fff", edges: "#666", nodeFontSize: 16, edgeThickness: 2, nodeWidth: 210, nodeHeight: 92 }
      },
      {
        viewConfig: { ...state.viewConfig!, focusPersonId: "legacy-person", homePersonId: "legacy-person" },
        visualConfig: { ...state.visualConfig, gridEnabled: false },
        colorTheme: { background: "#000", personNode: "#000", text: "#000", edges: "#000", nodeFontSize: 10, edgeThickness: 1, nodeWidth: 1, nodeHeight: 1 }
      }
    );

    expect(result.nextViewConfig?.focusPersonId).toBe("local-person");
    expect(result.nextVisualConfig.gridEnabled).toBe(true);
    expect(result.nextReadModelMode).toBe("direct");
    expect(result.nextTheme?.background).toBe("#111");
  });

  it("falls back to legacy gskMeta when no local profile exists", () => {
    const state = baseState();
    const result = resolveProfileHydration(state, null, {
      viewConfig: { ...state.viewConfig!, focusPersonId: "legacy-focus", homePersonId: "legacy-focus" },
      visualConfig: { ...state.visualConfig, gridEnabled: true },
      colorTheme: { background: "#333", personNode: "#444", text: "#fff", edges: "#555", nodeFontSize: 14, edgeThickness: 2, nodeWidth: 220, nodeHeight: 100 }
    });

    expect(result.nextViewConfig?.focusPersonId).toBe("legacy-focus");
    expect(result.nextVisualConfig.gridEnabled).toBe(true);
    expect(result.nextReadModelMode).toBe("direct");
    expect(result.nextTheme?.background).toBe("#333");
  });

  it("keeps current state when neither local profile nor legacy meta exist", () => {
    const state = baseState();
    const result = resolveProfileHydration(state, null, null);

    expect(result.nextViewConfig).toStrictEqual(state.viewConfig);
    expect(result.nextVisualConfig).toBe(state.visualConfig);
    expect(result.nextReadModelMode).toBe("direct");
    expect(result.nextTheme).toBeUndefined();
  });

  it("normalizes legacy dtree flags to hard-cut contract when profile/meta is legacy", () => {
    const state = baseState();
    const currentDtree = state.viewConfig?.dtree;
    if (!currentDtree) throw new Error("Expected default dtree config in base state.");
    const legacyProfileView = {
      ...state.viewConfig!,
      dtree: {
        isVertical: currentDtree.isVertical,
        layoutEngine: "v2",
        collapsedNodeIds: [...currentDtree.collapsedNodeIds],
        overlays: [...currentDtree.overlays],
        renderVersion: "v2"
      }
    } as any;

    const result = resolveProfileHydration(
      state,
      {
        viewConfig: legacyProfileView,
        visualConfig: state.visualConfig
      },
      null
    );

    expect(result.nextViewConfig?.dtree?.layoutEngine).toBe("vnext");
    expect((result.nextViewConfig?.dtree as any)?.renderVersion).toBeUndefined();
  });
});

