import type { TimelineItem } from "@/types/editor";

const TYPE_LABEL: Record<TimelineItem["eventType"], string> = {
  BIRT: "Nacimiento",
  DEAT: "Defunción",
  MARR: "Matrimonio",
  DIV: "Divorcio"
};

const CERTAINTY_LABEL: Record<TimelineItem["certainty"], string> = {
  exact: "Exacta",
  estimated_manual: "Estimada (manual)",
  inferred_auto: "Inferida (automática)",
  undated: "Sin fecha"
};

type Props = {
  item?: TimelineItem;
  items?: TimelineItem[];
  x: number;
  y: number;
};

function renderItemRows(item: TimelineItem) {
  return (
    <>
      <div className="timeline-tooltip-row">
        <strong>Fecha:</strong> {item.displayDate}
      </div>
      <div className="timeline-tooltip-row">
        <strong>Tipo:</strong> {TYPE_LABEL[item.eventType]}
      </div>
      <div className="timeline-tooltip-row">
        <strong>Certeza:</strong> {CERTAINTY_LABEL[item.certainty]}
      </div>
      <div className="timeline-tooltip-row">
        <strong>Detalle:</strong> {item.detail}
      </div>
    </>
  );
}

export function TimelineEventTooltip({ item, items, x, y }: Props) {
  const grouped = (items ?? []).filter(Boolean);
  const isGroup = grouped.length > 1;
  const primary = isGroup ? grouped[0] : item ?? grouped[0];
  if (!primary) return null;

  return (
    <div
      className="timeline-tooltip"
      style={{
        position: "fixed",
        left: x + 12,
        top: y + 12
      }}
    >
      {isGroup ? (
        <>
          <div className="timeline-tooltip-title">{grouped.length} eventos agrupados</div>
          {grouped.slice(0, 8).map((entry) => (
            <div key={entry.id} className="timeline-tooltip-row">
              <strong>{TYPE_LABEL[entry.eventType]}</strong> {entry.displayDate} - {entry.label}
            </div>
          ))}
          {grouped.length > 8 ? (
            <div className="timeline-tooltip-row">+{grouped.length - 8} mas</div>
          ) : null}
        </>
      ) : (
        <>
          <div className="timeline-tooltip-title">{primary.label}</div>
          {renderItemRows(primary)}
        </>
      )}
    </div>
  );
}
