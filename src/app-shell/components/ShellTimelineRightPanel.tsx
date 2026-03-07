import { useEffect, useState } from "react";
import type { TimelinePanelViewModel, TimelinePresenceResult } from "@/app-shell/facade/types";
import type { TimelineViewMode } from "@/types/domain";
import type { TimelineItem } from "@/types/editor";
import { TimelineEventTooltip } from "@/ui/timeline/TimelineEventTooltip";
import { TimelineListView } from "@/ui/timeline/TimelineListView";
import { TimelineScaleView } from "@/ui/timeline/TimelineScaleView";

type HoverState =
  | { kind: "item"; item: TimelineItem; x: number; y: number }
  | { kind: "group"; items: TimelineItem[]; x: number; y: number };

type Props = {
  viewModel: TimelinePanelViewModel;
  commands: {
    onTimelineView: (view: TimelineViewMode) => void;
    onTimelineScaleZoom: (zoom: number) => void;
    onTimelineScaleOffset: (offset: number) => void;
    onTimelineHighlight: (payload: { sourceItemId: string; primaryPersonId: string | null; secondaryPersonIds: string[] } | null) => void;
    onTimelinePresence: (value: number, mode: "year" | "decade") => TimelinePresenceResult;
    onApplyPresence: (result: TimelinePresenceResult) => void;
    onToggleTimelineExpanded: () => void;
    onClosePanel: () => void;
  };
};

export function ShellTimelineRightPanel({ viewModel, commands }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [livingMode, setLivingMode] = useState<"year" | "decade">("year");
  const [livingValue, setLivingValue] = useState<number>(new Date().getFullYear());
  const [livingEnabled, setLivingEnabled] = useState(false);

  useEffect(() => {
    if (!livingEnabled) {
      commands.onApplyPresence({ livingIds: [], deceasedIds: [], eventIds: [], livingCount: 0, effectiveValue: livingValue });
      return;
    }
    commands.onApplyPresence(commands.onTimelinePresence(livingValue, livingMode));
  }, [commands, livingEnabled, livingMode, livingValue]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setLivingValue((prev) => {
        const step = livingMode === "year" ? 1 : 10;
        const next = prev + step;
        return next > viewModel.bounds.max ? viewModel.bounds.min : next;
      });
      setLivingEnabled(true);
    }, 67);
    return () => clearInterval(timer);
  }, [isPlaying, livingMode, viewModel.bounds.max, viewModel.bounds.min]);

  return (
    <div className="gs-panel timeline-panel timeline-panel--embedded">
      <div className="gs-panel-header">
        <span className="material-symbols-outlined gs-panel-header-icon">history_toggle_off</span>
        <span className="gs-panel-header-title">Timeline</span>
        <div className="gs-panel-header-actions">
          <button className="panel-icon-btn" onClick={commands.onToggleTimelineExpanded} title={viewModel.isExpanded ? "Contraer timeline" : "Expandir timeline"}>
            <span className="material-symbols-outlined" style={{ transform: viewModel.isExpanded ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 200ms ease" }}>
              expand_less
            </span>
          </button>
          <button className="panel-icon-btn" onClick={commands.onClosePanel} title="Cerrar timeline">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div className="gs-panel-body" style={{ padding: 0 }}>
        {!viewModel.isExpanded ? (
          <div className="timeline-collapsed-hint" style={{ padding: "12px", fontSize: "12px", opacity: 0.6, fontStyle: "italic", textAlign: "center" }}>
            Timeline contraido. Usa el icono de expandir para ver eventos.
          </div>
        ) : (
          <div className="timeline-body-content" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div className="timeline-summary" style={{ padding: "8px 12px", fontSize: "11px", display: "flex", justifyContent: "space-between", background: "var(--bg-panel-alt)", borderBottom: "1px solid var(--line-soft)" }}>
              <span>{viewModel.items.length} eventos</span>
              <span>Alcance: {viewModel.scopeLabel}</span>
            </div>

            <div className="timeline-tabs" style={{ display: "flex", padding: "4px", gap: "4px", borderBottom: "1px solid var(--line-soft)" }}>
              <button className={viewModel.timelineView === "list" ? "timeline-tab timeline-tab--active" : "timeline-tab"} onClick={() => commands.onTimelineView("list")} style={{ flex: 1 }}>
                Lista
              </button>
              <button className={viewModel.timelineView === "scale" ? "timeline-tab timeline-tab--active" : "timeline-tab"} onClick={() => commands.onTimelineView("scale")} style={{ flex: 1 }}>
                Escala
              </button>
              <button className="panel-icon-btn" onClick={() => commands.onTimelineHighlight(null)} disabled={!viewModel.activeItemId} title="Limpiar resaltado" style={{ width: "auto", padding: "0 8px" }}>
                <span className="material-symbols-outlined">filter_alt_off</span>
              </button>
            </div>

            <div className="timeline-living-controls" style={{ padding: "12px", borderBottom: "1px solid var(--line-soft)" }}>
              <div className="timeline-living-title" style={{ fontSize: "11px", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase", color: "var(--gs-ink-muted)" }}>
                Presencia en el tiempo
              </div>

              <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                <button className={livingMode === "year" ? "gs-panel-btn-subtle gs-panel-btn-subtle--active" : "gs-panel-btn-subtle"} style={{ flex: 1 }} onClick={() => { setLivingMode("year"); setLivingEnabled(true); }}>
                  Anio
                </button>
                <button className={livingMode === "decade" ? "gs-panel-btn-subtle gs-panel-btn-subtle--active" : "gs-panel-btn-subtle"} style={{ flex: 1 }} onClick={() => { setLivingMode("decade"); setLivingValue(Math.floor(livingValue / 10) * 10); setLivingEnabled(true); }}>
                  Decada
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <label className="toggle" style={{ flex: 1, fontSize: "12px" }}>
                  <input type="checkbox" checked={livingEnabled} onChange={(event) => setLivingEnabled(event.target.checked)} />
                  Resaltar vivos
                </label>
                <div style={{ fontSize: "14px", fontWeight: 700, minWidth: "50px", textAlign: "right", fontFamily: "monospace" }}>
                  {livingMode === "year" ? `${Math.floor(livingValue)}` : `${Math.floor(livingValue / 10) * 10}s`}
                </div>
              </div>

              <div style={{ display: "flex", gap: "4px" }}>
                <button className="gs-panel-btn-subtle" style={{ flex: 1 }} onClick={() => setIsPlaying((prev) => !prev)}>
                  {isPlaying ? "Pausar" : "Reproducir"}
                </button>
                <button className="gs-panel-btn-subtle" onClick={() => { setLivingEnabled(false); commands.onApplyPresence({ livingIds: [], deceasedIds: [], eventIds: [], livingCount: 0, effectiveValue: livingValue }); }}>
                  Reset
                </button>
              </div>

              <input
                className="gs-slider"
                style={{ width: "100%", marginTop: "12px" }}
                type="range"
                min={viewModel.bounds.min}
                max={viewModel.bounds.max}
                step={livingMode === "year" ? 1 : 10}
                value={livingMode === "year" ? Math.floor(livingValue) : Math.floor(livingValue / 10) * 10}
                onChange={(event) => {
                  const raw = Number(event.target.value);
                  if (!Number.isFinite(raw)) return;
                  setLivingValue(livingMode === "year" ? Math.floor(raw) : Math.floor(raw / 10) * 10);
                  setLivingEnabled(true);
                }}
              />
            </div>

            <div className="timeline-content" style={{ flex: 1, minHeight: 0 }}>
              {viewModel.timelineView === "scale" ? (
                <TimelineScaleView
                  items={viewModel.items}
                  zoom={viewModel.scaleZoom}
                  offset={viewModel.scaleOffset}
                  activeItemId={viewModel.activeItemId}
                  onZoomChange={commands.onTimelineScaleZoom}
                  onOffsetChange={commands.onTimelineScaleOffset}
                  onItemClick={(item) => commands.onTimelineHighlight({ sourceItemId: item.id, primaryPersonId: item.primaryPersonId ?? null, secondaryPersonIds: item.secondaryPersonIds || [] })}
                  onItemHover={(item, event) => setHover({ kind: "item", item, x: event.clientX, y: event.clientY })}
                  onGroupHover={(items, event) => setHover({ kind: "group", items, x: event.clientX, y: event.clientY })}
                  onItemLeave={() => setHover(null)}
                  cursorEnabled={livingEnabled}
                  cursorMode={livingMode}
                  cursorValue={livingMode === "year" ? Math.floor(livingValue) : Math.floor(livingValue / 10) * 10}
                  followCursor={livingEnabled}
                />
              ) : (
                <TimelineListView
                  items={viewModel.items}
                  activeItemId={viewModel.activeItemId}
                  onItemClick={(item) => commands.onTimelineHighlight({ sourceItemId: item.id, primaryPersonId: item.primaryPersonId ?? null, secondaryPersonIds: item.secondaryPersonIds || [] })}
                  onItemHover={(item, event) => setHover({ kind: "item", item, x: event.clientX, y: event.clientY })}
                  onItemLeave={() => setHover(null)}
                  cursorEnabled={livingEnabled}
                  cursorMode={livingMode}
                  cursorValue={livingMode === "year" ? Math.floor(livingValue) : Math.floor(livingValue / 10) * 10}
                />
              )}
            </div>

            {hover ? hover.kind === "item" ? <TimelineEventTooltip item={hover.item} x={hover.x} y={hover.y} /> : <TimelineEventTooltip items={hover.items} x={hover.x} y={hover.y} /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
