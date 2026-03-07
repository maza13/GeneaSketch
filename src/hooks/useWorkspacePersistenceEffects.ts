import { useEffect } from "react";
import type { GraphDocument, ReadModelMode } from "@/core/read-model/types";
import { WorkspaceProfileService } from "@/io/workspaceProfileService";
import type { AiSettings } from "@/types/ai";
import type { ViewConfig, VisualConfig } from "@/types/domain";
import type { ColorThemeConfig } from "@/types/editor";
import { WORKSPACE_PROFILE_SCHEMA_VERSION } from "@/types/workspaceProfile";

type UseWorkspacePersistenceEffectsArgs = {
  document: GraphDocument | null;
  viewConfig: ViewConfig | null;
  visualConfig: VisualConfig;
  aiSettings: AiSettings;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  saveAutosessionNow: () => Promise<void>;
  graphId: string | null | undefined;
  readModelMode: ReadModelMode;
  colorTheme: ColorThemeConfig;
};

function sanitizeWorkspaceProfileViewConfig(viewConfig: ViewConfig): ViewConfig {
  if (!viewConfig.dtree) return viewConfig;
  return {
    ...viewConfig,
    dtree: {
      ...viewConfig.dtree,
      overlays: (viewConfig.dtree.overlays || []).filter((overlay) => overlay.type !== "merge_focus"),
    },
  };
}

export function useWorkspacePersistenceEffects({
  document,
  viewConfig,
  visualConfig,
  aiSettings,
  leftCollapsed,
  rightCollapsed,
  saveAutosessionNow,
  graphId,
  readModelMode,
  colorTheme,
}: UseWorkspacePersistenceEffectsArgs): void {
  useEffect(() => {
    if (!document) return;
    const timer = setTimeout(() => {
      void saveAutosessionNow();
    }, 1500);
    return () => clearTimeout(timer);
  }, [document, viewConfig, visualConfig, aiSettings, saveAutosessionNow, leftCollapsed, rightCollapsed]);

  useEffect(() => {
    if (!graphId || !viewConfig) return;
    const timer = setTimeout(() => {
      void WorkspaceProfileService.save({
        profileSchemaVersion: WORKSPACE_PROFILE_SCHEMA_VERSION,
        graphId,
        viewConfig: sanitizeWorkspaceProfileViewConfig(viewConfig),
        visualConfig,
        readModelMode,
        colorTheme,
        updatedAt: new Date().toISOString(),
        source: "local-autosave",
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [graphId, viewConfig, visualConfig, readModelMode, colorTheme]);
}
