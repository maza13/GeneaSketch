import React from "react";
import { buildLayoutClassName } from "./layoutClass";

type ShellSideToggleProps = {
    side: "left" | "right";
    collapsed: boolean;
    onClick: () => void;
};

function ShellSideToggle({ side, collapsed, onClick }: ShellSideToggleProps) {
    const isLeft = side === "left";
    // Which chevron to show: points toward the canvas when collapsed, toward panel when open
    const icon = isLeft
        ? (collapsed ? "chevron_right" : "chevron_left")
        : (collapsed ? "chevron_left" : "chevron_right");

    return (
        <button
            className={`shell-panel-toggle shell-panel-toggle--${side}`}
            onClick={onClick}
            title={`${collapsed ? "Mostrar" : "Ocultar"} panel ${isLeft ? "izquierdo" : "derecho"}`}
        >
            <span className="material-symbols-outlined">{icon}</span>
        </button>
    );
}

type AppShellProps = {
    topbar: React.ReactNode;
    toolbar: React.ReactNode;
    footer: React.ReactNode;
    leftPanel: React.ReactNode;
    rightPanel: React.ReactNode;
    canvas: React.ReactNode;
    workspaceOverlayHost?: React.ReactNode;
    leftCollapsed: boolean;
    rightCollapsed: boolean;
    onToggleLeft: () => void;
    onToggleRight: () => void;
    detailsMode: "expanded" | "compact";
};

export function AppShell({
    topbar,
    toolbar,
    footer,
    leftPanel,
    rightPanel,
    canvas,
    workspaceOverlayHost,
    leftCollapsed,
    rightCollapsed,
    onToggleLeft,
    onToggleRight,
    detailsMode,
}: AppShellProps) {
    const layoutClassName = buildLayoutClassName(leftCollapsed, rightCollapsed);
    const rightStackClassName = [
        "panel-right-stack",
        detailsMode === "expanded" ? "details-expanded" : "details-compact",
    ].join(" ");

    return (
        <div className="app-container">
            <header className="topbar">
                {topbar}
            </header>

            <div className="shell-toolbar">
                {toolbar}
            </div>

            <main className={layoutClassName}>
                {/* Left sidebar — always in DOM, slides via CSS */}
                <aside
                    className={`shell-sidebar shell-sidebar--left${leftCollapsed ? " shell-sidebar--collapsed" : ""}`}
                    aria-hidden={leftCollapsed}
                >
                    {leftPanel}
                </aside>

                {/* Canvas — fills remaining space */}
                <section className="canvas-panel">
                    <ShellSideToggle side="left" collapsed={leftCollapsed} onClick={onToggleLeft} />
                    <ShellSideToggle side="right" collapsed={rightCollapsed} onClick={onToggleRight} />
                    {canvas}
                    {workspaceOverlayHost ? (
                        <div className="shell-workspace-overlay-host">
                            {workspaceOverlayHost}
                        </div>
                    ) : null}
                </section>

                {/* Right sidebar — always in DOM, slides via CSS */}
                <aside
                    className={`shell-sidebar shell-sidebar--right${rightCollapsed ? " shell-sidebar--collapsed" : ""}`}
                    aria-hidden={rightCollapsed}
                >
                    <div className={rightStackClassName}>
                        {rightPanel}
                    </div>
                </aside>
            </main>

            {footer}
        </div>
    );
}
