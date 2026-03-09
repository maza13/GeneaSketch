import React, { useEffect, useRef, useState } from "react";

export type MenuLayout = "frequency" | "role" | "hybrid";

export type MenuItem = {
    id: string;
    label: string;
    icon?: React.ReactNode;
    shortcut?: string;
    disabled?: boolean;
    checked?: boolean;
    kind?: "label" | "separator";
    onClick?: () => void;
    children?: MenuItem[];
};

export type MenuGroup = {
    id: string;
    label: string;
    items: MenuItem[];
};

type Props = {
    menus: MenuGroup[];
    menuLayout: MenuLayout;
    onChangeLayout: (layout: MenuLayout) => void;
};

const LAYOUT_LABELS: Record<MenuLayout, { short: string; long: string }> = {
    frequency: { short: "A", long: "Por Frecuencia" },
    role: { short: "B", long: "Por Rol" },
    hybrid: { short: "C", long: "Híbrido" },
};
const LAYOUTS: MenuLayout[] = ["frequency", "role", "hybrid"];

export function TopMenuBar({ menus, menuLayout, onChangeLayout }: Props) {
    const [openId, setOpenId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!openId) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpenId(null);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [openId]);

    // Close on Escape
    useEffect(() => {
        if (!openId) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [openId]);

    const renderItem = (item: MenuItem, isSub = false): JSX.Element => {
        if (item.kind === "separator") {
            return <div key={item.id} className="menu-dropdown-separator" />;
        }
        if (item.kind === "label") {
            return (
                <div key={item.id} className="menu-dropdown-label-item">
                    {item.label}
                </div>
            );
        }

        return (
            <div key={item.id} className="menu-dropdown-submenu">
                <button
                    className={`menu-dropdown-item ${item.checked ? "menu-dropdown-item--checked" : ""} ${item.children ? "menu-dropdown-item--submenu" : ""}`}
                    disabled={item.disabled}
                    title={item.label}
                    onClick={(e) => {
                        if (item.disabled) return;
                        if (item.children) { e.stopPropagation(); return; }
                        item.onClick?.();
                        setOpenId(null);
                    }}
                >
                    <div className="menu-dropdown-check" aria-hidden="true">
                        {item.checked !== undefined
                            ? (item.checked ? <span className="material-symbols-outlined">check</span> : null)
                            : item.icon}
                    </div>
                    <div className="menu-dropdown-label">{item.label}</div>
                    {item.shortcut && <div className="menu-dropdown-shortcut">{item.shortcut}</div>}
                    {item.children && <span className="material-symbols-outlined menu-dropdown-chevron">chevron_right</span>}
                </button>

                {item.children && (
                    <div className={`menu-dropdown menu-dropdown--nested ${isSub ? "" : "menu-dropdown--nested-root"}`}>
                        {item.children.map((child) => renderItem(child, true))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <nav className="topbar-nav" ref={containerRef}>
            {/* ── Brand + Layout switcher ────────────────────── */}
            <div className="topbar-brand">
                <span className="topbar-logo">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>account_tree</span>
                </span>
                <span className="topbar-appname">GeneaSketch</span>

                {/* Segmented layout switcher */}
                <div className="layout-switcher" role="radiogroup" aria-label="Disposición de menú">
                    {LAYOUTS.map((l) => (
                        <button
                            key={l}
                            role="radio"
                            aria-checked={menuLayout === l}
                            className={`layout-switcher-btn ${menuLayout === l ? "layout-switcher-btn--active" : ""}`}
                            title={LAYOUT_LABELS[l].long}
                            onClick={() => onChangeLayout(l)}
                        >
                            {LAYOUT_LABELS[l].short}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Menu groups (left) ────────────────────────────── */}
            <div className="topbar-menus">
                {menus.map((group) => (
                    <MenuGroupComponent
                        key={group.id}
                        group={group}
                        openId={openId}
                        setOpenId={setOpenId}
                        renderItem={renderItem}
                    />
                ))}
            </div>

            {/* ── Quick actions (right) ─────────────────────────── */}
        </nav>
    );
}

function MenuGroupComponent({
    group, openId, setOpenId, renderItem
}: {
    group: MenuGroup;
    openId: string | null;
    setOpenId: (id: string | null) => void;
    renderItem: (item: MenuItem, isSub?: boolean) => JSX.Element;
}) {
    const isOpen = openId === group.id;
    const groupRef = useRef<HTMLDivElement>(null);
    const [alignRight, setAlignRight] = useState(false);

    useEffect(() => {
        if (isOpen && groupRef.current) {
            const rect = groupRef.current.getBoundingClientRect();
            setAlignRight(window.innerWidth - rect.left < 240);
        }
    }, [isOpen]);

    return (
        <div className="menu-group-wrapper" ref={groupRef}>
            <button
                className={`menu-trigger ${isOpen ? "menu-trigger--open" : ""}`}
                onClick={() => setOpenId(isOpen ? null : group.id)}
                onMouseEnter={() => { if (openId && openId !== group.id) setOpenId(group.id); }}
            >
                {group.label}
            </button>

            {isOpen && (
                <div className={`menu-dropdown ${alignRight ? "menu-dropdown--right" : ""}`}>
                    {group.items.map((item) => renderItem(item))}
                </div>
            )}
        </div>
    );
}
