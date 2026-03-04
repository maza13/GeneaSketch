import React, { useState, useRef, useEffect } from "react";

export type AppFooterProps = {
    statusMessage: string;
    personCount: number | null;
    familyCount: number | null;
    sourceCount: number | null;
    engineMode: string | null;
    isSaved: boolean;
    appVersion: string;
};

export function AppFooter({
    statusMessage,
    personCount,
    familyCount,
    sourceCount,
    engineMode,
    isSaved,
    appVersion
}: AppFooterProps) {
    const [expanded, setExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const msgLower = statusMessage.toLowerCase();
    const isError = msgLower.includes("error") || msgLower.includes("falló");
    const isWarning = msgLower.includes("advertencia") || msgLower.includes("atención");

    const severityClass = isError
        ? "footer-status-dot--error"
        : isWarning
            ? "footer-status-dot--warning"
            : "footer-status-dot--ok";

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setExpanded(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(statusMessage);
    };

    return (
        <div className="app-footer" ref={containerRef}>
            {/* LEFT: System Status */}
            <div className="footer-left" onClick={() => setExpanded(!expanded)} title="Click para expandir detalle">
                <div className={`footer-status-dot ${severityClass}`}></div>
                <div className="footer-status-text">{statusMessage}</div>
            </div>

            {/* CENTER: Document Metrics */}
            {personCount !== null && (
                <div className="footer-center" title="Métricas del documento">
                    <span className="footer-item"><span className="material-symbols-outlined">person</span> {personCount}</span>
                    <span style={{ color: "var(--line)", fontSize: 10 }}>•</span>
                    <span className="footer-item"><span className="material-symbols-outlined">groups</span> {familyCount}</span>
                    <span style={{ color: "var(--line)", fontSize: 10 }}>•</span>
                    <span className="footer-item"><span className="material-symbols-outlined">description</span> {sourceCount}</span>
                </div>
            )}

            {/* RIGHT: Engine & Version */}
            <div className="footer-right">
                {engineMode && <span className="footer-badge" title="Motor activo de renderizado">{engineMode}</span>}
                <span className="footer-item" title="Versión de GeneaSketch">{appVersion}</span>
                <span className="footer-shortcut" title="Atajo para guardar documento">Ctrl+S</span>
                <span className={`material-symbols-outlined footer-save-icon ${isSaved ? "footer-save-icon--saved" : ""}`} title={isSaved ? "Sincronizado" : "Cambios sin guardar"}>
                    {isSaved ? "cloud_done" : "save"}
                </span>
            </div>

            {/* Context Card (opens upwards) */}
            {expanded && (
                <div className="footer-expand-card gs-modal-panel">
                    <div className="gs-modal-header" style={{ padding: "8px 12px", borderBottom: 0 }}>
                        <h3 style={{ fontSize: 13 }}>Detalle del Estado</h3>
                        <div className="gs-panel-header-actions">
                            <button className="topbar-action-btn" onClick={handleCopy} title="Copiar mensaje">
                                <span className="material-symbols-outlined">content_copy</span>
                            </button>
                            <button className="topbar-action-btn" onClick={() => setExpanded(false)} title="Cerrar">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    </div>
                    <div className="gs-content-area" style={{ padding: "0 12px 12px 12px", gap: 8 }}>
                        <div style={{
                            fontSize: 12,
                            color: "var(--gs-ink-secondary)",
                            padding: 8,
                            background: "var(--bg-input)",
                            borderRadius: 6,
                            border: "1px solid var(--line-soft)",
                            wordBreak: "break-word",
                            maxHeight: 180,
                            overflowY: "auto"
                        }}>
                            {statusMessage}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--gs-ink-muted)", textAlign: "center", textTransform: "uppercase" }}>
                            Haga clic fuera para cerrar
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
