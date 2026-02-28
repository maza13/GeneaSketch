import { useEffect, useRef, useState } from "react";

export type MenuItem = {
    id: string;
    label: string;
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
};

export function TopMenuBar({ menus }: Props) {
    const [openId, setOpenId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpenId(null);
            }
        };
        if (openId) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [openId]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpenId(null);
            }
        };
        if (openId) {
            document.addEventListener("keydown", handleKeyDown);
        }
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
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
                    onClick={(e) => {
                        if (item.disabled) return;
                        if (item.children) {
                            e.stopPropagation();
                            return;
                        }
                        item.onClick?.();
                        setOpenId(null);
                    }}
                >
                    <div className="menu-dropdown-check" aria-hidden="true">
                        {(item.checked !== undefined) ? (item.checked ? "✓" : "") : ""}
                    </div>
                    <div className="menu-dropdown-label">{item.label}</div>
                    {item.shortcut && <div className="menu-dropdown-shortcut">{item.shortcut}</div>}
                    {item.children && <div className="menu-dropdown-chevron">▶</div>}
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
        <nav className="menu-bar" ref={containerRef}>
            {menus.map((group) => (
                <MenuGroupComponent
                    key={group.id}
                    group={group}
                    openId={openId}
                    setOpenId={setOpenId}
                    renderItem={renderItem}
                />
            ))}
        </nav>
    );
}

function MenuGroupComponent({
    group,
    openId,
    setOpenId,
    renderItem
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
            const spaceRight = window.innerWidth - rect.left;
            // Si tenemos menos de 240px (ancho promedio del menú), alineamos a la derecha
            setAlignRight(spaceRight < 240);
        }
    }, [isOpen]);

    return (
        <div className="menu-group-wrapper" ref={groupRef}>
            <button
                className={`menu-trigger ${isOpen ? "menu-trigger--open" : ""}`}
                onClick={() => setOpenId(isOpen ? null : group.id)}
                onMouseEnter={() => {
                    if (openId && openId !== group.id) setOpenId(group.id);
                }}
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
