import { useState } from "react";
import { RELEASE_INFO } from "@/config/releaseInfo";
import { PUBLIC_CHANGELOG } from "@/config/changelogPublic";
import { StandardModal, SectionCard } from "@/ui/common/StandardModal";

type Props = {
  open: boolean;
  onClose: () => void;
};

// V2: Clean rows + accordion changelog — entire content scrolls, modal height is fixed
export function AboutReleaseModalV2({ open, onClose }: Props) {
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  if (!open) return null;

  const facts: { label: string; value: string; mono?: boolean; accent?: boolean }[] = [
    { label: "Versión técnica", value: RELEASE_INFO.technicalVersion, mono: true },
    { label: "Canal de distribución", value: RELEASE_INFO.channel },
    { label: "Etiqueta visible", value: RELEASE_INFO.displayLabel, accent: true },
    { label: "Nombre en clave (Codename)", value: RELEASE_INFO.codename },
    { label: "Release tag", value: RELEASE_INFO.releaseTag, mono: true },
  ];

  return (
    <StandardModal
      open={true}
      title="Sobre GeneaSketch"
      activeTab="info"
      onTabChange={() => { }}
      onClose={onClose}
      size="md"
    >
      {/* Fixed-height scroll wrapper — the modal itself stays at a constant size */}
      <div style={{ height: 480, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 4 }}>
        <style>{`
          .abv2-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 24px;
            padding: 9px 0;
            border-bottom: 1px solid var(--line-soft);
          }
          .abv2-row:last-child { border-bottom: none; }
          .abv2-label {
            font-family: var(--gs-font-ui);
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--ink-muted);
            white-space: nowrap;
            flex-shrink: 0;
          }
          .abv2-value {
            font-family: var(--gs-font-ui);
            font-size: 13px;
            color: var(--ink-0);
            text-align: right;
          }
          .abv2-value--mono {
            font-family: var(--gs-font-mono);
            font-size: 12px;
            color: var(--ink-muted);
          }
          .abv2-value--accent { color: var(--accent); font-weight: 500; }

          .abv2-acc-item {
            border-radius: var(--gs-radius-sm);
            border: 1px solid var(--line);
            overflow: hidden;
          }
          .abv2-acc-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 9px 12px;
            background: none;
            border: none;
            cursor: pointer;
            font-family: var(--gs-font-ui);
            font-size: 13px;
            font-weight: 400;
            color: var(--ink-1);
            text-align: left;
            transition: background 0.15s, color 0.15s;
            gap: 8px;
          }
          .abv2-acc-btn:hover { background: var(--bg-card); color: var(--ink-0); }
          .abv2-acc-btn.open { color: var(--ink-0); font-weight: 500; }
          .abv2-acc-btn .acc-chevron {
            font-size: 16px;
            color: var(--ink-muted);
            transition: transform 0.2s;
            flex-shrink: 0;
          }
          .abv2-acc-btn.open .acc-chevron { transform: rotate(180deg); }
          .acc-title { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

          .abv2-acc-body {
            padding: 6px 12px 12px;
            border-top: 1px solid var(--line-soft);
          }
          .abv2-acc-body ul { margin: 0; padding: 0; list-style: none; }
          .abv2-acc-body li {
            display: flex;
            gap: 8px;
            align-items: flex-start;
            padding: 5px 0;
            font-family: var(--gs-font-ui);
            font-size: 13px;
            line-height: 1.5;
            color: var(--ink-1);
            border-bottom: 1px solid var(--line-soft);
          }
          .abv2-acc-body li:last-child { border-bottom: none; }
          .abv2-acc-body li::before {
            content: '·';
            color: var(--ink-muted);
            flex-shrink: 0;
            line-height: 1.5;
          }
        `}</style>

        {/* ── Version Info ── */}
        <SectionCard title="Información de Versión" icon="info">
          <div style={{ marginTop: 8 }}>
            {facts.map((f) => (
              <div key={f.label} className="abv2-row">
                <span className="abv2-label">{f.label}</span>
                <span className={`abv2-value${f.mono ? " abv2-value--mono" : ""}${f.accent ? " abv2-value--accent" : ""}`}>
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Changelog Accordion ── */}
        <SectionCard title="Novedades Recientes" icon="history">
          {PUBLIC_CHANGELOG.length === 0 ? (
            <p style={{ marginTop: 10, color: 'var(--ink-muted)', fontSize: 13, fontFamily: 'var(--gs-font-ui)' }}>
              No hay notas de lanzamiento disponibles.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
              {PUBLIC_CHANGELOG.map((entry, i) => {
                const isOpen = expandedEntry !== null
                  ? expandedEntry === entry.heading
                  : i === 0;
                return (
                  <div key={entry.heading} className="abv2-acc-item">
                    <button
                      type="button"
                      className={`abv2-acc-btn${isOpen ? " open" : ""}`}
                      onClick={() => setExpandedEntry(isOpen ? "__none__" : entry.heading)}
                    >
                      <span className="acc-title">{entry.heading}</span>
                      <span className="material-symbols-outlined acc-chevron">expand_more</span>
                    </button>
                    {isOpen && (
                      <div className="abv2-acc-body">
                        <ul>
                          {entry.userChanges.map((item, idx) => (
                            <li key={`${entry.heading}-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div style={{
          textAlign: 'center',
          color: 'var(--ink-muted)',
          fontSize: '12px',
          fontFamily: 'var(--gs-font-ui)',
          padding: '8px 0 4px',
          flexShrink: 0
        }}>
          &copy; {new Date().getFullYear()} GeneaSketch Project &middot; Hecho con ❤️ para la comunidad genealógica.
        </div>
      </div>
    </StandardModal>
  );
}
