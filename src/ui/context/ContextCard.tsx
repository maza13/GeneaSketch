import { ReactNode } from "react";

export type ContextCardRow = {
  label: string;
  value: string;
  tone?: "normal" | "muted" | "accent" | "warn";
};

export type ContextCardPayload = {
  title: string;
  rows: ContextCardRow[];
  footer?: string;
};

type Props = {
  title?: string;
  rows?: ContextCardRow[];
  footer?: string;
  children?: ReactNode;
  compact?: boolean;
};

export function ContextCard({ title, rows, footer, children, compact = false }: Props) {
  return (
    <div className={`context-card${compact ? " context-card--compact" : ""}`}>
      {title ? <div className="context-card__title">{title}</div> : null}

      {rows && rows.length > 0 ? (
        <div className="context-card__rows">
          {rows.map((row, index) => (
            <div key={`${row.label}-${index}`} className="context-card__row">
              <span className="context-card__label">{row.label}</span>
              <span className={`context-card__value context-card__value--${row.tone || "normal"}`}>{row.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {children ? <div className="context-card__content">{children}</div> : null}

      {footer ? <div className="context-card__footer">{footer}</div> : null}
    </div>
  );
}
