import type { ActiveOverlay, ViewConfig } from "@/types/domain";

export type NormalizedDtreeConfig = {
  isVertical: boolean;
  layoutEngine: "vnext";
  collapsedNodeIds: string[];
  overlays: ActiveOverlay[];
};

export function normalizeDtreeLayoutEngine(_value: unknown): "vnext" {
  return "vnext";
}

function normalizeCollapsedNodeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeOverlays(value: unknown): ActiveOverlay[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is ActiveOverlay => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as ActiveOverlay;
    return typeof candidate.id === "string" && typeof candidate.type === "string";
  });
}

export function createDefaultDtreeConfig(): NormalizedDtreeConfig {
  return {
    isVertical: true,
    layoutEngine: "vnext",
    collapsedNodeIds: [],
    overlays: []
  };
}

export function normalizeDtreeConfig(value: ViewConfig["dtree"] | null | undefined): NormalizedDtreeConfig {
  const defaults = createDefaultDtreeConfig();
  if (!value || typeof value !== "object") {
    return defaults;
  }
  return {
    isVertical: typeof value.isVertical === "boolean" ? value.isVertical : defaults.isVertical,
    layoutEngine: normalizeDtreeLayoutEngine(value.layoutEngine),
    collapsedNodeIds: normalizeCollapsedNodeIds(value.collapsedNodeIds),
    overlays: normalizeOverlays(value.overlays)
  };
}
