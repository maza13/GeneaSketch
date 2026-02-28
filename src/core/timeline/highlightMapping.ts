import type { TimelineHighlightPayload, TimelineItem } from "@/types/editor";

export function buildTimelineHighlightPayload(item: TimelineItem): TimelineHighlightPayload | null {
  const primaryPersonId = item.primaryPersonId ?? item.personIds[0] ?? null;
  const secondarySeed =
    item.secondaryPersonIds.length > 0
      ? item.secondaryPersonIds
      : item.personIds.filter((id) => id !== primaryPersonId);

  const secondaryPersonIds = Array.from(new Set(secondarySeed.filter(Boolean))).filter(
    (id) => id !== primaryPersonId
  );

  if (!primaryPersonId && secondaryPersonIds.length === 0) {
    return null;
  }

  return {
    sourceItemId: item.id,
    primaryPersonId,
    secondaryPersonIds
  };
}
