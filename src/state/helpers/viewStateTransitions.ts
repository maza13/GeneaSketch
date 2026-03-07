import { projectGraphDocument } from "@/core/read-model/selectors";
import type { AppState } from "../types";
import { ensureExpanded } from "./graphHelpers";

export function withExpandedGraphForView(
  state: AppState,
  viewConfig: AppState["viewConfig"] | null,
): Partial<AppState> {
  if (!viewConfig) {
    return { viewConfig };
  }

  return {
    viewConfig,
    expandedGraph: ensureExpanded(projectGraphDocument(state.gschemaGraph), viewConfig),
  };
}
