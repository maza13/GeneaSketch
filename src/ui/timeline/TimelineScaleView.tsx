import type { TimelineItem } from "@/types/editor";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useRef } from "react";

const ZOOM_LEVELS = [
  { id: 0, label: "Siglo", pxPerYear: 1.4 },
  { id: 1, label: "Decada", pxPerYear: 4.2 },
  { id: 2, label: "Ano", pxPerYear: 12 },
  { id: 3, label: "Mes", pxPerYear: 26 }
] as const;

const TYPE_SHORT: Record<TimelineItem["eventType"], string> = {
  BIRT: "Nac.",
  DEAT: "Def.",
  MARR: "Mat.",
  DIV: "Div."
};

type Props = {
  items: TimelineItem[];
  zoom: number;
  offset: number;
  activeItemId: string | null;
  onZoomChange: (zoom: number) => void;
  onOffsetChange: (offset: number) => void;
  onItemClick: (item: TimelineItem) => void;
  onItemHover: (item: TimelineItem, event: MouseEvent<HTMLElement>) => void;
  onGroupHover?: (items: TimelineItem[], event: MouseEvent<HTMLElement>) => void;
  onItemLeave: () => void;
  cursorEnabled: boolean;
  cursorMode: "year" | "decade";
  cursorValue: number;
  followCursor?: boolean;
};

type PositionedItem = {
  item: TimelineItem;
  naturalY: number;
};

type PositionedCluster = {
  key: string;
  y: number;
  startY: number;
  endY: number;
  items: TimelineItem[];
};

function toYearFraction(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return year + month / 12 + day / 365;
}

export function TimelineScaleView({
  items,
  zoom,
  offset,
  activeItemId,
  onZoomChange,
  onOffsetChange,
  onItemClick,
  onItemHover,
  onGroupHover,
  onItemLeave,
  cursorEnabled,
  cursorMode,
  cursorValue,
  followCursor = false
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const safeZoom = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, Math.round(zoom)));
  const zoomModel = ZOOM_LEVELS[safeZoom];

  const datedItems = useMemo(
    () => items.filter((item) => !item.undated && item.sortDate !== null),
    [items]
  );

  const layout = useMemo(() => {
    if (datedItems.length === 0) {
      return {
        minYear: 0,
        maxYear: 0,
        points: [] as PositionedItem[],
        clusters: [] as PositionedCluster[],
        baseHeight: 360,
        minValue: 0
      };
    }

    const records = datedItems
      .map((item) => ({
        item,
        value: toYearFraction(item.sortDate as Date)
      }))
      .sort((left, right) => left.value - right.value);

    const minYear = Math.floor(records[0]!.value);
    const maxYear = Math.ceil(records[records.length - 1]!.value);
    const minValue = records[0]!.value;
    const maxValue = records[records.length - 1]!.value;
    const range = Math.max(1, maxValue - minValue);
    const theoreticalHeight = Math.max(360, Math.ceil(range * zoomModel.pxPerYear + 140));

    const points: PositionedItem[] = [];
    for (const entry of records) {
      points.push({
        item: entry.item,
        naturalY: 56 + (entry.value - minValue) * zoomModel.pxPerYear
      });
    }

    const mergeGap = safeZoom <= 0 ? 22 : safeZoom === 1 ? 18 : 12;
    const clusters: PositionedCluster[] = [];
    for (const point of points) {
      const last = clusters[clusters.length - 1];
      if (!last) {
        clusters.push({
          key: point.item.id,
          y: point.naturalY,
          startY: point.naturalY,
          endY: point.naturalY,
          items: [point.item]
        });
        continue;
      }
      if (point.naturalY - last.endY <= mergeGap) {
        const nextItems = [...last.items, point.item];
        const center = nextItems.reduce((acc, item) => {
          const p = points.find((entry) => entry.item.id === item.id);
          return acc + (p?.naturalY ?? last.y);
        }, 0) / nextItems.length;
        last.items = nextItems;
        last.endY = point.naturalY;
        last.y = center;
        last.key = `${last.key}|${point.item.id}`;
      } else {
        clusters.push({
          key: point.item.id,
          y: point.naturalY,
          startY: point.naturalY,
          endY: point.naturalY,
          items: [point.item]
        });
      }
    }

    const stackedHeight = points.length ? points[points.length - 1]!.naturalY + 90 : theoreticalHeight;
    const baseHeight = Math.max(theoreticalHeight, stackedHeight);

    return { minYear, maxYear, points, clusters, baseHeight, minValue };
  }, [datedItems, safeZoom, zoomModel.pxPerYear]);

  const ticks = useMemo(() => {
    if (datedItems.length === 0) return [] as Array<{ key: string; year: number; y: number }>;

    const step = safeZoom <= 0 ? 100 : safeZoom === 1 ? 10 : 1;
    const yearSpan = layout.maxYear - layout.minYear;
    const boundedStep = yearSpan > 400 && step < 20 ? 20 : step;
    const firstYear = Math.floor(layout.minYear / boundedStep) * boundedStep;
    const lastYear = Math.ceil(layout.maxYear / boundedStep) * boundedStep;

    const result: Array<{ key: string; year: number; y: number }> = [];
    for (let year = firstYear; year <= lastYear; year += boundedStep) {
      const y = 56 + (year - layout.minValue) * zoomModel.pxPerYear;
      result.push({ key: String(year), year, y });
    }
    return result;
  }, [datedItems, layout.maxYear, layout.minYear, layout.minValue, safeZoom, zoomModel.pxPerYear]);
  const cursor = useMemo(() => {
    const startY = 56 + (cursorValue - layout.minValue) * zoomModel.pxPerYear;
    if (cursorMode === "year") {
      return { startY, endY: startY, label: `${cursorValue}` };
    }
    const endY = 56 + (cursorValue + 9 - layout.minValue) * zoomModel.pxPerYear;
    return { startY, endY, label: `${cursorValue}s` };
  }, [cursorMode, cursorValue, layout.minValue, zoomModel.pxPerYear]);

  useEffect(() => {
    if (!followCursor || !cursorEnabled) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const cursorCenterY = cursorMode === "year" ? cursor.startY : (cursor.startY + cursor.endY) / 2;
    const targetY = cursorCenterY + offset;
    const desiredScrollTop = targetY - viewport.clientHeight * 0.45;
    const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const nextScrollTop = Math.max(0, Math.min(maxScrollTop, desiredScrollTop));
    if (Math.abs(viewport.scrollTop - nextScrollTop) < 2) return;

    viewport.scrollTo({ top: nextScrollTop, behavior: "auto" });
  }, [followCursor, cursorEnabled, cursorMode, cursor.startY, cursor.endY, offset]);

  if (datedItems.length === 0) {
    return (
      <div className="timeline-empty">
        No hay eventos fechados para la escala. Los eventos sin fecha se muestran solo en Lista.
      </div>
    );
  }

  return (
    <div className="timeline-scale-root">
      <div className="timeline-scale-controls">
        <div className="timeline-scale-control-group">
          <button onClick={() => onZoomChange(safeZoom - 1)} disabled={safeZoom <= 0}>- Zoom</button>
          <span className="timeline-scale-level">{zoomModel.label}</span>
          <button onClick={() => onZoomChange(safeZoom + 1)} disabled={safeZoom >= ZOOM_LEVELS.length - 1}>+ Zoom</button>
        </div>
        <div className="timeline-scale-control-group">
          <button onClick={() => onOffsetChange(offset - 60)}>Subir</button>
          <button onClick={() => onOffsetChange(offset + 60)}>Bajar</button>
          <button onClick={() => onOffsetChange(0)} disabled={offset === 0}>Reset</button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="timeline-scale-viewport"
        onWheel={(event) => {
          if (!event.shiftKey) return;
          event.preventDefault();
          onOffsetChange(offset - event.deltaY);
        }}
      >
        <div className="timeline-scale-canvas" style={{ height: layout.baseHeight }}>
          <div className="timeline-scale-shift" style={{ transform: `translateY(${offset}px)` }}>
            <div className="timeline-scale-axis" />

            {ticks.map((tick) => (
              <div key={tick.key} className="timeline-scale-tick" style={{ top: tick.y }}>
                <span>{tick.year}</span>
              </div>
            ))}

            {cursorEnabled && cursorMode === "decade" ? (
              <div
                className="timeline-scale-cursor-band"
                style={{
                  top: Math.min(cursor.startY, cursor.endY),
                  height: Math.max(16, Math.abs(cursor.endY - cursor.startY))
                }}
              />
            ) : null}

            {cursorEnabled ? (
              <div className="timeline-scale-cursor-line" style={{ top: cursor.startY }}>
                <span>{cursor.label}</span>
              </div>
            ) : null}

            {layout.clusters.map((cluster) => {
              const first = cluster.items[0];
              const isGroup = cluster.items.length > 1;
              const isActive = cluster.items.some((item) => item.id === activeItemId);
              if (!first) return null;

              return (
                <button
                  key={cluster.key}
                  className={`timeline-scale-item${isActive ? " timeline-scale-item--active" : ""}${isGroup ? " timeline-scale-item--group" : ""}`}
                  style={{ top: cluster.y - 13 }}
                  onClick={() => onItemClick(first)}
                  onMouseEnter={(event) => {
                    if (isGroup) {
                      onGroupHover?.(cluster.items, event);
                    } else {
                      onItemHover(first, event);
                    }
                  }}
                  onMouseLeave={onItemLeave}
                >
                  <span className="timeline-scale-item-type">{isGroup ? `${cluster.items.length}x` : TYPE_SHORT[first.eventType]}</span>
                  <span className="timeline-scale-item-date">{first.displayDate}</span>
                  <span className="timeline-scale-item-label">
                    {isGroup ? `${cluster.items.length} eventos agrupados` : first.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
