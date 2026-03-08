import { SESSION_SNAPSHOT_SCHEMA_VERSION } from "@/io/sessionService";
import { normalizeKindraConfig } from "@/core/kindra/kindraConfig";
import type { AppState } from "@/state/types";
import type { SessionSnapshot, ViewConfig } from "@/types/domain";

export function hasActiveSessionState(state: AppState): boolean {
  return !!state.genraphGraph || !!state.viewConfig;
}

export function buildAutosessionSnapshot(state: AppState): SessionSnapshot {
  const snapshotViewConfig = state.viewConfig
    ? (() => {
        const nextViewConfig: ViewConfig = {
          ...state.viewConfig,
          kindra: state.viewConfig.kindra
            ? {
                ...normalizeKindraConfig(state.viewConfig.kindra),
                overlays: (state.viewConfig.kindra.overlays || []).filter((overlay) => overlay.type !== "merge_focus"),
              }
            : state.viewConfig.kindra,
        };
        return nextViewConfig;
      })()
    : null;
  return {
    schemaVersion: SESSION_SNAPSHOT_SCHEMA_VERSION,
    graph: state.genraphGraph
      ? {
          data: state.genraphGraph.toData(),
          journal: [...state.genraphGraph.getJournal()],
        }
      : null,
    viewConfig: snapshotViewConfig,
    visualConfig: state.visualConfig,
    focusHistory: state.focusHistory,
    focusIndex: state.focusIndex,
    recentFiles: state.recentFiles,
    recentPayloads: state.recentPayloads,
    mergeDraft: state.mergeDraft,
    aiSettings: state.aiSettings,
  };
}
