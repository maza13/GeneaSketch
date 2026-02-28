import type { TimelineItem } from "@/types/editor";
import type { MouseEvent } from "react";
import { useMemo } from "react";

const TYPE_SHORT: Record<TimelineItem["eventType"], string> = {
  BIRT: "Nac.",
  DEAT: "Def.",
  MARR: "Mat.",
  DIV: "Div."
};

type Props = {
  items: TimelineItem[];
  activeItemId: string | null;
  onItemClick: (item: TimelineItem) => void;
  onItemHover: (item: TimelineItem, event: MouseEvent<HTMLElement>) => void;
  onItemLeave: () => void;
  cursorEnabled: boolean;
  cursorMode: "year" | "decade";
  cursorValue: number;
};

export function TimelineListView({
  items,
  activeItemId,
  onItemClick,
  onItemHover,
  onItemLeave,
  cursorEnabled,
  cursorMode,
  cursorValue
}: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const item of items) {
      const key = item.sortDate ? String(item.sortDate.getUTCFullYear()) : "Sin fecha";
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }
    return [...map.entries()];
  }, [items]);

  if (items.length === 0) {
    return <div className="timeline-empty">No hay eventos para el alcance actual.</div>;
  }

  return (
    <div className="timeline-list">
      {groups.map(([groupKey, groupItems]) => (
        <section key={groupKey} className="timeline-year-group">
          <header className="timeline-year-header">{groupKey}</header>
          <div className="timeline-year-items">
            {groupItems.map((item) => {
              const itemYear = item.sortDate ? (item.sortDate as Date).getUTCFullYear() : null;
              const isCursorHit =
                cursorEnabled &&
                itemYear !== null &&
                (cursorMode === "year"
                  ? itemYear === cursorValue
                  : itemYear >= cursorValue && itemYear <= cursorValue + 9);

              return (
              <button
                key={item.id}
                className={`timeline-list-item${activeItemId === item.id ? " timeline-list-item--active" : ""}${isCursorHit ? " timeline-list-item--cursor" : ""}`}
                onClick={() => onItemClick(item)}
                onMouseEnter={(event) => onItemHover(item, event)}
                onMouseLeave={onItemLeave}
              >
                <div className="timeline-list-top">
                  <span className={`timeline-item-type timeline-item-type--${item.eventType.toLowerCase()}`}>
                    {TYPE_SHORT[item.eventType]}
                  </span>
                  <span className="timeline-item-date">{item.displayDate}</span>
                </div>
                <div className="timeline-item-label">{item.label}</div>
              </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
