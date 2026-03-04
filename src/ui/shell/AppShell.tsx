import React from "react";
import { buildLayoutClassName } from "./layoutClass";

type ShellSideToggleProps = {
    side: "left" | "right";
    collapsed: boolean;
    onClick: () => void;
};

function ShellSideToggle({ side, collapsed, onClick }: ShellSideToggleProps) {
    const isLeft = side === "left";
    return (
        <button
            className={`shell-panel-toggle shell-panel-toggle--${side}`}
            onClick={onClick}
            title={`${collapsed ? "Mostrar" : "Ocultar"} panel ${isLeft ? "izquierdo" : "derecho"}`}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                {isLeft ? (
                    collapsed
                        ? <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                        : <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                    collapsed
                        ? <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        : <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                )}
            </svg>
        </button>
    );
}

type AppShellProps = {
    topbar: React.ReactNode;
    footer: React.ReactNode;
    leftPanel: React.ReactNode;
    rightPanel: React.ReactNode;
    canvas: React.ReactNode;
    leftCollapsed: boolean;
    rightCollapsed: boolean;
    onToggleLeft: () => void;
    onToggleRight: () => void;
    detailsMode: "expanded" | "compact";
    timelineMode: "expanded" | "compact";
};

export function AppShell({
    topbar,
    footer,
    leftPanel,
    rightPanel,
    canvas,
    leftCollapsed,
    rightCollapsed,
    onToggleLeft,
    onToggleRight,
    detailsMode,
    timelineMode
}: AppShellProps) {
    const layoutClassName = buildLayoutClassName(leftCollapsed, rightCollapsed);
    const rightStackClassName = `right-panel-stack ${detailsMode === "expanded" ? "details-expanded" : "details-compact"} ${timelineMode === "expanded" ? "timeline-expanded" : "timeline-compact"}`;

    return (
        <div className="app-container">
            <header className="topbar">
                {topbar}
            </header>

            <main className={layoutClassName}>
                {!leftCollapsed && leftPanel}

                <section className="canvas-panel">
                    <ShellSideToggle side="left" collapsed={leftCollapsed} onClick={onToggleLeft} />
                    <ShellSideToggle side="right" collapsed={rightCollapsed} onClick={onToggleRight} />
                    {canvas}
                </section>

                {!rightCollapsed && (
                    <section className={rightStackClassName}>
                        {rightPanel}
                    </section>
                )}
            </main>

            {footer}
        </div>
    );
}
