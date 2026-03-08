import type { ActiveOverlay, ViewConfig } from "@/types/domain";

export type NormalizedKindraConfig = {
  isVertical: boolean;
  layoutEngine: "vnext";
  collapsedNodeIds: string[];
  overlays: ActiveOverlay[];
};

export function normalizeKindraLayoutEngine(_value: unknown): "vnext" {
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

export function createDefaultKindraConfig(): NormalizedKindraConfig {
  return {
    isVertical: true,
    layoutEngine: "vnext",
    collapsedNodeIds: [],
    overlays: []
  };
}

export function normalizeKindraConfig(value: ViewConfig["kindra"] | null | undefined): NormalizedKindraConfig {
  const defaults = createDefaultKindraConfig();
  if (!value || typeof value !== "object") {
    return defaults;
  }
  return {
    isVertical: typeof value.isVertical === "boolean" ? value.isVertical : defaults.isVertical,
    layoutEngine: normalizeKindraLayoutEngine(value.layoutEngine),
    collapsedNodeIds: normalizeCollapsedNodeIds(value.collapsedNodeIds),
    overlays: normalizeOverlays(value.overlays)
  };
}
