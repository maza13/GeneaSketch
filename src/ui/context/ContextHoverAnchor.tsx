import { ReactNode, useState } from "react";

type Props = {
  anchor: ReactNode;
  card: ReactNode;
  className?: string;
};

export function ContextHoverAnchor({ anchor, card, className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`context-hover-anchor${className ? ` ${className}` : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {anchor}
      {open ? <span className="context-hover-anchor__card">{card}</span> : null}
    </span>
  );
}
