import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GraphNodeKind } from "@/types/editor";

export type NodeActionMenuItem = {
  id: string;
  label: string;
  disabled?: boolean;
  group?: "accion" | "vista" | "herramientas";
  onSelect?: () => void;
  children?: NodeActionMenuItem[];
};

type Props = {
  open: boolean;
  x: number;
  y: number;
  nodeKind: GraphNodeKind;
  title: string;
  items: NodeActionMenuItem[];
  onClose: () => void;
};

const MENU_WIDTH = 280;
const SUB_MENU_OFFSET = 10;
const EDGE_PADDING = 12;

export function NodeActionMenu({ open, x, y, nodeKind, title, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });
  const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);
  const [activeSubmenuY, setActiveSubmenuY] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const menuEl = menuRef.current;
    if (!menuEl) return;
    const rect = menuEl.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - EDGE_PADDING;
    const maxY = window.innerHeight - rect.height - EDGE_PADDING;
    setPosition({
      x: Math.max(EDGE_PADDING, Math.min(x, maxX)),
      y: Math.max(EDGE_PADDING, Math.min(y, maxY))
    });
  }, [open, x, y, items.length]);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };
    const onDocKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setActiveSubmenuId(null);
      return;
    }
    const firstEnabled = menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)");
    firstEnabled?.focus();
  }, [open, items]);

  if (!open) return null;

  const groups: Array<{ key: "accion" | "vista" | "herramientas"; label: string }> = [
    { key: "accion", label: "Acciones" },
    { key: "vista", label: "Visualización" },
    { key: "herramientas", label: "Análisis / Herramientas" }
  ];

  return (
    <div className="node-menu-overlay" aria-hidden={!open} style={{ pointerEvents: "none" }}>
      <div
        ref={menuRef}
        className="node-menu"
        style={{ left: position.x, top: position.y, width: MENU_WIDTH, pointerEvents: "auto" }}
        role="menu"
        aria-label={`Opciones de nodo ${nodeKind}`}
      >
        <div ref={titleRef} className="node-menu-title">{title}</div>
        <div
          ref={scrollRef}
          style={{ maxHeight: "70vh", overflowY: "auto", overflowX: "hidden", position: "relative" }}
          onScroll={() => setActiveSubmenuId(null)} // Close on scroll to prevent misalignment
        >
          {groups.map((group) => {
            const groupItems = items.filter((item) => (item.group ?? "accion") === group.key);
            if (groupItems.length === 0) return null;
            return (
              <div key={group.key} className="node-menu-group">
                <div className="node-menu-group-title">{group.label}</div>
                {groupItems.map((item) => (
                  <div
                    key={item.id}
                    className="node-menu-item-wrapper"
                    onMouseEnter={(e) => {
                      if (item.children) {
                        setActiveSubmenuId(item.id);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const menuRect = menuRef.current?.getBoundingClientRect();
                        if (menuRect) {
                          setActiveSubmenuY(rect.top - menuRect.top);
                        }
                      } else {
                        setActiveSubmenuId(null);
                      }
                    }}
                  >
                    <button
                      type="button"
                      className={`node-menu-item ${item.children ? 'has-submenu' : ''}`}
                      disabled={item.disabled}
                      onClick={(e) => {
                        if (item.disabled) return;
                        if (item.children) {
                          if (activeSubmenuId === item.id) {
                            setActiveSubmenuId(null);
                          } else {
                            setActiveSubmenuId(item.id);
                            const rect = e.currentTarget.getBoundingClientRect();
                            const menuRect = menuRef.current?.getBoundingClientRect();
                            if (menuRect) {
                              setActiveSubmenuY(rect.top - menuRect.top);
                            }
                          }
                          return;
                        }
                        item.onSelect?.();
                        onClose();
                      }}
                      role="menuitem"
                    >
                      <span>{item.label}</span>
                      {item.children && <span className="submenu-arrow">▶</span>}
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Submenu rendered at the root level to avoid clipping */}
        {activeSubmenuId && (() => {
          const hoveredItem = items.find(i => i.id === activeSubmenuId);
          if (!hoveredItem?.children) return null;
          return (
            <div
              className="node-menu submenu"
              style={{
                position: "absolute",
                left: MENU_WIDTH - SUB_MENU_OFFSET,
                top: activeSubmenuY,
                width: MENU_WIDTH,
                zIndex: 110,
                maxHeight: "60vh",
                overflowY: "auto"
              }}
              onMouseEnter={() => setActiveSubmenuId(activeSubmenuId)} // Keep open
            >
              {hoveredItem.children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  className="node-menu-item"
                  disabled={child.disabled}
                  onClick={() => {
                    if (child.disabled) return;
                    child.onSelect?.();
                    onClose();
                  }}
                >
                  {child.label}
                </button>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
