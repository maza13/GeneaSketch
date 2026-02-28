import React, { useState, useRef, useEffect } from "react";

interface StatusProps {
    message: string;
}

export function StatusBar({ message }: StatusProps) {
    const [expanded, setExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isError = message.toLowerCase().includes("error") || message.toLowerCase().includes("falló");
    const isWarning = message.toLowerCase().includes("advertencia") || message.toLowerCase().includes("atención");

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
        navigator.clipboard.writeText(message);
    };

    return (
        <div className="status-container" ref={containerRef}>
            <div
                className={`status-pill ${isError ? "error" : ""} ${isWarning ? "warning" : ""}`}
                onClick={() => setExpanded(!expanded)}
            >
                <span className="status-text">{message}</span>
                {message.length > 40 && <span className="status-more-icon">...</span>}
            </div>

            {expanded && (
                <div className="status-context-card">
                    <div className="status-card-header">
                        <strong>Detalle del Estado</strong>
                        <div className="status-card-actions">
                            <button className="icon-btn" onClick={handleCopy} title="Copiar mensaje">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                            <button className="icon-btn" onClick={() => setExpanded(false)} title="Cerrar">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="status-card-body">
                        {message}
                    </div>
                    <div className="status-card-footer">
                        Haga clic fuera para cerrar
                    </div>
                </div>
            )}

            <style>{`
        .status-container {
          position: relative;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }
        .status-pill {
          max-width: 320px;
          padding: 4px 12px;
          background: var(--bg-btn);
          border: 1px solid var(--line);
          border-radius: var(--gs-radius-full);
          font-size: 13px;
          color: var(--gs-ink-secondary);
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .status-pill:hover {
          background: var(--bg-btn-hover);
          border-color: var(--accent);
          color: var(--gs-ink-primary);
        }
        .status-pill.error {
          border-color: var(--gs-error);
          background: rgba(239, 68, 68, 0.1);
          color: var(--gs-error);
        }
        .status-pill.warning {
          border-color: var(--tree-warning);
          background: rgba(245, 158, 11, 0.1);
          color: var(--tree-warning);
        }
        .status-more-icon {
          font-weight: bold;
          opacity: 0.6;
        }
        .status-context-card {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 360px;
          background: var(--bg-modal);
          border: 1px solid var(--line);
          border-radius: var(--gs-radius-md);
          box-shadow: var(--gs-glass-shadow);
          padding: 12px;
          z-index: 1000;
          animation: statusFadeIn 0.2s ease;
        }
        @keyframes statusFadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .status-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 12px;
          color: var(--gs-ink-primary);
        }
        .status-card-actions {
          display: flex;
          gap: 6px;
        }
        .status-card-body {
          font-size: 13px;
          color: var(--gs-ink-secondary);
          line-height: 1.4;
          word-break: break-word;
          max-height: 200px;
          overflow-y: auto;
          padding: 8px;
          background: var(--bg-input);
          border-radius: 6px;
          border: 1px solid var(--line-soft);
        }
        .status-card-footer {
          margin-top: 8px;
          font-size: 10px;
          color: var(--gs-ink-muted);
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .icon-btn {
          background: transparent;
          border: none;
          padding: 4px;
          color: var(--gs-ink-muted);
          cursor: pointer;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn:hover {
          background: var(--bg-btn-hover);
          color: var(--gs-ink-primary);
        }
      `}</style>
        </div>
    );
}
