import { ReactNode } from "react";
import { createPortal } from "react-dom";

export interface StandardModalTab {
    id: string;
    label: string;
    icon?: string; // Material symbol name
}

interface StandardModalProps {
    open: boolean;
    title: string;
    onClose: () => void;
    size?: "md" | "lg" | "xl";
    tabs?: StandardModalTab[];
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
    footer?: ReactNode;
    children: ReactNode;
    className?: string;
}

/**
 * StandardModal: The project-wide standard for sectioned modals and settings panels.
 * Follows the high-end GeneaSketch aesthetic with glassmorphism and capsule tabs.
 */
export function StandardModal({
    open,
    title,
    onClose,
    size = "lg",
    tabs,
    activeTab,
    onTabChange,
    footer,
    children,
    className = ""
}: StandardModalProps) {
    if (!open) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const modalContent = (
        <div className="gs-modal-overlay" onClick={handleOverlayClick}>
            <div
                className={`gs-modal-panel gs-modal-panel--${size} ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="gs-modal-header">
                    <h3>{title}</h3>
                    <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Tab Navigation (Optional) */}
                {tabs && tabs.length > 0 && (
                    <div className="gs-tab-nav" role="tablist">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                className={`gs-tab-capsule ${activeTab === tab.id ? "active" : ""}`}
                                onClick={() => onTabChange?.(tab.id)}
                            >
                                {tab.icon && <span className="material-symbols-outlined">{tab.icon}</span>}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content Area */}
                <div className="gs-content-area">
                    {children}
                </div>

                {/* Footer (Optional) */}
                {footer && (
                    <div className="gs-modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

/**
 * SectionCard: A standard container for groups of settings or information.
 */
export function SectionCard({
    title,
    subtitle,
    icon,
    headerAction,
    children
}: {
    title: string;
    subtitle?: string;
    icon?: string;
    headerAction?: ReactNode;
    children: ReactNode
}) {
    return (
        <div className="gs-section-card">
            <div className="gs-section-card-header">
                <div className="gs-section-card-title-group">
                    <div className="gs-section-card-title">
                        {icon && <span className="material-symbols-outlined">{icon}</span>}
                        {title}
                    </div>
                    {subtitle && <div className="gs-section-card-subtitle">{subtitle}</div>}
                </div>
                {headerAction}
            </div>
            <div className="gs-section-card-content">
                {children}
            </div>
        </div>
    );
}

export function SectionSubtitle({ children }: { children: ReactNode }) {
    return <div className="gs-section-card-subtitle">{children}</div>;
}
