import { useCallback, useMemo } from "react";
import { normalizeDtreeConfig } from "@/core/dtree/dtreeConfig";
import { documentToGSchema } from "@/core/gschema/GedcomBridge";
import type { GSchemaGraph } from "@/core/gschema/GSchemaGraph";
import { projectGraphDocument } from "@/core/read-model/selectors";
import type { GraphDocument, GraphSource, ReadModelMode } from "@/core/read-model/types";
import { WorkspaceProfileService } from "@/io/workspaceProfileService";
import { ensureExpanded, useAppStore, type AppState } from "@/state/store";
import type { ViewConfig, VisualConfig } from "@/types/domain";
import type { ColorThemeConfig } from "@/types/editor";
import type { WorkspaceProfileV2 } from "@/types/workspaceProfile";

export type LegacyGskMeta = {
  viewConfig?: ViewConfig;
  visualConfig?: VisualConfig;
  colorTheme?: ColorThemeConfig;
} | null | undefined;

export type LoadedGraphRuntimeInput = {
  graph: GSchemaGraph | null;
  source: GraphSource;
  gskMeta?: LegacyGskMeta;
};

export type FileLoadRuntime = {
  applyLoadedPayload: (input: LoadedGraphRuntimeInput) => Promise<ColorThemeConfig | undefined>;
  applyMergedDocument: (nextDoc: GraphDocument) => void;
};

function normalizeHydratedViewConfig(viewConfig: ViewConfig | null | undefined): ViewConfig | null {
  if (!viewConfig) return viewConfig ?? null;
  const normalizedDtree = normalizeDtreeConfig(viewConfig.dtree);
  return {
    ...viewConfig,
    dtree: normalizedDtree,
  };
}

export function resolveProfileHydration(
  state: AppState,
  profile?: Pick<WorkspaceProfileV2, "viewConfig" | "visualConfig" | "colorTheme" | "readModelMode"> | null,
  gskMeta?: LegacyGskMeta,
): {
  nextViewConfig: ViewConfig | null;
  nextVisualConfig: VisualConfig;
  nextReadModelMode: ReadModelMode;
  nextTheme?: ColorThemeConfig;
} {
  const nextViewConfig = profile?.viewConfig ?? gskMeta?.viewConfig ?? state.viewConfig;
  const nextVisualConfig = profile?.visualConfig ?? gskMeta?.visualConfig ?? state.visualConfig;
  const nextReadModelMode = profile?.readModelMode ?? state.readModelMode;
  const nextTheme = profile?.colorTheme ?? gskMeta?.colorTheme;
  return {
    nextViewConfig: normalizeHydratedViewConfig(nextViewConfig),
    nextVisualConfig,
    nextReadModelMode,
    nextTheme,
  };
}

export function useFileLoadRuntime(clearMergeFocus: () => void): FileLoadRuntime {
  const loadGraph = useAppStore((state) => state.loadGraph);
  const clearMergeDraft = useAppStore((state) => state.clearMergeDraft);

  const applyLoadedPayload = useCallback(
    async ({ graph, source, gskMeta }: LoadedGraphRuntimeInput) => {
      loadGraph({ graph, source });

      const graphId = useAppStore.getState().gschemaGraph?.graphId ?? "";
      const profile = graphId ? await WorkspaceProfileService.load(graphId) : null;
      if (profile || gskMeta?.viewConfig || gskMeta?.visualConfig) {
        const nextHydration = resolveProfileHydration(useAppStore.getState(), profile, gskMeta);
        useAppStore.setState((state) => {
          const tempDoc = projectGraphDocument(state.gschemaGraph);
          return {
            viewConfig: nextHydration.nextViewConfig,
            visualConfig: nextHydration.nextVisualConfig,
            expandedGraph: tempDoc ? ensureExpanded(tempDoc, nextHydration.nextViewConfig) : state.expandedGraph,
          };
        });
        useAppStore.getState().setReadModelMode(nextHydration.nextReadModelMode);
      }

      return profile?.colorTheme ?? gskMeta?.colorTheme;
    },
    [loadGraph],
  );

  const applyMergedDocument = useCallback(
    (nextDoc: GraphDocument) => {
      const gedVersion = nextDoc.metadata?.gedVersion?.startsWith("7") ? "7.0.x" : "5.5.1";
      const nextGraph = documentToGSchema(nextDoc, gedVersion).graph;
      loadGraph({ graph: nextGraph, source: "merge" });
      clearMergeDraft();
      clearMergeFocus();
    },
    [clearMergeDraft, clearMergeFocus, loadGraph],
  );

  return useMemo(
    () => ({
      applyLoadedPayload,
      applyMergedDocument,
    }),
    [applyLoadedPayload, applyMergedDocument],
  );
}
