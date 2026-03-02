import { RELEASE_INFO } from "@/config/releaseInfo";
import { PUBLIC_CHANGELOG } from "@/config/changelogPublic";
import { StandardModal, SectionCard } from "@/ui/common/StandardModal";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AboutReleaseModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <StandardModal
      open={true}
      title="Sobre GeneaSketch"
      activeTab="info"
      onTabChange={() => { }} // No tabs needed here, but StandardModal requires it for now or we could simplify StandardModal
      onClose={onClose}
      size="md"
    >
      <div className="gs-sections-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* --- Version Info --- */}
        <SectionCard
          title="Información de Versión"
          icon="info"
        >
          <div className="gs-facts-grid" style={{ marginTop: 4 }}>
            <div className="gs-fact-row">
              <span className="gs-fact-label">Versión técnica</span>
              <span className="gs-fact-value">{RELEASE_INFO.technicalVersion}</span>
            </div>
            <div className="gs-fact-row">
              <span className="gs-fact-label">Canal de distribución</span>
              <span className="gs-fact-value" style={{ textTransform: 'uppercase', fontWeight: 600 }}>{RELEASE_INFO.channel}</span>
            </div>
            <div className="gs-fact-row">
              <span className="gs-fact-label">Etiqueta visible</span>
              <span className="gs-fact-value" style={{ color: 'var(--accent-glow)' }}>{RELEASE_INFO.displayLabel}</span>
            </div>
            <div className="gs-fact-row">
              <span className="gs-fact-label">Nombre en clave (Codename)</span>
              <span className="gs-fact-value">{RELEASE_INFO.codename}</span>
            </div>
            <div className="gs-fact-row" style={{ border: 'none' }}>
              <span className="gs-fact-label">Release tag</span>
              <span className="gs-fact-value" style={{ fontFamily: 'monospace', opacity: 0.7 }}>{RELEASE_INFO.releaseTag}</span>
            </div>
          </div>
        </SectionCard>

        {/* --- Changelog --- */}
        <SectionCard
          title="Novedades Recientes"
          icon="history"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {PUBLIC_CHANGELOG.length === 0 ? (
              <div className="gs-alert gs-alert--info">
                No hay notas de lanzamiento públicas disponibles en esta versión.
              </div>
            ) : (
              PUBLIC_CHANGELOG.map((entry) => (
                <div
                  key={entry.heading}
                  style={{
                    padding: 16,
                    background: 'var(--bg-elev-1)',
                    borderRadius: 12,
                    border: '1px solid var(--modal-border)'
                  }}
                >
                  <strong style={{ fontSize: '15px', display: 'block', marginBottom: 10, color: 'var(--accent-glow)' }}>
                    {entry.heading}
                  </strong>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: '14px', lineHeight: '1.6', opacity: 0.9 }}>
                    {entry.userChanges.map((item, idx) => (
                      <li key={`${entry.heading}-${idx}`} style={{ marginBottom: 4 }}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <div style={{ textAlign: 'center', opacity: 0.4, fontSize: '12px', padding: '20px 0' }}>
          &copy; {new Date().getFullYear()} GeneaSketch Project · Hecho con ❤️ para la comunidad genealógica.
        </div>
      </div>
    </StandardModal>
  );
}
