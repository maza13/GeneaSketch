import { useEffect, useMemo, useState } from "react";
import { buildTimeline } from "@/core/timeline/buildTimeline";
import { buildTimelineHighlightPayload } from "@/core/timeline/highlightMapping";
import { inferTimelineStatus, inferTimelineEvents } from "@/core/timeline/livingPresence";
import type { ExpandedGraph, GeneaDocument, ViewConfig } from "@/types/domain";
import type { TimelineItem } from "@/types/editor";
import { TimelineListView } from "@/ui/timeline/TimelineListView";
import { TimelineScaleView } from "@/ui/timeline/TimelineScaleView";
import { TimelineEventTooltip } from "@/ui/timeline/TimelineEventTooltip";

type Props = {
  document: GeneaDocument | null;
  expandedGraph: ExpandedGraph;
  viewConfig: ViewConfig | null;
  onTimelineView: (view: "list" | "scale") => void;
  onTimelineScaleZoom: (zoom: number) => void;
  onTimelineScaleOffset: (offset: number) => void;
  onTimelineHighlight: (payload: { sourceItemId: string; primaryPersonId: string | null; secondaryPersonIds: string[] } | null) => void;
  onTimelineStatus: (livingIds: string[], deceasedIds: string[], year: number, eventPersonIds: string[]) => void;
};

type HoverState =
  | { kind: "item"; item: TimelineItem; x: number; y: number }
  | { kind: "group"; items: TimelineItem[]; x: number; y: number };

export function TimelineRightPanel({
  document,
  expandedGraph,
  viewConfig,
  onTimelineView,
  onTimelineScaleZoom,
  onTimelineScaleOffset,
  onTimelineHighlight,
  onTimelineStatus
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [livingMode, setLivingMode] = useState<"year" | "decade">("year");
  const [livingValue, setLivingValue] = useState<number>(new Date().getFullYear());
  const [livingEnabled, setLivingEnabled] = useState(false);

  const items = useMemo(() => {
    if (!document || !viewConfig) return [];
    return buildTimeline(document, expandedGraph, viewConfig);
  }, [document, expandedGraph, viewConfig]);
  const visiblePersonIds = useMemo(() => {
    const ids = new Set<string>();
    for (const node of expandedGraph.nodes) {
      if (node.type !== "person" && node.type !== "personAlias") continue;
      ids.add(node.canonicalId ?? node.id);
    }
    return ids;
  }, [expandedGraph]);
  const datedYears = useMemo(
    () =>
      items
        .filter((item) => item.sortDate)
        .map((item) => (item.sortDate as Date).getUTCFullYear()),
    [items]
  );
  const bounds = useMemo(() => {
    const current = new Date().getFullYear();
    if (datedYears.length === 0) return { min: current - 120, max: current + 20 };
    return {
      min: Math.min(...datedYears) - 5,
      max: Math.max(...datedYears) + 5
    };
  }, [datedYears]);

  const timelineOverlay = viewConfig?.dtree?.overlays.find(o => o.type === 'timeline');
  const activeItemId = timelineOverlay?.config.sourceItemId ?? null;
  const timelineView = viewConfig?.timeline.view ?? "list";
  const effectiveScope = viewConfig?.timeline.scope ?? "visible";
  const scopeLabel = effectiveScope === "all" ? "Todo el archivo" : "Solo visibles";
  const scopedLivingIds = useMemo(() => {
    const ids = (timelineOverlay?.config.livingIds as string[]) ?? [];
    if (effectiveScope === "all") return ids;
    return ids.filter((id) => visiblePersonIds.has(id));
  }, [effectiveScope, timelineOverlay?.config.livingIds, visiblePersonIds]);
  const livingCount = scopedLivingIds.length;
  const normalizedDecade = Math.floor(livingValue / 10) * 10;
  const effectiveValue = livingMode === "decade" ? normalizedDecade : Math.floor(livingValue);

  const onItemClick = (item: TimelineItem) => {
    const payload = buildTimelineHighlightPayload(item);
    onTimelineHighlight(payload);
  };

  useEffect(() => {
    if (!livingEnabled) {
      onTimelineStatus([], [], livingValue, []);
      return;
    }
    if (!document) {
      onTimelineStatus([], [], livingValue, []);
      return;
    }

    const { living, deceased } = inferTimelineStatus(document, effectiveValue);
    const events = inferTimelineEvents(document, effectiveValue);
    let livingIds = Array.from(living);
    let deceasedIds = Array.from(deceased);
    let eventIds = Array.from(events);

    if (effectiveScope === "visible") {
      livingIds = livingIds.filter((id) => visiblePersonIds.has(id));
      deceasedIds = deceasedIds.filter((id) => visiblePersonIds.has(id));
      eventIds = eventIds.filter((id) => visiblePersonIds.has(id));
    }
    onTimelineStatus(livingIds, deceasedIds, effectiveValue, eventIds);
  }, [
    document,
    livingEnabled,
    effectiveValue,
    onTimelineStatus,
    effectiveScope,
    visiblePersonIds
  ]);

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setLivingValue(prev => {
        const next = prev + (livingMode === 'year' ? 1 : 10);
        if (next > bounds.max) {
          return bounds.min;
        }
        return next;
      });
      setLivingEnabled(true);
    }, 67);
    return () => clearInterval(interval);
  }, [isPlaying, livingMode, bounds.max, bounds.min]);

  useEffect(() => {
    if (((timelineOverlay?.config.livingIds as string[])?.length ?? 0) > 0) {
      setLivingEnabled(true);
    }
  }, [timelineOverlay?.config.livingIds]);

  return (
    <aside className="panel panel-right timeline-panel">
      <h2>Timeline</h2>
      <div className="timeline-summary">
        <span>{items.length} eventos</span>
        <span>Alcance: {scopeLabel}</span>
      </div>

      <div className="timeline-tabs">
        <button
          className={timelineView === "list" ? "timeline-tab timeline-tab--active" : "timeline-tab"}
          onClick={() => onTimelineView("list")}
        >
          Lista
        </button>
        <button
          className={timelineView === "scale" ? "timeline-tab timeline-tab--active" : "timeline-tab"}
          onClick={() => onTimelineView("scale")}
        >
          Escala
        </button>
        <button
          className="timeline-tab timeline-tab--ghost"
          onClick={() => onTimelineHighlight(null)}
          disabled={!activeItemId}
        >
          Limpiar resaltado
        </button>
      </div>

      <div className="timeline-living-controls">
        <div className="timeline-living-title">Vivos por periodo (inferido)</div>
        <div className="timeline-living-row timeline-living-mode">
          <button
            className={livingMode === "year" ? "timeline-tab timeline-tab--active" : "timeline-tab"}
            onClick={() => {
              setLivingMode("year");
              setLivingEnabled(true);
            }}
          >
            {"A\u00f1o"}
          </button>
          <button
            className={livingMode === "decade" ? "timeline-tab timeline-tab--active" : "timeline-tab"}
            onClick={() => {
              setLivingMode("decade");
              setLivingValue(Math.floor(livingValue / 10) * 10);
              setLivingEnabled(true);
            }}
          >
            {"D\u00e9cada"}
          </button>
        </div>
        <div className="timeline-living-row">
          <label className="timeline-living-switch">
            <input
              type="checkbox"
              checked={livingEnabled}
              onChange={(event) => setLivingEnabled(event.target.checked)}
            />
            Resaltar vivos
          </label>
          <div className="timeline-living-value">
            {livingMode === "year" ? `${effectiveValue}` : `${effectiveValue}s`}
          </div>
          <button
            onClick={() => {
              setLivingEnabled(false);
              onTimelineStatus([], [], livingValue, []);
            }}
            disabled={livingCount === 0}
          >
            Quitar
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ fontWeight: "bold", color: isPlaying ? "var(--danger-text)" : "var(--accent)" }}
          >
            {isPlaying ? "|| Pausar" : "> Reproducir"}
          </button>
        </div>
        <input
          className="timeline-year-slider"
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={livingMode === "year" ? 1 : 10}
          value={effectiveValue}
          onChange={(event) => {
            const raw = Number(event.target.value);
            if (!Number.isFinite(raw)) return;
            setLivingValue(livingMode === "year" ? Math.floor(raw) : Math.floor(raw / 10) * 10);
            setLivingEnabled(true);
          }}
        />
        <div className="timeline-living-meta">
          {livingMode === "year"
            ? `${livingCount} personas vivas en ${effectiveValue}`
            : `${livingCount} personas vivas en la decada de ${effectiveValue}`}
        </div>
      </div>

      <div className="timeline-content">
        {timelineView === "scale" ? (
          <TimelineScaleView
            items={items}
            zoom={viewConfig?.timeline.scaleZoom ?? 1}
            offset={viewConfig?.timeline.scaleOffset ?? 0}
            activeItemId={activeItemId}
            onZoomChange={onTimelineScaleZoom}
            onOffsetChange={onTimelineScaleOffset}
            onItemClick={onItemClick}
            onItemHover={(item, event) => setHover({ kind: "item", item, x: event.clientX, y: event.clientY })}
            onGroupHover={(groupItems, event) => setHover({ kind: "group", items: groupItems, x: event.clientX, y: event.clientY })}
            onItemLeave={() => setHover(null)}
            cursorEnabled={livingEnabled}
            cursorMode={livingMode}
            cursorValue={effectiveValue}
            followCursor={livingEnabled}
          />
        ) : (
          <TimelineListView
            items={items}
            activeItemId={activeItemId}
            onItemClick={onItemClick}
            onItemHover={(item, event) => setHover({ kind: "item", item, x: event.clientX, y: event.clientY })}
            onItemLeave={() => setHover(null)}
            cursorEnabled={livingEnabled}
            cursorMode={livingMode}
            cursorValue={effectiveValue}
          />
        )}
      </div>

      {hover ? (
        hover.kind === "item" ? (
          <TimelineEventTooltip item={hover.item} x={hover.x} y={hover.y} />
        ) : (
          <TimelineEventTooltip items={hover.items} x={hover.x} y={hover.y} />
        )
      ) : null}
    </aside>
  );
}


