import { useCallback, useMemo } from "react";
import { normalizeKindraConfig } from "@/core/kindra/kindraConfig";
import type { GenraphGraph } from "@/core/genraph";
import { projectGraphDocument } from "@/core/read-model/selectors";
import type { GraphDocument, GraphSource } from "@/core/read-model/types";
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
  graph: GenraphGraph | null;
  source: GraphSource;
  gskMeta?: LegacyGskMeta;
};

export type FileLoadRuntime = {
  applyLoadedPayload: (input: LoadedGraphRuntimeInput) => Promise<ColorThemeConfig | undefined>;
  applyMergedDocument: (nextDoc: GraphDocument) => void;
};

function normalizeHydratedViewConfig(viewConfig: ViewConfig | null | undefined): ViewConfig | null {
  if (!viewConfig) return viewConfig ?? null;
  const normalizedKindra = normalizeKindraConfig(viewConfig.kindra);
  return {
    ...viewConfig,
    kindra: normalizedKindra,
  };
}

export function resolveProfileHydration(
  state: AppState,
  profile?: Pick<WorkspaceProfileV2, "viewConfig" | "visualConfig" | "colorTheme" | "readModelMode"> | null,
  gskMeta?: LegacyGskMeta,
): {
  nextViewConfig: ViewConfig | null;
  nextVisualConfig: VisualConfig;
  nextReadModelMode: "direct";
  nextTheme?: ColorThemeConfig;
} {
  const nextViewConfig = profile?.viewConfig ?? gskMeta?.viewConfig ?? state.viewConfig;
  const nextVisualConfig = profile?.visualConfig ?? gskMeta?.visualConfig ?? state.visualConfig;
  const nextTheme = profile?.colorTheme ?? gskMeta?.colorTheme;
  return {
    nextViewConfig: normalizeHydratedViewConfig(nextViewConfig),
    nextVisualConfig,
    nextReadModelMode: "direct",
    nextTheme,
  };
}

export function useFileLoadRuntime(clearMergeFocus: () => void): FileLoadRuntime {
  const loadGraph = useAppStore((state) => state.loadGraph);
  const applyProjectedDocument = useAppStore((state) => state.applyProjectedDocument);
  const clearMergeDraft = useAppStore((state) => state.clearMergeDraft);

  const applyLoadedPayload = useCallback(
    async ({ graph, source, gskMeta }: LoadedGraphRuntimeInput) => {
      loadGraph({ graph, source });

      const graphId = useAppStore.getState().genraphGraph?.graphId ?? "";
      const profile = graphId ? await WorkspaceProfileService.load(graphId) : null;
      if (profile || gskMeta?.viewConfig || gskMeta?.visualConfig) {
        const nextHydration = resolveProfileHydration(useAppStore.getState(), profile, gskMeta);
        useAppStore.setState((state) => {
          const tempDoc = projectGraphDocument(state.genraphGraph);
          return {
            viewConfig: nextHydration.nextViewConfig,
            visualConfig: nextHydration.nextVisualConfig,
            expandedGraph: tempDoc ? ensureExpanded(tempDoc, nextHydration.nextViewConfig) : state.expandedGraph,
          };
        });
      }

      return profile?.colorTheme ?? gskMeta?.colorTheme;
    },
    [loadGraph],
  );

  const applyMergedDocument = useCallback(
    (nextDoc: GraphDocument) => {
      applyProjectedDocument(nextDoc, "merge");
      clearMergeDraft();
      clearMergeFocus();
    },
    [applyProjectedDocument, clearMergeDraft, clearMergeFocus],
  );

  return useMemo(
    () => ({
      applyLoadedPayload,
      applyMergedDocument,
    }),
    [applyLoadedPayload, applyMergedDocument],
  );
}
