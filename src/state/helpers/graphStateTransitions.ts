import { UiEngine } from "@/core/engine/UiEngine";
import type { GenraphGraph } from "@/core/genraph";
import { projectGraphDocument } from "@/core/read-model/selectors";
import type { AppState } from "../types";
import { ensureExpanded } from "./graphHelpers";

type GraphMutationResult = {
  selectedPersonId?: string | null;
  selectedPersonUid?: string | null;
};

export function buildLoadedGraphState(state: AppState, graph: GenraphGraph | null): Partial<AppState> {
  const projected = projectGraphDocument(graph);

  if (!graph || !projected) {
    return {
      genraphGraph: null,
      graphRevision: state.graphRevision + 1,
      expandedGraph: { nodes: [], edges: [] },
    };
  }

  const firstPersonId = Object.keys(projected.persons)[0] || "";
  let viewConfig = state.viewConfig;
  if (!viewConfig) {
    viewConfig = UiEngine.createDefaultViewConfig(firstPersonId);
  } else if (!viewConfig.focusPersonId) {
    viewConfig = { ...viewConfig, focusPersonId: firstPersonId, homePersonId: firstPersonId };
  }

  const selectedPersonId = state.selectedPersonId && projected.persons[state.selectedPersonId]
    ? state.selectedPersonId
    : firstPersonId || null;

  return {
    genraphGraph: graph,
    graphRevision: state.graphRevision + 1,
    xrefToUid: projected.xrefToUid,
    uidToXref: projected.uidToXref,
    viewConfig,
    selectedPersonId,
    expandedGraph: ensureExpanded(projected, viewConfig),
  };
}

export function runGraphMutation(
  state: AppState,
  mutate: (graph: GenraphGraph) => GraphMutationResult | null,
): Partial<AppState> {
  if (!state.genraphGraph) return {};

  const result = mutate(state.genraphGraph);
  if (result === null) return {};

  const projected = projectGraphDocument(state.genraphGraph);
  if (!projected) return {};

  const nextSelectedPersonId = result.selectedPersonUid
    ? projected.uidToXref?.[result.selectedPersonUid] ?? result.selectedPersonUid
    : result.selectedPersonId;

  return {
    graphRevision: state.graphRevision + 1,
    xrefToUid: projected.xrefToUid,
    uidToXref: projected.uidToXref,
    expandedGraph: ensureExpanded(projected, state.viewConfig),
    ...(nextSelectedPersonId !== undefined ? { selectedPersonId: nextSelectedPersonId } : {}),
  };
}
