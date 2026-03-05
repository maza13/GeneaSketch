import type { ViewConfig, VisualConfig } from "@/types/domain";
import type { ColorThemeConfig } from "@/types/editor";

export const WORKSPACE_PROFILE_SCHEMA_VERSION = 2 as const;

export type WorkspaceProfileSource =
  | "local-autosave"
  | "manual-save"
  | "legacy-meta-migration";

export type WorkspaceProfileV2 = {
  profileSchemaVersion: typeof WORKSPACE_PROFILE_SCHEMA_VERSION;
  graphId: string;
  viewConfig: ViewConfig;
  visualConfig: VisualConfig;
  colorTheme?: ColorThemeConfig;
  updatedAt: string;
  source: WorkspaceProfileSource;
};

