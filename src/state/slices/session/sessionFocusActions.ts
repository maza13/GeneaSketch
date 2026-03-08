import type { SessionSlice } from "@/state/types";
import type { SessionSet } from "./shared";

export function createSessionFocusActions(set: SessionSet): Pick<SessionSlice, "inspectPerson" | "goBack" | "goForward"> {
  return {
    inspectPerson: (personId) =>
      set((state) => {
        if (!state.genraphGraph || (personId && !state.genraphGraph.node(personId))) return {};
        if (!state.viewConfig) return { selectedPersonId: personId };
        return { selectedPersonId: personId, viewConfig: { ...state.viewConfig, focusPersonId: personId } };
      }),

    goBack: () =>
      set((state) => {
        if (state.focusIndex <= 0 || state.focusHistory.length === 0) return {};
        const focusIndex = state.focusIndex - 1;
        const nextPersonId = state.focusHistory[focusIndex];
        if (!nextPersonId || (state.genraphGraph && !state.genraphGraph.node(nextPersonId))) return { focusIndex };
        const viewConfig = state.viewConfig ? { ...state.viewConfig, focusPersonId: nextPersonId } : state.viewConfig;
        return {
          focusIndex,
          selectedPersonId: nextPersonId,
          viewConfig,
        } as Partial<typeof state>;
      }),

    goForward: () =>
      set((state) => {
        if (state.focusIndex >= state.focusHistory.length - 1) return {};
        const focusIndex = state.focusIndex + 1;
        const nextPersonId = state.focusHistory[focusIndex];
        if (!nextPersonId || (state.genraphGraph && !state.genraphGraph.node(nextPersonId))) return { focusIndex };
        const viewConfig = state.viewConfig ? { ...state.viewConfig, focusPersonId: nextPersonId } : state.viewConfig;
        return {
          focusIndex,
          selectedPersonId: nextPersonId,
          viewConfig,
        } as Partial<typeof state>;
      }),
  };
}
