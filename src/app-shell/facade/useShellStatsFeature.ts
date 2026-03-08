import { inferTimelineEvents, inferTimelineStatus } from "@/core/timeline/livingPresence";
import type { AppShellFacade, TimelinePresenceResult } from "./types";
import type { GraphDocument } from "@/core/read-model/types";

type Params = {
  document: GraphDocument | null;
  viewConfig: { timeline?: { scope?: "visible" | "all" } } | null;
  visiblePersonIds: string[];
  globalStatsOpen: boolean;
  globalStatsViewModel: AppShellFacade["features"]["globalStats"]["viewModel"];
  setShowGlobalStatsPanel: (open: boolean) => void;
  personStatsViewModel: AppShellFacade["features"]["personStats"]["viewModel"];
  setShowPersonStatsPersonId: (id: string | null) => void;
  timelineViewModel: AppShellFacade["features"]["timeline"]["viewModel"];
  setTimelineView: (view: AppShellFacade["features"]["timeline"]["viewModel"]["timelineView"]) => void;
  setTimelineScaleZoom: (zoom: number) => void;
  setTimelineScaleOffset: (offset: number) => void;
  handleTimelineHighlight: AppShellFacade["features"]["timeline"]["commands"]["onTimelineHighlight"];
  setTimelineStatus: (livingIds: string[], deceasedIds: string[], year: number, eventPersonIds?: string[]) => void;
  toggleRightStackSection: (section: "details" | "timeline") => void;
  clearOverlayType: (type: string) => void;
  setTimelinePanelOpen: (open: boolean) => void;
};

export function useShellStatsFeature(params: Params): Pick<AppShellFacade["features"], "globalStats" | "personStats" | "timeline"> {
  return {
    globalStats: {
      open: params.globalStatsOpen,
      viewModel: params.globalStatsViewModel,
      onClose: () => params.setShowGlobalStatsPanel(false),
    },
    personStats: {
      open: params.personStatsViewModel.kind === "ready",
      viewModel: params.personStatsViewModel,
      onClose: () => params.setShowPersonStatsPersonId(null),
    },
    timeline: {
      viewModel: params.timelineViewModel,
      commands: {
        onTimelineView: params.setTimelineView,
        onTimelineScaleZoom: params.setTimelineScaleZoom,
        onTimelineScaleOffset: params.setTimelineScaleOffset,
        onTimelineHighlight: params.handleTimelineHighlight,
        onTimelinePresence: (value, mode): TimelinePresenceResult => {
          if (!params.document) {
            return { livingIds: [], deceasedIds: [], eventIds: [], livingCount: 0, effectiveValue: value };
          }
          const effectiveValue = mode === "decade" ? Math.floor(value / 10) * 10 : Math.floor(value);
          const scope = params.viewConfig?.timeline?.scope ?? "visible";
          const visibleSet = new Set(params.visiblePersonIds);
          const { living, deceased } = inferTimelineStatus(params.document, effectiveValue);
          const events = inferTimelineEvents(params.document, effectiveValue);
          const filterIds = (ids: Iterable<string>) => {
            const next = Array.from(ids);
            return scope === "all" ? next : next.filter((id) => visibleSet.has(id));
          };
          return {
            livingIds: filterIds(living),
            deceasedIds: filterIds(deceased),
            eventIds: filterIds(events),
            livingCount: filterIds(living).length,
            effectiveValue,
          };
        },
        onApplyPresence: (result) => params.setTimelineStatus(result.livingIds, result.deceasedIds, result.effectiveValue, result.eventIds),
        onToggleTimelineExpanded: () => params.toggleRightStackSection("timeline"),
        onClosePanel: () => {
          params.clearOverlayType("timeline");
          params.setTimelinePanelOpen(false);
        },
      },
    },
  };
}
