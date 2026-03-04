import { useMemo } from "react";
import {
  selectFamilies,
  selectGraphStats,
  selectPersons,
  selectSearchEntries,
  selectTimelineInput,
} from "@/core/read-model";
import { useAppStore } from "@/state/store";

export function useGraphSelectors() {
  const graph = useAppStore((state) => state.gschemaGraph);
  const graphRevision = useAppStore((state) => state.graphRevision);

  return useMemo(() => {
    return {
      persons: selectPersons(graph),
      families: selectFamilies(graph),
      stats: selectGraphStats(graph),
      timelineInput: selectTimelineInput(graph),
      searchEntries: selectSearchEntries(graph),
    };
  }, [graph, graphRevision]);
}

