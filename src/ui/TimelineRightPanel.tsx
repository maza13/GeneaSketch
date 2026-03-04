import { useEffect, useMemo, useState } from "react";
import { buildTimeline } from "@/core/timeline/buildTimeline";
import { buildTimelineHighlightPayload } from "@/core/timeline/highlightMapping";
import { inferTimelineStatus, inferTimelineEvents } from "@/core/timeline/livingPresence";
import type { ExpandedGraph, GraphDocument, ViewConfig } from "@/types/domain";
import type { TimelineItem } from "@/types/editor";
import { TimelineListView } from "@/ui/timeline/TimelineListView";
import { TimelineScaleView } from "@/ui/timeline/TimelineScaleView";
import { TimelineEventTooltip } from "@/ui/timeline/TimelineEventTooltip";

type Props = {
  document: GraphDocument | null;
  expandedGraph: ExpandedGraph;
  viewConfig: ViewConfig | null;
  onTimelineView: (view: "list" | "scale") => void;
  onTimelineScaleZoom: (zoom: number) => void;
  onTimelineScaleOffset: (offset: number) => void;
  onTimelineHighlight: (payload: { sourceItemId: string; primaryPersonId: string | null; secondaryPersonIds: string[] } | null) => void;
  onTimelineStatus: (livingIds: string[], deceasedIds: string[], year: number, eventPersonIds: string[]) => void;
  timelineMode: "expanded" | "compact";
  onToggleTimelineExpanded: () => void;
  onClosePanel?: () => void;
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
  onTimelineStatus,
  timelineMode,
  onToggleTimelineExpanded,
  onClosePanel
}: Props) {
  const timelineExpanded = timelineMode === "expanded";
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
    <div className="gs-panel timeline-panel timeline-panel--embedded">
      <div className="gs-panel-header">
        <span className="material-symbols-outlined gs-panel-header-icon">history_toggle_off</span>
        <span className="gs-panel-header-title">Timeline</span>
        <div className="gs-panel-header-actions">
          <button
            className="panel-icon-btn"
            onClick={onToggleTimelineExpanded}
            title={timelineExpanded ? "Contraer timeline" : "Expandir timeline"}
          >
            <span
              className="material-symbols-outlined"
              style={{ transform: timelineExpanded ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 200ms ease" }}
            >
              expand_less
            </span>
          </button>
          {onClosePanel ? (
            <button
              className="panel-icon-btn"
              onClick={onClosePanel}
              title="Cerrar timeline"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="gs-panel-body" style={{ padding: 0 }}>
        {!timelineExpanded ? (
          <div className="timeline-collapsed-hint" style={{ padding: "12px", fontSize: "12px", opacity: 0.6, fontStyle: "italic", textAlign: "center" }}>
            Timeline contraido. Usa el icono de expandir para ver eventos.
          </div>
        ) : (
          <div className="timeline-body-content" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div className="timeline-summary" style={{ padding: "8px 12px", fontSize: "11px", display: "flex", justifyContent: "space-between", background: "var(--bg-panel-alt)", borderBottom: "1px solid var(--line-soft)" }}>
              <span>{items.length} eventos</span>
              <span>Alcance: {scopeLabel}</span>
            </div>

            <div className="timeline-tabs" style={{ display: "flex", padding: "4px", gap: "4px", borderBottom: "1px solid var(--line-soft)" }}>
              <button
                className={timelineView === "list" ? "timeline-tab timeline-tab--active" : "timeline-tab"}
                onClick={() => onTimelineView("list")}
                style={{ flex: 1 }}
              >
                Lista
              </button>
              <button
                className={timelineView === "scale" ? "timeline-tab timeline-tab--active" : "timeline-tab"}
                onClick={() => onTimelineView("scale")}
                style={{ flex: 1 }}
              >
                Escala
              </button>
              <button
                className="panel-icon-btn"
                onClick={() => onTimelineHighlight(null)}
                disabled={!activeItemId}
                title="Limpiar resaltado"
                style={{ width: "auto", padding: "0 8px" }}
              >
                <span className="material-symbols-outlined">filter_alt_off</span>
              </button>
            </div>

            <div className="timeline-living-controls" style={{ padding: "12px", borderBottom: "1px solid var(--line-soft)" }}>
              <div className="timeline-living-title" style={{ fontSize: "11px", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase", color: "var(--gs-ink-muted)" }}>Presencia en el tiempo</div>

              <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                <button
                  className={livingMode === "year" ? "gs-panel-btn-subtle gs-panel-btn-subtle--active" : "gs-panel-btn-subtle"}
                  style={{ flex: 1 }}
                  onClick={() => {
                    setLivingMode("year");
                    setLivingEnabled(true);
                  }}
                >
                  Año
                </button>
                <button
                  className={livingMode === "decade" ? "gs-panel-btn-subtle gs-panel-btn-subtle--active" : "gs-panel-btn-subtle"}
                  style={{ flex: 1 }}
                  onClick={() => {
                    setLivingMode("decade");
                    setLivingValue(Math.floor(livingValue / 10) * 10);
                    setLivingEnabled(true);
                  }}
                >
                  Década
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <label className="toggle" style={{ flex: 1, fontSize: "12px" }}>
                  <input
                    type="checkbox"
                    checked={livingEnabled}
                    onChange={(event) => setLivingEnabled(event.target.checked)}
                  />
                  Resaltar vivos
                </label>
                <div style={{ fontSize: "14px", fontWeight: 700, minWidth: "50px", textAlign: "right", fontFamily: "monospace" }}>
                  {livingMode === "year" ? `${effectiveValue}` : `${effectiveValue}s`}
                </div>
              </div>

              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  className="gs-panel-btn-subtle"
                  style={{ flex: 1 }}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px", verticalAlign: "middle", marginRight: "4px" }}>
                    {isPlaying ? "pause" : "play_arrow"}
                  </span>
                  {isPlaying ? "Pausar" : "Reproducir"}
                </button>
                <button
                  className="gs-panel-btn-subtle"
                  onClick={() => {
                    setLivingEnabled(false);
                    onTimelineStatus([], [], livingValue, []);
                  }}
                  disabled={livingCount === 0}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>restart_alt</span>
                </button>
              </div>

              <input
                className="gs-slider"
                style={{ width: "100%", marginTop: "12px" }}
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
              <div style={{ fontSize: "10px", marginTop: "4px", color: "var(--gs-ink-muted)", textAlign: "center" }}>
                {livingMode === "year"
                  ? `${livingCount} personas vivas en ${effectiveValue}`
                  : `${livingCount} personas vivas en la decada de ${effectiveValue}`}
              </div>
            </div>

            <div className="timeline-content" style={{ flex: 1, minHeight: 0 }}>
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
                <TimelineEventTooltip items={hover.items} x={hover.y} y={hover.y} />
              )
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
