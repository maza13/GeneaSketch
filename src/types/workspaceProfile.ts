import type { ViewConfig, VisualConfig } from "@/types/domain";
import type { ColorThemeConfig } from "@/types/editor";
import type { ReadModelMode } from "@/core/read-model/types";

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
  readModelMode?: ReadModelMode;
  colorTheme?: ColorThemeConfig;
  updatedAt: string;
  source: WorkspaceProfileSource;
};

