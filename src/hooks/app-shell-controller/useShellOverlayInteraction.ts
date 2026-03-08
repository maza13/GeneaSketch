import { useCallback, useRef } from "react";
import { mergeFocusKey, normalizeMergeFocus, type MergeFocusPayload } from "@/core/edit/mergeFocus";
import type { TimelineHighlightPayload } from "@/types/editor";
import type { AppShellControllerParams } from "./types";

export function useShellOverlayInteraction(params: AppShellControllerParams) {
  const mergeFocusKeyRef = useRef<string | null>(null);

  const clearMergeFocusOverlay = useCallback(() => {
    mergeFocusKeyRef.current = null;
    params.clearOverlayType("merge_focus");
  }, [params]);

  const handleTimelineHighlight = useCallback(
    (payload: TimelineHighlightPayload | null) => {
      if (!payload) {
        params.clearOverlayType("timeline");
        return;
      }
      params.setOverlay({
        id: "timeline-simulation",
        type: "timeline",
        priority: 100,
        config: {
          sourceItemId: payload.sourceItemId,
          primaryId: payload.primaryPersonId,
          secondaryIds: payload.secondaryPersonIds,
        },
      });
    },
    [params],
  );

  const handleMergeFocusChange = useCallback(
    (focus: MergeFocusPayload | null) => {
      const normalized = normalizeMergeFocus(focus);
      const nextKey = mergeFocusKey(normalized);
      if (!normalized) {
        clearMergeFocusOverlay();
        return;
      }
      if (nextKey && nextKey === mergeFocusKeyRef.current) return;
      mergeFocusKeyRef.current = nextKey;
      params.setOverlay({
        id: "merge-focus-review",
        type: "merge_focus",
        priority: 95,
        config: {
          primaryIds: normalized.primaryIds,
          secondaryIds: normalized.secondaryIds,
          secondaryLevel1Ids: normalized.secondaryLevel1Ids || normalized.secondaryIds,
          secondaryLevel2Ids: normalized.secondaryLevel2Ids || [],
        },
      });
    },
    [clearMergeFocusOverlay, params],
  );

  return {
    clearMergeFocusOverlay,
    handleTimelineHighlight,
    handleMergeFocusChange,
  };
}
