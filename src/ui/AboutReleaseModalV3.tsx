import { useState } from "react";
import { RELEASE_INFO } from "@/config/releaseInfo";
import { PUBLIC_CHANGELOG } from "@/config/changelogPublic";
import { StandardModal } from "@/ui/common/StandardModal";

type Props = {
    open: boolean;
    onClose: () => void;
};

// V3: Tabbed navigation — Info & Changelog as separate views, fixed height always
const TABS = [
    { id: "info", label: "Versión", icon: "info" },
    { id: "changelog", label: "Novedades", icon: "history" },
];

export function AboutReleaseModalV3({ open, onClose }: Props) {
    const [activeTab, setActiveTab] = useState("info");

    if (!open) return null;

    const facts = [
        { label: "Versión", value: RELEASE_INFO.technicalVersion, mono: true },
        { label: "Canal", value: RELEASE_INFO.channel },
        { label: "Etiqueta", value: RELEASE_INFO.displayLabel, accent: true },
        { label: "Codename", value: RELEASE_INFO.codename },
        { label: "Release tag", value: RELEASE_INFO.releaseTag, mono: true },
    ];

    return (
        <StandardModal
            open={true}
            title="Sobre GeneaSketch"
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onClose={onClose}
            size="md"
        >
            <style>{`
        .abv3-wrap {
          height: 420px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--line) transparent;
        }
        .abv3-wrap::-webkit-scrollbar { width: 4px; }
        .abv3-wrap::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; }

        /* ── Info tab ── */
        .abv3-facts { display: grid; grid-template-columns: 1fr auto; gap: 0; }
        .abv3-fact-label {
          font-family: var(--gs-font-ui);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--ink-muted);
          padding: 10px 24px 10px 0;
          border-bottom: 1px solid var(--line-soft);
        }
        .abv3-fact-value {
          font-family: var(--gs-font-ui);
          font-size: 13px;
          color: var(--ink-0);
          text-align: right;
          padding: 10px 0;
          border-bottom: 1px solid var(--line-soft);
        }
        .abv3-fact-label:last-of-type,
        .abv3-fact-value:last-of-type { border-bottom: none; }
        .abv3-fact-value--mono { font-family: var(--gs-font-mono); font-size: 12px; color: var(--ink-muted); }
        .abv3-fact-value--accent { color: var(--accent); font-weight: 500; }

        /* ── Changelog tab ── */
        .abv3-entry {
          border-bottom: 1px solid var(--line-soft);
          padding: 14px 0;
        }
        .abv3-entry:last-child { border-bottom: none; }
        .abv3-entry-title {
          font-family: var(--gs-font-ui);
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-0);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .abv3-entry-title-dot {
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--accent);
          flex-shrink: 0;
        }
        .abv3-entry-list { list-style: none; margin: 0; padding: 0; }
        .abv3-entry-item {
          font-family: var(--gs-font-ui);
          font-size: 12.5px;
          color: var(--ink-1);
          line-height: 1.55;
          padding: 3px 0 3px 14px;
          position: relative;
        }
        .abv3-entry-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 10px;
          width: 4px; height: 4px;
          border-radius: 50%;
          background: var(--ink-muted);
        }
      `}</style>

            <div className="abv3-wrap">
                {activeTab === "info" && (
                    <div>
                        {/* Compact identity block */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            padding: '16px 0 20px',
                            borderBottom: '1px solid var(--line-soft)',
                            marginBottom: 16
                        }}>
                            <div style={{
                                width: 44, height: 44,
                                borderRadius: 'var(--gs-radius-md)',
                                background: 'var(--accent-soft)',
                                border: '1px solid var(--line)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--accent)' }}>auto_stories</span>
                            </div>
                            <div>
                                <div style={{ fontFamily: 'var(--gs-font-header)', fontSize: 18, fontWeight: 700, color: 'var(--ink-0)' }}>
                                    GeneaSketch
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '1px 8px',
                                        borderRadius: 'var(--gs-radius-full)',
                                        background: 'var(--accent-soft)',
                                        border: '1px solid var(--line)',
                                        fontFamily: 'var(--gs-font-ui)',
                                        fontSize: 10,
                                        fontWeight: 600,
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        color: 'var(--accent)'
                                    }}>{RELEASE_INFO.channel}</span>
                                    <span style={{ fontFamily: 'var(--gs-font-mono)', fontSize: 12, color: 'var(--ink-muted)' }}>
                                        {RELEASE_INFO.technicalVersion}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Facts grid */}
                        <div className="abv3-facts">
                            {facts.map((f) => (
                                <>
                                    <span key={`${f.label}-l`} className="abv3-fact-label">{f.label}</span>
                                    <span key={`${f.label}-v`} className={`abv3-fact-value${f.mono ? " abv3-fact-value--mono" : ""}${f.accent ? " abv3-fact-value--accent" : ""}`}>
                                        {f.value}
                                    </span>
                                </>
                            ))}
                        </div>

                        <div style={{
                            textAlign: 'center', color: 'var(--ink-muted)', fontSize: 11,
                            fontFamily: 'var(--gs-font-ui)', paddingTop: 20
                        }}>
                            &copy; {new Date().getFullYear()} GeneaSketch Project &middot; Hecho con ❤️ para la comunidad genealógica.
                        </div>
                    </div>
                )}

                {activeTab === "changelog" && (
                    <div>
                        {PUBLIC_CHANGELOG.length === 0 ? (
                            <p style={{ color: 'var(--ink-muted)', fontSize: 13, fontFamily: 'var(--gs-font-ui)', padding: '20px 0' }}>
                                No hay notas de lanzamiento disponibles.
                            </p>
                        ) : (
                            PUBLIC_CHANGELOG.map((entry) => (
                                <div key={entry.heading} className="abv3-entry">
                                    <div className="abv3-entry-title">
                                        <span className="abv3-entry-title-dot" />
                                        {entry.heading}
                                    </div>
                                    <ul className="abv3-entry-list">
                                        {entry.userChanges.map((item, idx) => (
                                            <li key={idx} className="abv3-entry-item">{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </StandardModal>
    );
}
